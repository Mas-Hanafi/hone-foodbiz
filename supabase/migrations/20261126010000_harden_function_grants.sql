-- Fixes from the Supabase security advisor after the first deploy.

-- Pin search_path like the other helpers.
alter function public.can_access_outlet(uuid) set search_path = '';

-- No function here is meant for signed-out callers. Supabase grants execute to anon by default.
revoke execute on all functions in schema public from public, anon;

-- Trigger function: fires on insert regardless of execute rights, so nobody needs to call it as an RPC.
revoke execute on function public.apply_stock_movement() from authenticated;

-- Still executable by authenticated, on purpose:
--   has_business_role / has_outlet_role / can_access_outlet: RLS policies call them as the signed-in user.
--   create_business, set_my_pin, record_sale, record_refund, close_shift: the app's RPC surface,
--   each checks auth.uid() and outlet access itself.
