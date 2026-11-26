-- One call for the reports page. SECURITY INVOKER (the default), so every table read is filtered
-- by the caller's RLS: a manager only ever sees their own outlet, an owner sees all.
create function public.sales_report(p_from date, p_to date, p_outlet uuid default null)
returns jsonb
language sql stable set search_path = '' as $$
  with s as (
    select * from public.sales_with_status
    where business_date between p_from and p_to
      and (p_outlet is null or outlet_id = p_outlet)
  ),
  live as (select * from s where status <> 'voided'),
  items as (
    select i.* from public.sale_items i join live on live.id = i.sale_id
  ),
  refunds as (
    select r.amount from public.refunds r join live on live.id = r.sale_id where r.kind = 'refund'
  ),
  exp as (
    select amount from public.expenses
    where spent_on between p_from and p_to and (p_outlet is null or outlet_id = p_outlet)
  )
  select jsonb_build_object(
    'count',     (select count(*) from live),
    'voided',    (select count(*) from s where status = 'voided'),
    'gross',     coalesce((select sum(total) from live), 0),
    'refunds',   coalesce((select sum(amount) from refunds), 0),
    'discounts', coalesce((select sum(discount_total) from live), 0),
    'service',   coalesce((select sum(service_total) from live), 0),
    'tax',       coalesce((select sum(tax_total) from live), 0),
    'expenses',  coalesce((select sum(amount) from exp), 0),
    'costed_revenue', coalesce((select sum(line_total) from items where cost_price is not null), 0),
    'cogs',      coalesce((select sum(qty * cost_price) from items where cost_price is not null), 0),
    'uncosted_revenue', coalesce((select sum(line_total) from items where cost_price is null), 0),
    'by_day', coalesce((
      select jsonb_agg(jsonb_build_object('date', d, 'net', net, 'count', n) order by d)
      from (select business_date as d, sum(total - refunded_amount) as net, count(*) as n from live group by business_date) x
    ), '[]'),
    'by_method', coalesce((
      select jsonb_agg(jsonb_build_object('method', method, 'amount', amt) order by amt desc)
      from (select p.method, sum(p.amount) as amt from public.payments p join live on live.id = p.sale_id group by p.method) x
    ), '[]'),
    'top_products', coalesce((
      select jsonb_agg(jsonb_build_object('name', name, 'qty', q, 'revenue', rev) order by rev desc)
      from (
        select product_name as name, sum(qty) as q, sum(line_total) as rev
        from items group by product_name order by sum(line_total) desc limit 10
      ) x
    ), '[]')
  );
$$;
revoke execute on function public.sales_report(date, date, uuid) from public, anon;
