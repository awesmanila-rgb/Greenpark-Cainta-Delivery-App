-- ============================================================
-- Patch: lets a customer cancel their own order before the merchant
-- has accepted it.
--
-- Only needed if you already ran an earlier version of
-- rls_policies.sql before this fix was added. If you're setting up
-- fresh, the current rls_policies.sql already includes this — skip
-- this file.
--
-- Background: customers had zero UPDATE policy on `orders` at all —
-- only merchants, riders, and admin could change an order's status.
-- This scopes cancellation narrowly: only while status is still
-- 'placed' (before the merchant has done any work on it), and only
-- to 'cancelled'.
-- ============================================================

create policy "Customer cancels their own order while still placed"
  on orders for update
  using (customer_id = auth.uid() and status = 'placed')
  with check (customer_id = auth.uid() and status = 'cancelled');
