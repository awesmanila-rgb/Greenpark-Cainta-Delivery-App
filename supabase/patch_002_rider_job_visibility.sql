-- ============================================================
-- Patch: fixes rider job visibility and claiming.
--
-- Only needed if you already ran an earlier version of
-- rls_policies.sql before this fix was added. If you're setting up
-- fresh, the current rls_policies.sql already includes this — skip
-- this file.
--
-- Background: the base orders policies only let a rider see/update
-- an order once rider_id already equals them — which means an
-- unassigned rider could never see an unclaimed job in the first
-- place, let alone claim it. These two policies cover that moment.
-- ============================================================

create or replace function current_user_status()
returns user_status as $$
  select status from users where id = auth.uid();
$$ language sql stable security definer;

create policy "Verified riders can view unclaimed ready orders"
  on orders for select
  using (
    status = 'ready_for_pickup'
    and rider_id is null
    and current_user_role() = 'rider'
    and current_user_status() = 'verified'
  );

create policy "Verified riders can claim unclaimed ready orders"
  on orders for update
  using (
    status = 'ready_for_pickup'
    and rider_id is null
    and current_user_role() = 'rider'
    and current_user_status() = 'verified'
  )
  with check (rider_id = auth.uid());

create policy "Verified riders can view items of unclaimed ready orders"
  on order_items for select
  using (
    exists (
      select 1 from orders o
      where o.id = order_items.order_id
      and o.status = 'ready_for_pickup'
      and o.rider_id is null
    )
    and current_user_role() = 'rider'
    and current_user_status() = 'verified'
  );
