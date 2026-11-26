-- Demo data for H One FoodBiz: one business, one outlet, a menu, and 14 days of sales, shifts and expenses.
-- Run once after the migrations (Supabase SQL editor, or `psql "$DATABASE_URL" -f supabase/seed.sql`).
--
--   Sign in:  demo@hone-foodbiz.test  /  demo-foodbiz
--
-- Demo credentials are public. On a deployment others can reach, change the password or delete the user.
-- The writes go through the same functions the app uses (create_business, record_sale, close_shift),
-- so totals, payments and the stock ledger follow the real rules.

do $$
declare
  v_email    text := 'demo@hone-foodbiz.test';
  v_uid      uuid := gen_random_uuid();
  v_biz      uuid;
  v_outlet   uuid;
  v_term     uuid;
  v_food     uuid;
  v_drink    uuid;
  v_snack    uuid;
  v_today    date := (now() at time zone 'Asia/Jakarta')::date;
  v_day      date;
  v_shift    uuid;
  v_opened   timestamptz;
  v_cash     numeric;
  v_sales    int;
  v_items    jsonb;
  v_sub      numeric;
  v_tax      numeric;
  v_round    numeric;
  v_total    numeric;
  v_method   text;
  v_p        record;
  v_qty      int;
begin
  if exists (select 1 from auth.users where email = v_email) then
    raise notice 'Demo data already present (% exists). Nothing to do.', v_email;
    return;
  end if;
  perform setseed(0.42); -- same demo every run

  -- Demo login (email already confirmed).
  insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
                          raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
                          confirmation_token, recovery_token, email_change_token_new, email_change)
  values ('00000000-0000-0000-0000-000000000000', v_uid, 'authenticated', 'authenticated', v_email,
          extensions.crypt('demo-foodbiz', extensions.gen_salt('bf')), now(),
          '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', '');
  insert into auth.identities (id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
  values (gen_random_uuid(), v_uid, v_uid::text, 'email',
          jsonb_build_object('sub', v_uid::text, 'email', v_email, 'email_verified', true), now(), now(), now());

  -- Act as the demo owner for the rest of this block, so auth.uid() and RLS-aware functions work.
  perform set_config('request.jwt.claims', jsonb_build_object('sub', v_uid, 'role', 'authenticated', 'email', v_email)::text, true);

  v_biz := public.create_business('Warung Senja (demo)', 'Pusat', 'PST', 'Bu Senja');
  select id into v_outlet from public.outlets where business_id = v_biz;
  update public.outlets
     set address = 'Jl. Contoh No. 1, Yogyakarta', tax_rate = 10, cash_rounding = 500,
         max_cashier_discount_pct = 10, receipt_footer = 'Terima kasih, sampai jumpa lagi!'
   where id = v_outlet;
  insert into public.terminals (business_id, outlet_id, code, name)
  values (v_biz, v_outlet, 'T1', 'Kasir depan') returning id into v_term;

  insert into public.categories (business_id, name, sort) values (v_biz, 'Makanan', 1) returning id into v_food;
  insert into public.categories (business_id, name, sort) values (v_biz, 'Minuman', 2) returning id into v_drink;
  insert into public.categories (business_id, name, sort) values (v_biz, 'Camilan', 3) returning id into v_snack;

  insert into public.products (business_id, category_id, name, price, cost_price, track_stock) values
    (v_biz, v_food,  'Nasi Goreng Spesial', 28000, 12000, false),
    (v_biz, v_food,  'Mie Ayam',            22000,  9000, false),
    (v_biz, v_food,  'Ayam Bakar',          32000, 15000, true),
    (v_biz, v_food,  'Soto Ayam',           25000, 10000, false),
    (v_biz, v_drink, 'Es Teh Manis',         6000,  1500, false),
    (v_biz, v_drink, 'Es Jeruk',             9000,  3000, false),
    (v_biz, v_drink, 'Kopi Susu',           15000,  5000, false),
    (v_biz, v_snack, 'Pisang Goreng',       12000,  4000, true);

  with m as (
    insert into public.modifiers (business_id, name, price) values (v_biz, 'Telur', 4000), (v_biz, 'Ekstra pedas', 0)
    returning id
  )
  insert into public.product_modifiers (business_id, product_id, modifier_id)
  select v_biz, p.id, m.id from public.products p cross join m
  where p.business_id = v_biz and p.name in ('Nasi Goreng Spesial', 'Mie Ayam');

  insert into public.stock_movements (business_id, outlet_id, product_id, qty_delta, kind, note)
  select v_biz, v_outlet, id, 300, 'restock', 'Stok awal demo'
  from public.products where business_id = v_biz and track_stock;

  -- 14 days: one shift per day, 8 to 15 sales each. Today's shift stays open.
  for d in reverse 13..0 loop
    v_day    := v_today - d;
    v_opened := (v_day + time '10:00') at time zone 'Asia/Jakarta';
    v_shift  := gen_random_uuid();
    v_cash   := 200000;
    insert into public.shifts (id, business_id, outlet_id, terminal_id, cashier_id, opened_at, opening_float)
    values (v_shift, v_biz, v_outlet, v_term, v_uid, v_opened, 200000);

    v_sales := 8 + floor(random() * 8)::int;
    for i in 1..v_sales loop
      v_items := '[]';
      v_sub := 0;
      for v_p in
        select id, name, price from public.products where business_id = v_biz order by random() limit 1 + floor(random() * 3)::int
      loop
        v_qty := 1 + floor(random() * 2)::int;
        v_items := v_items || jsonb_build_object(
          'product_id', v_p.id, 'product_name', v_p.name, 'qty', v_qty,
          'unit_price', v_p.price, 'discount', 0, 'line_total', v_p.price * v_qty);
        v_sub := v_sub + v_p.price * v_qty;
      end loop;

      v_method := case when random() < 0.55 then 'cash' when random() < 0.8 then 'qris' else 'transfer' end;
      v_tax    := round(v_sub * 0.10);
      v_round  := case when v_method = 'cash' then round((v_sub + v_tax) / 500) * 500 - (v_sub + v_tax) else 0 end;
      v_total  := v_sub + v_tax + v_round;
      if v_method = 'cash' then v_cash := v_cash + v_total; end if;

      perform public.record_sale(jsonb_build_object(
        'id', gen_random_uuid(), 'outlet_id', v_outlet, 'terminal_id', v_term, 'shift_id', v_shift,
        'receipt_no', format('PST-T1-%s-%s', to_char(v_day, 'YYYYMMDD'), lpad(i::text, 4, '0')),
        'business_date', v_day,
        'created_at', v_opened + make_interval(mins => i * 40 + floor(random() * 30)::int),
        'order_type', case when random() < 0.6 then 'dine_in' else 'takeaway' end,
        'tax_rate', 10, 'tax_inclusive', false, 'tax_total', v_tax,
        'service_rate', 0, 'service_total', 0, 'discount_total', 0, 'rounding', v_round, 'total', v_total,
        'items', v_items,
        'payments', jsonb_build_array(jsonb_build_object('method', v_method, 'amount', v_total, 'tendered', v_total))));
    end loop;

    if d % 3 = 0 then
      insert into public.expenses (id, business_id, outlet_id, category, amount, note, spent_on)
      values (gen_random_uuid(), v_biz, v_outlet, 'Bahan baku', 150000 + floor(random() * 15) * 10000, 'Belanja pasar', v_day);
    end if;
    if d % 7 = 0 then
      insert into public.expenses (id, business_id, outlet_id, category, amount, note, spent_on)
      values (gen_random_uuid(), v_biz, v_outlet, 'Gas elpiji', 66000, null, v_day);
    end if;

    if d > 0 then
      perform public.close_shift(v_shift, v_cash);
      update public.shifts set closed_at = v_opened + interval '11 hours' where id = v_shift;
    end if;
  end loop;

  raise notice 'Demo ready. Sign in as % / demo-foodbiz', v_email;
end $$;
