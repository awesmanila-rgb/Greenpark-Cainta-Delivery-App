-- ============================================================
-- Row Level Security Policies
-- Run after schema.sql
-- ============================================================

alter table users enable row level security;
alter table merchants enable row level security;
alter table riders enable row level security;
alter table products enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;
alter table payments enable row level security;
alter table rider_settlements enable row level security;
alter table ratings enable row level security;

-- Helper: fetch role of the currently authenticated user
create or replace function current_user_role()
returns user_role as $$
  select role from users where id = auth.uid();
$$ language sql stable security definer;

-- Helper: fetch status of the currently authenticated user (used to
-- gate rider job visibility to verified riders only)
create or replace function current_user_status()
returns user_status as $$
  select status from users where id = auth.uid();
$$ language sql stable security definer;

-- ---------- USERS ----------

create policy "Users can view their own profile"
  on users for select
  using (id = auth.uid());

create policy "Admins can view all users"
  on users for select
  using (current_user_role() = 'admin');

create policy "Users can update their own profile"
  on users for update
  using (id = auth.uid());

create policy "Admins can update any user (approvals, bans)"
  on users for update
  using (current_user_role() = 'admin');

create policy "Anyone authenticated can insert their own user row"
  on users for insert
  with check (id = auth.uid());

-- IMPORTANT: Postgres enforces a table's own RLS *inside* subqueries
-- that other tables' policies use to check it — so the "verified
-- merchant" EXISTS check in the merchants policy below would silently
-- return nothing for anyone browsing someone else's shop, without
-- this policy. This is what actually makes customer browsing work.
create policy "Anyone can view verified merchant identities"
  on users for select
  using (role = 'merchant' and status = 'verified');

-- ---------- MERCHANTS ----------

create policy "Anyone can view verified merchant profiles"
  on merchants for select
  using (
    exists (select 1 from users u where u.id = merchants.user_id and u.status = 'verified')
    or user_id = auth.uid()
    or current_user_role() = 'admin'
  );

create policy "Merchant can update own profile"
  on merchants for update
  using (user_id = auth.uid());

create policy "Merchant can insert own profile"
  on merchants for insert
  with check (user_id = auth.uid());

-- ---------- RIDERS ----------

create policy "Rider can view/update own profile"
  on riders for all
  using (user_id = auth.uid() or current_user_role() = 'admin');

create policy "Rider can insert own profile"
  on riders for insert
  with check (user_id = auth.uid());

-- ---------- PRODUCTS ----------

create policy "Anyone can view active products"
  on products for select
  using (active = true or merchant_id = auth.uid() or current_user_role() = 'admin');

create policy "Merchant manages own products"
  on products for all
  using (merchant_id = auth.uid())
  with check (merchant_id = auth.uid());

-- ---------- ORDERS ----------

create policy "Customer views own orders"
  on orders for select
  using (
    customer_id = auth.uid()
    or merchant_id = auth.uid()
    or rider_id = auth.uid()
    or current_user_role() = 'admin'
  );

create policy "Customer creates own order"
  on orders for insert
  with check (customer_id = auth.uid());

create policy "Merchant updates orders for their shop"
  on orders for update
  using (merchant_id = auth.uid());

create policy "Rider updates orders assigned to them"
  on orders for update
  using (rider_id = auth.uid());

create policy "Admin updates any order"
  on orders for update
  using (current_user_role() = 'admin');

-- A customer can only back out before the merchant has done any work
-- on it — once accepted (or further along), cancellation has real
-- consequences for the merchant/rider, so that's handled by the
-- merchant's own Cancel button instead, not unilaterally by the
-- customer.
create policy "Customer cancels their own order while still placed"
  on orders for update
  using (customer_id = auth.uid() and status = 'placed')
  with check (customer_id = auth.uid() and status = 'cancelled');

-- Without these two, a rider can never see or claim their first job:
-- the base "Customer views own orders" policy only shows orders where
-- rider_id already equals them, and the base update policy only lets
-- a rider touch an order already assigned to them — neither covers
-- the moment of claiming an unclaimed job.
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

-- ---------- ORDER ITEMS ----------

create policy "View order items if you can view the parent order"
  on order_items for select
  using (
    exists (
      select 1 from orders o
      where o.id = order_items.order_id
      and (o.customer_id = auth.uid() or o.merchant_id = auth.uid() or o.rider_id = auth.uid())
    )
    or current_user_role() = 'admin'
  );

create policy "Customer inserts items on their own order"
  on order_items for insert
  with check (
    exists (select 1 from orders o where o.id = order_items.order_id and o.customer_id = auth.uid())
  );

-- Matches the "Verified riders can view unclaimed ready orders" policy
-- above — without this, a rider could see the order shell in the job
-- list but not what's actually in it.
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

-- ---------- PAYMENTS ----------

create policy "View payments tied to your orders"
  on payments for select
  using (
    payer_id = auth.uid() or payee_id = auth.uid()
    or exists (
      select 1 from orders o
      where o.id = payments.order_id
      and (o.customer_id = auth.uid() or o.merchant_id = auth.uid() or o.rider_id = auth.uid())
    )
    or current_user_role() = 'admin'
  );

create policy "Merchant confirms payment on their order"
  on payments for update
  using (payee_id = auth.uid());

create policy "Customer or rider inserts a payment record"
  on payments for insert
  with check (payer_id = auth.uid());

-- ---------- RIDER SETTLEMENTS ----------

create policy "Rider views own settlements"
  on rider_settlements for select
  using (rider_id = auth.uid() or current_user_role() = 'admin');

create policy "Rider inserts own settlement record"
  on rider_settlements for insert
  with check (rider_id = auth.uid());

create policy "Admin updates settlements"
  on rider_settlements for update
  using (current_user_role() = 'admin');

-- ---------- RATINGS ----------

create policy "Anyone can view ratings"
  on ratings for select
  using (true);

create policy "Rater inserts their own rating on their own order"
  on ratings for insert
  with check (
    rated_by = auth.uid()
    and exists (
      select 1 from orders o
      where o.id = ratings.order_id
      and (o.customer_id = auth.uid() or o.rider_id = auth.uid())
    )
  );
