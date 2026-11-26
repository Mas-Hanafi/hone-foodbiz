-- H One FoodBiz: initial schema
-- Money is numeric(14,2). Sales, items, payments, refunds and stock movements are append-only:
-- they have no update/delete policies, and writes to sales/refunds go through security-definer RPCs.

create extension if not exists pgcrypto with schema extensions;

-- ───────────────────────── types ─────────────────────────
create type public.member_role    as enum ('owner', 'manager', 'cashier');
create type public.order_type     as enum ('dine_in', 'takeaway');
create type public.payment_method as enum ('cash', 'qris', 'transfer');
create type public.refund_kind    as enum ('void', 'refund');
create type public.stock_kind     as enum ('sale', 'void', 'restock', 'adjustment');
create type public.cash_direction as enum ('in', 'out');
create type public.paper_size     as enum ('58mm', '80mm', 'a4');

-- ───────────────────────── organization ─────────────────────────
create table public.businesses (
  id         uuid primary key default gen_random_uuid(),
  name       text not null check (length(trim(name)) > 0),
  created_at timestamptz not null default now()
);

create table public.outlets (
  id                       uuid primary key default gen_random_uuid(),
  business_id              uuid not null references public.businesses on delete cascade,
  code                     text not null check (code ~ '^[A-Z0-9]{2,8}$'),
  name                     text not null,
  address                  text,
  phone                    text,
  timezone                 text not null default 'Asia/Jakarta',
  tax_rate                 numeric(5,2) not null default 0 check (tax_rate between 0 and 100),
  tax_inclusive            boolean not null default false,
  service_rate             numeric(5,2) not null default 0 check (service_rate between 0 and 100),
  max_cashier_discount_pct numeric(5,2) not null default 0 check (max_cashier_discount_pct between 0 and 100),
  cash_rounding            integer not null default 0 check (cash_rounding in (0, 100, 500, 1000)),
  receipt_header           text,
  receipt_footer           text,
  logo_path                text,
  paper_size               public.paper_size not null default '58mm',
  created_at               timestamptz not null default now(),
  unique (business_id, code),
  unique (id, business_id)
);

-- Owner: outlet_id is null (all outlets). Manager/cashier: exactly one outlet per row.
create table public.memberships (
  id          uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses on delete cascade,
  outlet_id   uuid,
  user_id      uuid not null references auth.users on delete cascade,
  role         public.member_role not null,
  display_name text not null check (length(trim(display_name)) > 0),
  email        text,  -- copy for staff lists; auth.users is not readable by clients
  active       boolean not null default true,
  created_at  timestamptz not null default now(),
  foreign key (outlet_id, business_id) references public.outlets (id, business_id) on delete cascade,
  check ((role = 'owner') = (outlet_id is null)),
  unique nulls not distinct (user_id, business_id, outlet_id)
);
create index on public.memberships (user_id);

-- Kept apart from memberships so no client role can ever select a hash.
create table public.member_pins (
  membership_id uuid primary key references public.memberships on delete cascade,
  pin_hash      text not null,
  updated_at    timestamptz not null default now()
);

create table public.terminals (
  id          uuid primary key default gen_random_uuid(),
  business_id uuid not null,
  outlet_id   uuid not null,
  code        text not null check (code ~ '^[A-Z0-9]{1,4}$'),
  name        text not null,
  created_at  timestamptz not null default now(),
  foreign key (outlet_id, business_id) references public.outlets (id, business_id) on delete cascade,
  unique (outlet_id, code),
  unique (id, outlet_id)
);

-- ───────────────────────── catalog ─────────────────────────
create table public.categories (
  id          uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses on delete cascade,
  name        text not null,
  sort        integer not null default 0
);

create table public.products (
  id          uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses on delete cascade,
  category_id uuid references public.categories on delete set null,
  name        text not null,
  sku         text,
  price       numeric(14,2) not null check (price >= 0),
  cost_price  numeric(14,2) check (cost_price >= 0),
  track_stock boolean not null default false,
  photo_path  text,
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);
create unique index on public.products (business_id, sku) where sku is not null;

create table public.product_variants (
  id          uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses on delete cascade,
  product_id  uuid not null references public.products on delete cascade,
  name        text not null,
  price       numeric(14,2) not null check (price >= 0),
  sort        integer not null default 0,
  active      boolean not null default true
);

create table public.modifiers (
  id          uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses on delete cascade,
  name        text not null,
  price       numeric(14,2) not null default 0 check (price >= 0),
  active      boolean not null default true
);

create table public.product_modifiers (
  business_id uuid not null references public.businesses on delete cascade,
  product_id  uuid not null references public.products on delete cascade,
  modifier_id uuid not null references public.modifiers on delete cascade,
  primary key (product_id, modifier_id)
);

-- Per-outlet override of products.price / product_variants.price.
create table public.outlet_prices (
  id          uuid primary key default gen_random_uuid(),
  business_id uuid not null,
  outlet_id   uuid not null,
  product_id  uuid not null references public.products on delete cascade,
  variant_id  uuid references public.product_variants on delete cascade,
  price       numeric(14,2) not null check (price >= 0),
  foreign key (outlet_id, business_id) references public.outlets (id, business_id) on delete cascade,
  unique nulls not distinct (outlet_id, product_id, variant_id)
);

-- ───────────────────────── shifts & cash ─────────────────────────
-- Client-generated ids everywhere below, so offline retries are idempotent.
create table public.shifts (
  id            uuid primary key,
  business_id   uuid not null,
  outlet_id     uuid not null,
  terminal_id   uuid not null,
  cashier_id    uuid not null references auth.users,
  opened_at     timestamptz not null default now(),
  opening_float numeric(14,2) not null default 0 check (opening_float >= 0),
  closed_at     timestamptz,
  counted_cash  numeric(14,2),
  expected_cash numeric(14,2),
  foreign key (outlet_id, business_id) references public.outlets (id, business_id),
  foreign key (terminal_id, outlet_id) references public.terminals (id, outlet_id),
  unique (id, outlet_id),
  check ((closed_at is null) = (counted_cash is null) and (closed_at is null) = (expected_cash is null))
);
create unique index shifts_one_open_per_terminal on public.shifts (terminal_id) where closed_at is null;
create index on public.shifts (outlet_id, opened_at);

create table public.cash_movements (
  id          uuid primary key,
  business_id uuid not null,
  outlet_id   uuid not null,
  shift_id    uuid not null,
  direction   public.cash_direction not null,
  amount      numeric(14,2) not null check (amount > 0),
  reason      text not null check (length(trim(reason)) > 0),
  created_by  uuid not null default auth.uid() references auth.users,
  created_at  timestamptz not null default now(),
  foreign key (outlet_id, business_id) references public.outlets (id, business_id),
  foreign key (shift_id, outlet_id) references public.shifts (id, outlet_id)
);
create index on public.cash_movements (shift_id);

-- shift_id set = paid from the cash drawer during that shift.
create table public.expenses (
  id          uuid primary key,
  business_id uuid not null,
  outlet_id   uuid not null,
  shift_id    uuid,
  category    text not null,
  amount      numeric(14,2) not null check (amount > 0),
  note        text,
  photo_path  text,
  spent_on    date not null,
  created_by  uuid not null default auth.uid() references auth.users,
  created_at  timestamptz not null default now(),
  foreign key (outlet_id, business_id) references public.outlets (id, business_id),
  foreign key (shift_id, outlet_id) references public.shifts (id, outlet_id)
);
create index on public.expenses (outlet_id, spent_on);

-- ───────────────────────── sales ─────────────────────────
-- receipt_no is generated on the terminal: {OUTLET}-{TERMINAL}-{YYYYMMDD}-{NNNN},
-- gap-free per terminal per day, so it works offline. Unique per outlet.
create table public.sales (
  id             uuid primary key,
  business_id    uuid not null,
  outlet_id      uuid not null,
  terminal_id    uuid not null,
  shift_id       uuid not null,
  receipt_no     text not null check (receipt_no ~ '^[A-Z0-9]{2,8}-[A-Z0-9]{1,4}-[0-9]{8}-[0-9]{4,}$'),
  business_date  date not null,
  order_type     public.order_type not null default 'takeaway',
  table_label    text,
  customer_name  text,
  note           text,
  subtotal       numeric(14,2) not null,
  discount_total numeric(14,2) not null default 0,
  tax_rate       numeric(5,2)  not null default 0,
  tax_inclusive  boolean       not null default false,
  tax_total      numeric(14,2) not null default 0,
  service_rate   numeric(5,2)  not null default 0,
  service_total  numeric(14,2) not null default 0,
  rounding       numeric(14,2) not null default 0,
  total          numeric(14,2) not null,
  cashier_id     uuid not null references auth.users,
  created_at     timestamptz not null,               -- terminal clock
  synced_at      timestamptz not null default now(), -- server clock
  foreign key (outlet_id, business_id) references public.outlets (id, business_id),
  foreign key (terminal_id, outlet_id) references public.terminals (id, outlet_id),
  foreign key (shift_id, outlet_id) references public.shifts (id, outlet_id),
  unique (outlet_id, receipt_no),
  unique (id, outlet_id),
  check (subtotal >= 0 and discount_total between 0 and subtotal
         and tax_total >= 0 and service_total >= 0 and total >= 0),
  check (total = subtotal - discount_total + service_total
                 + case when tax_inclusive then 0 else tax_total end + rounding)
);
create index on public.sales (outlet_id, business_date);
create index on public.sales (shift_id);

-- Snapshot: names, prices and modifiers as sold. product_id may later be null if the product is deleted.
create table public.sale_items (
  id           uuid primary key default gen_random_uuid(),
  sale_id      uuid not null,
  business_id  uuid not null,
  outlet_id    uuid not null,
  product_id   uuid references public.products on delete set null,
  variant_id   uuid references public.product_variants on delete set null,
  product_name text not null,
  variant_name text,
  modifiers    jsonb not null default '[]',  -- [{ "name": "Telur", "price": 3000 }]
  qty          numeric(10,3) not null check (qty > 0),
  unit_price   numeric(14,2) not null check (unit_price >= 0),  -- includes modifiers
  discount     numeric(14,2) not null default 0 check (discount >= 0),
  line_total   numeric(14,2) not null check (line_total >= 0),
  cost_price   numeric(14,2),  -- products.cost_price at sale time, for gross profit
  note         text,
  foreign key (sale_id, outlet_id) references public.sales (id, outlet_id)
);
create index on public.sale_items (sale_id);
create index on public.sale_items (product_id);

create table public.payments (
  id          uuid primary key default gen_random_uuid(),
  sale_id     uuid not null,
  business_id uuid not null,
  outlet_id   uuid not null,
  method      public.payment_method not null,
  amount      numeric(14,2) not null check (amount > 0),  -- applied to the sale
  tendered    numeric(14,2) not null,                       -- handed over by the customer
  change      numeric(14,2) generated always as (tendered - amount) stored,
  reference   text,
  foreign key (sale_id, outlet_id) references public.sales (id, outlet_id),
  check (tendered >= amount),
  check (method = 'cash' or tendered = amount)
);
create index on public.payments (sale_id);

-- void: whole sale, same shift, stock returned. refund: partial or full, any time, money only.
create table public.refunds (
  id          uuid primary key,
  sale_id     uuid not null,
  business_id uuid not null,
  outlet_id   uuid not null,
  kind        public.refund_kind not null,
  amount      numeric(14,2) not null check (amount > 0),
  method      public.payment_method,   -- how the money went back (refund only)
  shift_id    uuid,                    -- drawer it was paid from (cash)
  reason      text not null check (length(trim(reason)) > 0),
  approved_by uuid not null references auth.users,
  created_by  uuid not null references auth.users,
  created_at  timestamptz not null default now(),
  foreign key (sale_id, outlet_id) references public.sales (id, outlet_id),
  foreign key (shift_id, outlet_id) references public.shifts (id, outlet_id),
  check (kind = 'void' or method is not null),
  check (method is distinct from 'cash' or shift_id is not null)
);
create index on public.refunds (sale_id);
create index on public.refunds (shift_id);

-- ───────────────────────── stock ─────────────────────────
create table public.stock_movements (
  id          uuid primary key default gen_random_uuid(),
  business_id uuid not null,
  outlet_id   uuid not null,
  product_id  uuid not null references public.products on delete cascade,
  qty_delta   numeric(12,3) not null check (qty_delta <> 0),
  kind        public.stock_kind not null,
  sale_id     uuid references public.sales,
  note        text,
  created_by  uuid not null default auth.uid() references auth.users,
  created_at  timestamptz not null default now(),
  foreign key (outlet_id, business_id) references public.outlets (id, business_id),
  check ((kind in ('sale', 'void')) = (sale_id is not null))
);
create index on public.stock_movements (outlet_id, product_id, created_at);
create index on public.stock_movements (sale_id);

-- Derived from stock_movements by trigger. qty < 0 = oversold (e.g. two offline terminals), needs review.
create table public.stock_balances (
  business_id uuid not null,
  outlet_id   uuid not null,
  product_id  uuid not null references public.products on delete cascade,
  qty         numeric(12,3) not null default 0,
  updated_at  timestamptz not null default now(),
  primary key (outlet_id, product_id),
  foreign key (outlet_id, business_id) references public.outlets (id, business_id) on delete cascade
);

create function public.apply_stock_movement() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.stock_balances (business_id, outlet_id, product_id, qty, updated_at)
  values (new.business_id, new.outlet_id, new.product_id, new.qty_delta, now())
  on conflict (outlet_id, product_id)
  do update set qty = public.stock_balances.qty + excluded.qty, updated_at = now();
  return new;
end $$;

create trigger stock_movements_apply after insert on public.stock_movements
for each row execute function public.apply_stock_movement();

-- ───────────────────────── access helpers ─────────────────────────
create function public.has_business_role(p_business uuid, p_roles public.member_role[])
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.memberships m
    where m.business_id = p_business and m.user_id = auth.uid()
      and m.active and m.role = any (p_roles)
  );
$$;

create function public.has_outlet_role(p_outlet uuid, p_roles public.member_role[])
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.memberships m
    join public.outlets o on o.business_id = m.business_id
    where o.id = p_outlet and m.user_id = auth.uid() and m.active
      and m.role = any (p_roles)
      and (m.outlet_id is null or m.outlet_id = p_outlet)
  );
$$;

create function public.can_access_outlet(p_outlet uuid)
returns boolean language sql stable as $$
  select public.has_outlet_role(p_outlet, '{owner,manager,cashier}');
$$;

-- Internal: not callable by clients (see revoke below).
-- ponytail: no lockout after failed PINs; a cashier could brute-force a 6-digit PIN via record_refund.
-- Add a failure counter + lockout if this is ever deployed for real money.
create function public.check_approver_pin(p_outlet uuid, p_user uuid, p_pin text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.memberships m
    join public.outlets o on o.business_id = m.business_id
    join public.member_pins mp on mp.membership_id = m.id
    where o.id = p_outlet and m.user_id = p_user and m.active
      and m.role in ('owner', 'manager')
      and (m.outlet_id is null or m.outlet_id = p_outlet)
      and mp.pin_hash = extensions.crypt(p_pin, mp.pin_hash)
  );
$$;
-- Supabase default privileges grant execute to anon/authenticated, so revoke from them explicitly.
revoke execute on function public.check_approver_pin(uuid, uuid, text) from public, anon, authenticated;

-- ───────────────────────── RPCs ─────────────────────────
create function public.create_business(
  p_name text, p_outlet_name text, p_outlet_code text, p_display_name text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_business uuid;
begin
  if auth.uid() is null then raise exception 'not signed in' using errcode = '42501'; end if;
  insert into public.businesses (name) values (p_name) returning id into v_business;
  insert into public.outlets (business_id, code, name)
  values (v_business, upper(p_outlet_code), p_outlet_name);
  insert into public.memberships (business_id, user_id, role, display_name, email)
  values (v_business, auth.uid(), 'owner', p_display_name, auth.jwt() ->> 'email');
  return v_business;
end $$;

create function public.set_my_pin(p_pin text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if p_pin !~ '^[0-9]{6}$' then raise exception 'PIN must be 6 digits'; end if;
  insert into public.member_pins (membership_id, pin_hash)
  select m.id, extensions.crypt(p_pin, extensions.gen_salt('bf'))
  from public.memberships m where m.user_id = auth.uid() and m.active
  on conflict (membership_id) do update set pin_hash = excluded.pin_hash, updated_at = now();
end $$;

-- One atomic, idempotent call per sale (online or replayed from the offline queue).
-- p: { id, outlet_id, terminal_id, shift_id, receipt_no, business_date, created_at, order_type,
--      table_label, customer_name, note, discount_total, tax_rate, tax_inclusive, tax_total,
--      service_rate, service_total, rounding, total,
--      items: [{ product_id, variant_id, product_name, variant_name, modifiers, qty, unit_price, discount, line_total, note }],
--      payments: [{ method, amount, tendered, reference }] }
create function public.record_sale(p jsonb)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_id       uuid := (p ->> 'id')::uuid;
  v_outlet   public.outlets;
  v_subtotal numeric(14,2);
  v_paid     numeric(14,2);
begin
  select * into v_outlet from public.outlets where id = (p ->> 'outlet_id')::uuid;
  if not found or not public.can_access_outlet(v_outlet.id) then
    raise exception 'no access to outlet' using errcode = '42501';
  end if;
  if v_id is null then raise exception 'sale id required'; end if;
  if exists (select 1 from public.sales where id = v_id) then return v_id; end if;  -- replay
  if coalesce(jsonb_array_length(p -> 'items'), 0) = 0 then raise exception 'sale has no items'; end if;
  if coalesce(jsonb_array_length(p -> 'payments'), 0) = 0 then raise exception 'sale has no payments'; end if;

  if exists (
    select 1 from jsonb_array_elements(p -> 'items') as t(i)
    where round((i ->> 'qty')::numeric * (i ->> 'unit_price')::numeric
                - coalesce((i ->> 'discount')::numeric, 0), 2) <> (i ->> 'line_total')::numeric
  ) then
    raise exception 'line_total does not match qty x unit_price - discount';
  end if;

  select sum((i ->> 'line_total')::numeric) into v_subtotal
  from jsonb_array_elements(p -> 'items') as t(i);

  -- the total = subtotal - discount + tax + service + rounding check lives on the table
  insert into public.sales (
    id, business_id, outlet_id, terminal_id, shift_id, receipt_no, business_date, order_type,
    table_label, customer_name, note, subtotal, discount_total, tax_rate, tax_inclusive,
    tax_total, service_rate, service_total, rounding, total, cashier_id, created_at)
  values (
    v_id, v_outlet.business_id, v_outlet.id, (p ->> 'terminal_id')::uuid, (p ->> 'shift_id')::uuid,
    p ->> 'receipt_no', (p ->> 'business_date')::date,
    coalesce((p ->> 'order_type')::public.order_type, 'takeaway'),
    p ->> 'table_label', p ->> 'customer_name', p ->> 'note', v_subtotal,
    coalesce((p ->> 'discount_total')::numeric, 0), coalesce((p ->> 'tax_rate')::numeric, 0),
    coalesce((p ->> 'tax_inclusive')::boolean, false), coalesce((p ->> 'tax_total')::numeric, 0),
    coalesce((p ->> 'service_rate')::numeric, 0), coalesce((p ->> 'service_total')::numeric, 0),
    coalesce((p ->> 'rounding')::numeric, 0), (p ->> 'total')::numeric, auth.uid(),
    coalesce((p ->> 'created_at')::timestamptz, now()));

  insert into public.sale_items (
    sale_id, business_id, outlet_id, product_id, variant_id, product_name, variant_name,
    modifiers, qty, unit_price, discount, line_total, cost_price, note)
  select v_id, v_outlet.business_id, v_outlet.id, pr.id, (i ->> 'variant_id')::uuid,
         i ->> 'product_name', i ->> 'variant_name', coalesce(i -> 'modifiers', '[]'),
         (i ->> 'qty')::numeric, (i ->> 'unit_price')::numeric,
         coalesce((i ->> 'discount')::numeric, 0), (i ->> 'line_total')::numeric,
         pr.cost_price, i ->> 'note'
  from jsonb_array_elements(p -> 'items') as t(i)
  left join public.products pr
    on pr.id = (i ->> 'product_id')::uuid and pr.business_id = v_outlet.business_id;

  insert into public.payments (sale_id, business_id, outlet_id, method, amount, tendered, reference)
  select v_id, v_outlet.business_id, v_outlet.id, (x ->> 'method')::public.payment_method,
         (x ->> 'amount')::numeric, coalesce((x ->> 'tendered')::numeric, (x ->> 'amount')::numeric),
         x ->> 'reference'
  from jsonb_array_elements(p -> 'payments') as t(x);

  select sum(amount) into v_paid from public.payments where sale_id = v_id;
  if v_paid <> (p ->> 'total')::numeric then
    raise exception 'payments (%) do not equal total (%)', v_paid, p ->> 'total';
  end if;

  -- Oversold stock is allowed (offline terminals); it shows up as a negative balance.
  insert into public.stock_movements (business_id, outlet_id, product_id, qty_delta, kind, sale_id, created_by)
  select v_outlet.business_id, v_outlet.id, pr.id, -sum((i ->> 'qty')::numeric), 'sale', v_id, auth.uid()
  from jsonb_array_elements(p -> 'items') as t(i)
  join public.products pr
    on pr.id = (i ->> 'product_id')::uuid and pr.business_id = v_outlet.business_id and pr.track_stock
  group by pr.id;

  return v_id;
end $$;

-- Needs a connection: the approver's PIN is checked server-side.
create function public.record_refund(
  p_id uuid, p_sale_id uuid, p_kind public.refund_kind, p_amount numeric,
  p_method public.payment_method, p_shift_id uuid, p_reason text, p_approver uuid, p_pin text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_sale     public.sales;
  v_done     numeric(14,2);
  v_voided   boolean;
  v_closed   timestamptz;
begin
  select * into v_sale from public.sales where id = p_sale_id;
  if not found or not public.can_access_outlet(v_sale.outlet_id) then
    raise exception 'no access to sale' using errcode = '42501';
  end if;
  if exists (select 1 from public.refunds where id = p_id) then return p_id; end if;  -- replay
  if not public.check_approver_pin(v_sale.outlet_id, p_approver, p_pin) then
    raise exception 'approval failed' using errcode = '42501';
  end if;

  select coalesce(sum(amount), 0), coalesce(bool_or(kind = 'void'), false)
  into v_done, v_voided from public.refunds where sale_id = p_sale_id;
  if v_voided then raise exception 'sale already voided'; end if;

  if p_kind = 'void' then
    if v_done > 0 then raise exception 'sale already refunded, cannot void'; end if;
    select closed_at into v_closed from public.shifts where id = v_sale.shift_id;
    if v_closed is not null then raise exception 'shift is closed, use a refund'; end if;
    p_amount   := v_sale.total;
    p_method   := null;
    p_shift_id := v_sale.shift_id;
  elsif p_amount is null or p_amount <= 0 or p_amount > v_sale.total - v_done then
    raise exception 'refund amount must be between 0 and %', v_sale.total - v_done;
  end if;

  insert into public.refunds (id, sale_id, business_id, outlet_id, kind, amount, method, shift_id,
                              reason, approved_by, created_by)
  values (p_id, p_sale_id, v_sale.business_id, v_sale.outlet_id, p_kind, p_amount, p_method,
          p_shift_id, p_reason, p_approver, auth.uid());

  if p_kind = 'void' then
    insert into public.stock_movements (business_id, outlet_id, product_id, qty_delta, kind, sale_id, created_by)
    select business_id, outlet_id, product_id, -qty_delta, 'void', sale_id, auth.uid()
    from public.stock_movements where sale_id = p_sale_id and kind = 'sale';
  end if;

  return p_id;
end $$;

-- Sync every queued sale before calling this, or expected cash will be short.
create function public.close_shift(p_shift_id uuid, p_counted numeric)
returns numeric language plpgsql security definer set search_path = '' as $$
declare
  v_shift    public.shifts;
  v_expected numeric(14,2);
begin
  select * into v_shift from public.shifts where id = p_shift_id;
  if not found or not (
       (v_shift.cashier_id = auth.uid() and public.can_access_outlet(v_shift.outlet_id))
       or public.has_outlet_role(v_shift.outlet_id, '{owner,manager}')) then
    raise exception 'no access to shift' using errcode = '42501';
  end if;
  if v_shift.closed_at is not null then raise exception 'shift already closed'; end if;
  if p_counted is null or p_counted < 0 then raise exception 'counted cash required'; end if;

  v_expected := v_shift.opening_float
    + coalesce((select sum(p.amount) from public.payments p join public.sales s on s.id = p.sale_id
                where s.shift_id = p_shift_id and p.method = 'cash'
                  and not exists (select 1 from public.refunds r where r.sale_id = s.id and r.kind = 'void')), 0)
    - coalesce((select sum(amount) from public.refunds
                where shift_id = p_shift_id and kind = 'refund' and method = 'cash'), 0)
    + coalesce((select sum(case direction when 'in' then amount else -amount end)
                from public.cash_movements where shift_id = p_shift_id), 0)
    - coalesce((select sum(amount) from public.expenses where shift_id = p_shift_id), 0);

  update public.shifts
  set closed_at = now(), counted_cash = p_counted, expected_cash = v_expected
  where id = p_shift_id;
  return v_expected;
end $$;

-- ───────────────────────── views ─────────────────────────
create view public.sales_with_status with (security_invoker = true) as
select s.*,
       coalesce(r.refunded, 0) as refunded_amount,
       case when r.voided then 'voided'
            when coalesce(r.refunded, 0) >= s.total and s.total > 0 then 'refunded'
            when coalesce(r.refunded, 0) > 0 then 'partially_refunded'
            else 'paid' end as status
from public.sales s
left join lateral (
  select sum(amount) as refunded, bool_or(kind = 'void') as voided
  from public.refunds where sale_id = s.id
) r on true;

-- ───────────────────────── row-level security ─────────────────────────
alter table public.businesses        enable row level security;
alter table public.outlets           enable row level security;
alter table public.memberships       enable row level security;
alter table public.member_pins       enable row level security;
alter table public.terminals         enable row level security;
alter table public.categories        enable row level security;
alter table public.products          enable row level security;
alter table public.product_variants  enable row level security;
alter table public.modifiers         enable row level security;
alter table public.product_modifiers enable row level security;
alter table public.outlet_prices     enable row level security;
alter table public.shifts            enable row level security;
alter table public.cash_movements    enable row level security;
alter table public.expenses          enable row level security;
alter table public.sales             enable row level security;
alter table public.sale_items        enable row level security;
alter table public.payments          enable row level security;
alter table public.refunds           enable row level security;
alter table public.stock_movements   enable row level security;
alter table public.stock_balances    enable row level security;
-- member_pins: RLS on, no policies → no client access at all.

create policy "members read business" on public.businesses for select to authenticated
  using (public.has_business_role(id, '{owner,manager,cashier}'));
create policy "owner updates business" on public.businesses for update to authenticated
  using (public.has_business_role(id, '{owner}'));

-- Owner branch checks business_id only, so insert ... returning works (the new row is not yet
-- visible to the helper's snapshot).
create policy "staff read outlet" on public.outlets for select to authenticated
  using (public.has_business_role(business_id, '{owner}') or public.can_access_outlet(id));
create policy "owner adds outlet" on public.outlets for insert to authenticated
  with check (public.has_business_role(business_id, '{owner}'));
create policy "owner updates outlet" on public.outlets for update to authenticated
  using (public.has_business_role(business_id, '{owner}'));

create policy "read own, outlet or all memberships" on public.memberships for select to authenticated
  using (user_id = auth.uid()
         or public.has_business_role(business_id, '{owner}')
         or (outlet_id is not null and public.has_outlet_role(outlet_id, '{manager}')));
create policy "owner manages memberships" on public.memberships for all to authenticated
  using (public.has_business_role(business_id, '{owner}'))
  with check (public.has_business_role(business_id, '{owner}'));

create policy "staff read terminals" on public.terminals for select to authenticated
  using (public.can_access_outlet(outlet_id));
create policy "managers manage terminals" on public.terminals for all to authenticated
  using (public.has_outlet_role(outlet_id, '{owner,manager}'))
  with check (public.has_outlet_role(outlet_id, '{owner,manager}'));

-- Catalog: whole business reads, owner/manager write.
create policy "staff read categories" on public.categories for select to authenticated
  using (public.has_business_role(business_id, '{owner,manager,cashier}'));
create policy "managers manage categories" on public.categories for all to authenticated
  using (public.has_business_role(business_id, '{owner,manager}'))
  with check (public.has_business_role(business_id, '{owner,manager}'));
create policy "staff read products" on public.products for select to authenticated
  using (public.has_business_role(business_id, '{owner,manager,cashier}'));
create policy "managers manage products" on public.products for all to authenticated
  using (public.has_business_role(business_id, '{owner,manager}'))
  with check (public.has_business_role(business_id, '{owner,manager}'));
create policy "staff read variants" on public.product_variants for select to authenticated
  using (public.has_business_role(business_id, '{owner,manager,cashier}'));
create policy "managers manage variants" on public.product_variants for all to authenticated
  using (public.has_business_role(business_id, '{owner,manager}'))
  with check (public.has_business_role(business_id, '{owner,manager}'));
create policy "staff read modifiers" on public.modifiers for select to authenticated
  using (public.has_business_role(business_id, '{owner,manager,cashier}'));
create policy "managers manage modifiers" on public.modifiers for all to authenticated
  using (public.has_business_role(business_id, '{owner,manager}'))
  with check (public.has_business_role(business_id, '{owner,manager}'));
create policy "staff read product modifiers" on public.product_modifiers for select to authenticated
  using (public.has_business_role(business_id, '{owner,manager,cashier}'));
create policy "managers manage product modifiers" on public.product_modifiers for all to authenticated
  using (public.has_business_role(business_id, '{owner,manager}'))
  with check (public.has_business_role(business_id, '{owner,manager}'));

create policy "staff read outlet prices" on public.outlet_prices for select to authenticated
  using (public.can_access_outlet(outlet_id));
create policy "managers manage outlet prices" on public.outlet_prices for all to authenticated
  using (public.has_outlet_role(outlet_id, '{owner,manager}'))
  with check (public.has_outlet_role(outlet_id, '{owner,manager}'));

-- Shifts: anyone at the outlet opens their own; closing goes through close_shift().
create policy "staff read shifts" on public.shifts for select to authenticated
  using (public.can_access_outlet(outlet_id));
create policy "staff open own shift" on public.shifts for insert to authenticated
  with check (public.can_access_outlet(outlet_id) and cashier_id = auth.uid() and closed_at is null);

create policy "staff read cash movements" on public.cash_movements for select to authenticated
  using (public.can_access_outlet(outlet_id));
create policy "staff add cash movements" on public.cash_movements for insert to authenticated
  with check (public.can_access_outlet(outlet_id) and created_by = auth.uid());

create policy "staff read expenses" on public.expenses for select to authenticated
  using (public.can_access_outlet(outlet_id));
create policy "staff add expenses" on public.expenses for insert to authenticated
  with check (public.can_access_outlet(outlet_id) and created_by = auth.uid());

-- Sales, items, payments, refunds: read-only for clients; written by record_sale / record_refund.
create policy "staff read sales" on public.sales for select to authenticated
  using (public.can_access_outlet(outlet_id));
create policy "staff read sale items" on public.sale_items for select to authenticated
  using (public.can_access_outlet(outlet_id));
create policy "staff read payments" on public.payments for select to authenticated
  using (public.can_access_outlet(outlet_id));
create policy "staff read refunds" on public.refunds for select to authenticated
  using (public.can_access_outlet(outlet_id));

create policy "staff read stock movements" on public.stock_movements for select to authenticated
  using (public.can_access_outlet(outlet_id));
create policy "managers restock and adjust" on public.stock_movements for insert to authenticated
  with check (public.has_outlet_role(outlet_id, '{owner,manager}')
              and kind in ('restock', 'adjustment') and created_by = auth.uid());
create policy "staff read stock balances" on public.stock_balances for select to authenticated
  using (public.can_access_outlet(outlet_id));
