-- ============================================================
-- Patch: fixes customer browsing of merchants.
--
-- Only needed if you already ran the earlier version of
-- rls_policies.sql before this fix was added. If you're setting
-- up fresh, the current rls_policies.sql already includes this —
-- skip this file.
--
-- Background: Postgres enforces a table's own RLS *inside*
-- subqueries other tables' policies use to check it. The "verified
-- merchant" EXISTS check in the merchants SELECT policy queries the
-- `users` table — and without a policy allowing that, RLS silently
-- hid every merchant from every customer except themselves.
-- ============================================================

create policy "Anyone can view verified merchant identities"
  on users for select
  using (role = 'merchant' and status = 'verified');
