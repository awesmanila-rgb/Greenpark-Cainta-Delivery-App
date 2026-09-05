-- ============================================================
-- Realtime setup — run after schema.sql
--
-- Supabase's `supabase_realtime` publication exists by default but
-- doesn't include any tables until you add them. Without this, the
-- in-app notification listeners (postgres_changes subscriptions on
-- `orders`) will silently never fire.
-- ============================================================

alter publication supabase_realtime add table orders;
