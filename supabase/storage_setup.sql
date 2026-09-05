-- ============================================================
-- Storage setup for product photos — run after schema.sql,
-- rls_policies.sql, and extra_functions.sql
-- ============================================================

-- Public bucket: product photos need to be viewable by anyone
-- browsing the storefront, without requiring auth.
insert into storage.buckets (id, name, public)
values ('product-photos', 'product-photos', true)
on conflict (id) do nothing;

-- Objects are stored under a path like: {merchant_user_id}/{filename}
-- so a merchant can only write inside their own folder.

create policy "Merchant can upload their own product photos"
  on storage.objects for insert
  with check (
    bucket_id = 'product-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Merchant can update their own product photos"
  on storage.objects for update
  using (
    bucket_id = 'product-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Merchant can delete their own product photos"
  on storage.objects for delete
  using (
    bucket_id = 'product-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Public read (bucket is public, but Storage still checks a SELECT
-- policy for the API in some client paths — this makes it explicit).
create policy "Anyone can view product photos"
  on storage.objects for select
  using (bucket_id = 'product-photos');
