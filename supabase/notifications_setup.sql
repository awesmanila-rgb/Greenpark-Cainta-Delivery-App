-- ============================================================
-- Persisted notifications — run after schema.sql, rls_policies.sql,
-- extra_functions.sql, and realtime_setup.sql
--
-- Replaces the client-only notification approach with server-side
-- writes: a trigger on `orders` inserts a row here whenever something
-- happens that a customer, merchant, or rider should know about. This
-- means notifications survive a reload and are waiting for you even
-- if the app wasn't open when the change happened — the earlier
-- client-only version only caught changes while you were looking at
-- the screen.
--
-- Not covered here: the rider "a new unclaimed job appeared" alert.
-- That's inherently a broadcast-to-many-riders event, not a specific
-- user's notification, and it's only useful in the moment (a stale
-- "job available" notification for a job someone else already took
-- isn't worth persisting) — that one stays as the client-side
-- Realtime listener already in NotificationsContext.jsx.
-- ============================================================

create table notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  order_id uuid references orders(id) on delete cascade,
  event_type text not null check (event_type in ('new_order', 'status_change')),
  status order_status, -- populated for status_change events
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create index idx_notifications_user on notifications(user_id, created_at desc);

alter table notifications enable row level security;

create policy "Users view their own notifications"
  on notifications for select
  using (user_id = auth.uid());

create policy "Users mark their own notifications read"
  on notifications for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- No INSERT policy for authenticated/anon on purpose — notifications
-- are only ever written by the trigger below, which runs as
-- SECURITY DEFINER and bypasses RLS. A client can never write a fake
-- notification to themselves or anyone else.

create or replace function notify_order_change()
returns trigger as $$
begin
  if TG_OP = 'INSERT' then
    insert into notifications (user_id, order_id, event_type)
    values (new.merchant_id, new.id, 'new_order');

  elsif TG_OP = 'UPDATE' and new.status is distinct from old.status then
    insert into notifications (user_id, order_id, event_type, status)
    values (new.customer_id, new.id, 'status_change', new.status);

    if new.rider_id is not null then
      insert into notifications (user_id, order_id, event_type, status)
      values (new.rider_id, new.id, 'status_change', new.status);
    end if;
  end if;

  return new;
end;
$$ language plpgsql security definer;

create trigger trg_notify_order_change
  after insert or update on orders
  for each row execute function notify_order_change();

-- So the client can subscribe to live inserts, same as orders.
alter publication supabase_realtime add table notifications;
