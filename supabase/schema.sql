-- ============================================================
-- Village Delivery App — Supabase Schema
-- ============================================================

-- ---------- ENUMS ----------

create type user_role as enum ('customer', 'merchant', 'rider', 'admin');
create type user_status as enum ('pending', 'verified', 'banned');

create type vehicle_type as enum ('walk', 'bicycle', 'motorcycle');
create type rider_availability as enum ('available', 'busy', 'offline');

create type delivery_mode as enum ('walk', 'bicycle_motorcycle');
create type payment_method as enum ('gcash', 'cod');
create type payment_status as enum ('pending', 'confirmed', 'failed');

create type order_status as enum (
  'placed',
  'merchant_accepted',
  'awaiting_payment_confirmation',
  'payment_confirmed',
  'ready_for_pickup',
  'rider_assigned',
  'picked_up',
  'out_for_delivery',
  'delivered',
  'rider_settled',
  'cancelled',
  'payment_issue'
);

-- ---------- USERS ----------
-- One row per registered person, regardless of role.
-- Extends Supabase auth.users via matching id.

create table users (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  phone text not null unique,
  role user_role not null,
  status user_status not null default 'pending',
  zone text,               -- sitio/purok
  landmark text,           -- nearest landmark, free text
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- MERCHANTS ----------

create table merchants (
  user_id uuid primary key references users(id) on delete cascade,
  shop_name text not null,
  zone text not null,
  landmark text not null,
  gcash_number text,
  operating_hours text,      -- free text e.g. "8am - 8pm daily"
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- RIDERS ----------

create table riders (
  user_id uuid primary key references users(id) on delete cascade,
  vehicle_type vehicle_type not null,
  availability rider_availability not null default 'offline',
  max_cod_order_value numeric(10,2) not null default 750.00,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- PRODUCTS ----------

create table products (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references merchants(user_id) on delete cascade,
  name text not null,
  description text,
  price numeric(10,2) not null check (price >= 0),
  unit text not null default 'piece',   -- e.g. piece, kilo, pack
  category text,
  stock_qty integer not null default 0 check (stock_qty >= 0),
  photo_url text not null,              -- REQUIRED per product decision
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_products_merchant on products(merchant_id);
create index idx_products_active on products(active) where active = true;

-- ---------- ORDERS ----------

create table orders (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references users(id),
  merchant_id uuid not null references merchants(user_id),
  rider_id uuid references riders(user_id),   -- nullable until assigned

  status order_status not null default 'placed',
  delivery_mode delivery_mode not null,
  payment_method payment_method not null,

  subtotal numeric(10,2) not null check (subtotal >= 0),
  delivery_fee numeric(10,2) not null default 0,
  cod_surcharge numeric(10,2) not null default 0,
  platform_fee_percent numeric(5,2) not null default 0,   -- reserved for future use
  total numeric(10,2) not null check (total >= 0),

  delivery_zone text,
  delivery_landmark text,
  delivery_contact_phone text not null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_orders_customer on orders(customer_id);
create index idx_orders_merchant on orders(merchant_id);
create index idx_orders_rider on orders(rider_id);
create index idx_orders_status on orders(status);

-- ---------- ORDER ITEMS ----------

create table order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  product_id uuid not null references products(id),
  qty integer not null check (qty > 0),
  price_at_order numeric(10,2) not null,   -- locked price, immune to later product price edits
  created_at timestamptz not null default now()
);

create index idx_order_items_order on order_items(order_id);

-- ---------- PAYMENTS ----------

create table payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  method payment_method not null,
  amount numeric(10,2) not null check (amount >= 0),
  payer_id uuid references users(id),
  payee_id uuid references users(id),
  status payment_status not null default 'pending',
  proof_reference text,        -- e.g. GCash ref number, screenshot path
  confirmed_by uuid references users(id),
  confirmed_at timestamptz,
  created_at timestamptz not null default now()
);

create index idx_payments_order on payments(order_id);

-- ---------- RIDER SETTLEMENTS ----------
-- Tracks COD float a rider fronted to a merchant, until reimbursed.

create table rider_settlements (
  id uuid primary key default gen_random_uuid(),
  rider_id uuid not null references riders(user_id),
  order_id uuid not null references orders(id),
  amount_fronted numeric(10,2) not null check (amount_fronted >= 0),
  settled boolean not null default false,
  settled_at timestamptz,
  created_at timestamptz not null default now()
);

create index idx_settlements_rider on rider_settlements(rider_id);
create unique index idx_settlements_order on rider_settlements(order_id);

-- ---------- RATINGS ----------

create table ratings (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  rated_user_id uuid not null references users(id),   -- merchant or rider being rated
  rated_by uuid not null references users(id),
  stars smallint not null check (stars between 1 and 5),
  created_at timestamptz not null default now(),
  unique (order_id, rated_user_id, rated_by)
);

create index idx_ratings_rated_user on ratings(rated_user_id);

-- ============================================================
-- updated_at auto-touch trigger (applied where relevant)
-- ============================================================

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_users_updated_at before update on users
  for each row execute function set_updated_at();
create trigger trg_merchants_updated_at before update on merchants
  for each row execute function set_updated_at();
create trigger trg_riders_updated_at before update on riders
  for each row execute function set_updated_at();
create trigger trg_products_updated_at before update on products
  for each row execute function set_updated_at();
create trigger trg_orders_updated_at before update on orders
  for each row execute function set_updated_at();
