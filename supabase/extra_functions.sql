-- ============================================================
-- Extra functions — run after schema.sql and rls_policies.sql
-- ============================================================

-- Lets the public registration form check "is this phone taken?"
-- without needing broad SELECT access to the users table (which RLS
-- otherwise blocks for anonymous/other users). Returns only a
-- boolean — never exposes whose phone it is.
create or replace function is_phone_available(p_phone text)
returns boolean as $$
  select not exists (select 1 from users where phone = p_phone);
$$ language sql stable security definer;

-- Restrict who can call it to anon + authenticated (default is fine,
-- but explicit here for clarity).
grant execute on function is_phone_available(text) to anon, authenticated;
