-- Cashiers can only read their own membership (RLS), but a void or refund needs them to pick
-- which manager is approving. This returns just names, and only for an outlet the caller works at.
create function public.list_approvers(p_outlet uuid)
returns table (user_id uuid, display_name text)
language sql stable security definer set search_path = '' as $$
  select m.user_id, m.display_name
  from public.memberships m
  join public.outlets o on o.business_id = m.business_id
  join public.member_pins mp on mp.membership_id = m.id
  where o.id = p_outlet
    and public.can_access_outlet(p_outlet)
    and m.active
    and m.role in ('owner', 'manager')
    and (m.outlet_id is null or m.outlet_id = p_outlet)
  order by m.display_name;
$$;
revoke execute on function public.list_approvers(uuid) from public, anon;
