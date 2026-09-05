-- ============================================================
-- Live rider location tracking — run after schema.sql,
-- rls_policies.sql, and realtime_setup.sql
--
-- Deliberately minimal: one row per rider holding their latest known
-- position, not a location history log. No route-to-destination is
-- possible since delivery addresses are free-text zone/landmark (see
-- the earlier decision on that), not geocoded coordinates — this only
-- shows where the rider currently is.
-- ============================================================

create table rider_locations (
  rider_id uuid primary key references riders(user_id) on delete cascade,
  lat double precision not null,
  lng double precision not null,
  updated_at timestamptz not null default now()
);

alter table rider_locations enable row level security;

-- Rider reads/writes only their own row.
create policy "Rider manages own location"
  on rider_locations for all
  using (rider_id = auth.uid())
  with check (rider_id = auth.uid());

-- A customer can see a rider's live position only while that rider is
-- actively working *their* order — not before assignment, not after
-- delivery, and never for orders that aren't theirs.
create policy "Customer views assigned rider's location during active delivery"
  on rider_locations for select
  using (
    exists (
      select 1 from orders o
      where o.rider_id = rider_locations.rider_id
      and o.customer_id = auth.uid()
      and o.status in ('rider_assigned', 'picked_up', 'out_for_delivery')
    )
  );

alter publication supabase_realtime add table rider_locations;
