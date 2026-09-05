# Sakto — Village Delivery App

Mini Grab-like delivery app scoped to a single village. This package
contains the **Supabase schema** and seven working flows: **Auth +
Registration**, **Merchant product management**, **Admin approvals**,
**Customer browse + checkout**, **Merchant order handling**, **Rider
job flow**, and **Notifications**.

## 1. Set up Supabase

1. Create a project at https://supabase.com
2. Open the SQL editor and run, in this order:
   - `supabase/schema.sql`
   - `supabase/rls_policies.sql`
   - `supabase/extra_functions.sql`
   - `supabase/storage_setup.sql` (creates the `product-photos` bucket + policies)
   - `supabase/realtime_setup.sql` (turns on Realtime for `orders` — required for notifications)
   - `supabase/notifications_setup.sql` (persisted notifications table + trigger — see below)
   - `supabase/live_tracking_setup.sql` (rider live-location table + RLS — see "Live rider tracking" below)
3. In your Supabase project settings, grab your **Project URL** and
   **anon public key**.
4. **Important:** Go to Authentication → Providers → Email and
   **disable "Confirm email"** for MVP. The app handles the confirm-email
   case if you leave it on (it defers profile creation until the user's
   first login after confirming), but disabling it gives a much smoother
   signup for a village audience — one less step for people who may not
   check email often.

**If you already ran an earlier version of `rls_policies.sql`** (from
before this pass), also run, in order:
- `supabase/patch_001_public_merchant_read.sql` — customer browsing
- `supabase/patch_002_rider_job_visibility.sql` — rider job list/claiming
- `supabase/patch_003_customer_cancel_order.sql` — customer order cancellation

See the "RLS fixes" note below for why these are needed.

## 2. Configure the app

```bash
cp .env.example .env
```

Fill in `.env` with your Project URL and anon key.

## 3. Run it

```bash
npm install
npm run dev
```

Open the printed local URL on your phone or browser. It's installable
to a home screen (manifest + icons included) — "Add to Home Screen" in
the browser menu. Once built for production (`npm run build`), the app
shell also works fully offline — see "Offline support" below.

## Creating an admin account

There's intentionally **no public "register as admin" option** — you
don't want that open on the internet. To create yourself as admin:

1. Register normally as a Customer (or any role) to create your login.
2. In the Supabase Table Editor, open the `users` table, find your row,
   and change `role` to `admin` and `status` to `verified`.
3. Log back in — you'll land on the Dashboard with an "Approvals" card
   linking to the approvals screen (Pending / Verified / Banned tabs
   for merchants and riders, with Verify / Ban / Reinstate actions).

## What's included in this pass

- Role selection screen (Customer / Merchant / Rider)
- Registration forms, adapted per role, with password confirmation
  and a phone-number availability check before signup
- Login, with plain-language error messages instead of raw database errors
- Forgot password / reset password flow
- Handles both Supabase email-confirmation settings correctly (see step 4 above)
- Pending-approval screen (merchants/riders wait here until an admin
  sets their `status` to `verified`)
- Suspended/banned account screen, distinct from the pending message
- Installable PWA basics: manifest + icons + theme color
- Merchant product management: add/edit products with a **required**
  photo (camera capture or gallery), client-side image compression
  before upload, price, unit, stock quantity, category, description,
  and an in-stock/out-of-stock toggle (soft state — past orders still
  reference the product correctly since `order_items` locks in `price_at_order`)
- Admin approvals screen: tabs for Pending / Verified / Banned
  merchants and riders, with one-tap Verify, Ban, or Reinstate
- **Customer browse + checkout**:
  - Browse verified merchants → view a shop's active products → add to cart
  - Cart is scoped to one merchant at a time (matches how pickup works —
    a rider collects from a single shop per delivery); switching merchants
    prompts to start a new cart
  - Checkout: choose delivery mode (walk / bicycle-motorcycle) and payment
    method (GCash or COD), enter delivery zone/landmark/contact (prefilled
    from your profile, editable per order), see the fee breakdown live
  - **COD cap enforced client-side**: orders over ₱750 (the rider float cap)
    silently fall back to GCash-only, per the pricing rules agreed on earlier
  - Places the order, its line items, and a pending payment record, then
    shows a confirmation screen with the order's current status
- **Merchant order screen** (`/merchant/orders`): Active / History tabs,
  each order shows its items, delivery info, and payment method, with
  the one action available at that stage:
  - `placed` → **Accept order** (routes straight to "waiting for GCash
    payment" for GCash orders, or "ready for pickup" for COD, since the
    rider fronts payment at pickup so there's nothing to wait for)
  - `awaiting_payment_confirmation` → **Confirm GCash payment received**
    (updates both the order and the underlying `payments` row —
    `confirmed_by` / `confirmed_at` get set)
  - `payment_confirmed` → **Mark ready for pickup**
  - Any active order → **Cancel**
- **Rider job flow** (`/rider/jobs`): Available / My jobs / History tabs
  - Available: unclaimed `ready_for_pickup` orders, showing pickup
    location, items, delivery address, payment method, and what the
    rider earns (delivery fee + COD surcharge). For COD jobs over the
    rider's own `max_cod_order_value`, Accept is disabled with an
    explanation — the per-rider cap from the schema is actually
    enforced here, not just the flat ₱750 used at checkout.
  - Accept → claims the job (`rider_assigned`)
  - Mark picked up → `picked_up`; for COD, also writes a
    `rider_settlements` row recording what the rider fronted
  - Mark delivered → `delivered` (GCash) or `rider_settled` (COD,
    which also marks the settlement row as settled)
- **Notifications** — in-app + Supabase Realtime only, per the earlier
  decision (no SMS, no push dependency, since a phone call was agreed
  as the practical fallback for patchy signal, and that's already
  covered by the contact numbers on every order screen). **Persisted
  server-side** via a Postgres trigger on `orders` that writes to a
  `notifications` table — not just held in memory — so they're there
  waiting for you even if the app was closed when the change happened:
  - A floating bell (visible on every authenticated screen) shows an
    unread count and opens `/notifications`
  - **Customer**: notified on order status changes
  - **Merchant**: notified when a new order comes in
  - **Rider**: notified when their assigned job's status changes
    (persisted, same as above), *and* when a new unclaimed job becomes
    available (this one stays client-side/session-only — it's
    inherently a broadcast to many riders rather than one person's
    notification, and a stale "job available" alert for something
    already claimed isn't useful anyway; see the comment in
    `notifications_setup.sql`)
  - The client can only read/mark-read its own notifications — RLS has
    no INSERT policy for regular users at all, so a client can never
    write a fake one; only the `SECURITY DEFINER` trigger can
  - Tapping a notification jumps to the relevant screen for that role
- **Customer order history** (`/orders`): every past order, merchant
  name, status, total, and date — links into the same confirmation/status
  screen as a fresh order
- **Ratings**: once an order reaches `delivered`/`rider_settled`, the
  confirmation screen shows a 1–5 star prompt for the merchant and (if
  one was assigned) the rider. One rating per person per order —
  submitting again is blocked by a unique constraint, shown as a plain
  "you already rated this" rather than a raw database error
- **Rider COD float / settlements** (`/rider/settlements`): total
  outstanding amount fronted to merchants that hasn't been marked
  delivered yet, plus a list of every COD job with its settled/outstanding
  status — makes the `rider_settlements` data (written since the rider
  job-flow pass) actually visible instead of sitting unused in the database
- **Ratings now shown to customers**: average star rating + count
  appears next to each merchant in the browse list and on their menu
  page — the data was already being captured, this surfaces it
- **Profile editing** (`/profile`, linked from the Dashboard for every
  role): update name/phone/zone/landmark for everyone, plus shop
  details for merchants and vehicle type for riders. Previously
  everything was locked in at registration with no way to fix a typo
  or move to a new sitio.
- **Customer order cancellation**: a Cancel button appears on the order
  status screen while status is still `placed` — before this, only the
  merchant could cancel, so a customer stuck with a wrong order had no
  way out except calling the merchant directly.
- **Offline app-shell caching**: a real service worker (via
  `vite-plugin-pwa`, generated at build time so it correctly precaches
  whatever hashed filenames that build produces) now caches the app
  shell — JS, CSS, HTML, icons — so the app **loads** even with no
  connection, addressing the "needs a live connection just to load"
  gap directly. This is deliberately narrow: order/product *data* is
  NOT cached, since a stale order status shown offline would be
  actively misleading, not helpful — only the shell that lets the app
  open and show a normal "can't reach the server" state instead of a
  blank screen or browser error. Product photos get a
  stale-while-revalidate cache so previously-seen images still show up.

- **Live rider tracking**: while a rider has an active job
  (`rider_assigned` → `out_for_delivery`), their phone shares GPS
  position (throttled to once every ~10s) to a `rider_locations` table.
  The customer sees a live map — Leaflet + OpenStreetMap tiles, no API
  key or billing — on their order screen during that same window.
  Scope, deliberately:
  - **No route to the destination.** Delivery addresses are free-text
    zone/landmark (per the earlier village-addressing decision), not
    geocoded coordinates, so there's nothing to draw a line to — this
    shows where the rider *is*, not a route.
  - **Access is locked down tightly**: a customer can only see the
    specific rider assigned to *their* order, and only while that
    order is in an active-delivery status — not before assignment, not
    after delivery, never for someone else's order. Enforced by RLS,
    not just hidden in the UI.
  - **Rider transparency**: the rider's own screen shows a plain
    "sharing your location" indicator whenever it's active, including a
    clear message if they've denied location permission (which doesn't
    block delivery — it just means no live map for that customer).
  - Location sharing turns off automatically the moment the job leaves
    an active status (delivered, cancelled, etc.) — not a background
    permanent tracker.

## What's NOT built yet

Per the build order we agreed on — all seven pieces are done:
1. ~~Auth + registration~~
2. ~~Merchant product management~~
3. ~~Customer browse + checkout~~
4. ~~Order state machine / merchant payment confirmation~~
5. ~~Rider job flow~~
6. ~~Notifications~~
7. ~~Admin approvals UI~~

Plus, from the follow-up passes:
- ~~Order history list for customers~~
- ~~Ratings~~ (both capturing them and now displaying them)
- ~~Rider settlement reconciliation view~~
- ~~Persisted notification history~~
- ~~Offline/service-worker caching~~
- ~~Profile editing~~
- ~~Customer order cancellation~~
- ~~Live rider tracking~~

Still worth building:
- Rider ratings aren't shown anywhere yet (merchant's average is
  visible when browsing; a rider's average isn't surfaced to anyone —
  there's no screen where a rider's identity is customer-facing before
  assignment, so there's nowhere natural to show it yet)
- Registration rate limiting: Supabase Auth applies its own default
  server-side rate limits to signups/logins regardless of this app's
  code, which covers basic abuse for MVP. Nothing custom has been
  added on top (e.g. CAPTCHA, per-IP throttling) — revisit if abuse
  actually shows up, rather than building it preemptively
- Deployment/hosting walkthrough — everything so far assumes
  `npm run dev` locally; there's no guide yet for deploying to
  Vercel/Netlify/etc., which real HTTPS hosting requires for PWA
  installability and offline support to matter beyond localhost

## Offline support

`npm run build` generates `dist/sw.js`, a service worker that precaches
the app shell (HTML/JS/CSS/icons/manifest). This means:
- The app **opens** with no connection — you'll see the UI and can
  navigate between already-visited screens
- Actions that need the server (login, placing an order, loading a
  merchant's products) will still fail without a connection, as they
  should — there's no attempt to fake offline data
- Previously-loaded product photos are cached (stale-while-revalidate)
  so they don't disappear offline
- This only applies to a **production build** (`npm run build` +
  serving `dist/`) — `npm run dev` does not register a service worker

## RLS fixes worth knowing about

While wiring customer browsing, the rider job flow, and customer order
cancellation, found and fixed three real bugs, the first two stemming
from the same root cause: Postgres enforces a table's own row-level
security **inside subqueries** other tables' policies use to check it,
and the base policies didn't account for the "not yet related to this
row" moment (a customer's first look at a merchant they haven't
ordered from, a rider's first look at a job they haven't claimed).

1. The "view verified merchants" policy on `merchants` checks an
   `EXISTS` against `users` — without an explicit policy allowing
   that read, RLS silently hid every merchant from every customer
   except themselves. Fixed with a `users` SELECT policy scoped to
   `role = 'merchant' and status = 'verified'`.
2. The base `orders` policies only let a rider see/update a job once
   `rider_id` already equals them — meaning an unclaimed job was
   invisible to every rider, forever. Fixed with two policies (plus a
   matching one on `order_items`) scoped to `status = 'ready_for_pickup'
   and rider_id is null`, gated to verified riders only.
3. Customers had **no UPDATE policy on `orders` at all** — meaning
   cancellation had to be entirely a merchant-side action, with no
   path for a customer to back out of a mistaken order themselves.
   Fixed with a policy scoped narrowly to `status = 'placed'` (before
   the merchant has done any work) and only allowing a transition to
   `cancelled`.

All three are in `rls_policies.sql` for fresh installs, or as
standalone patch files if you'd already deployed an earlier version.

## Notes

- New merchant/rider accounts start with `status = 'pending'` and
  cannot be treated as live until an admin sets `status = 'verified'`
  — enforced by RLS.
- Delivery fee (₱15 walk / ₱25 bike-moto), COD surcharge (₱15 flat),
  and COD cap (₱750) live in `src/lib/pricing.js` on the frontend and
  as defaults in `supabase/schema.sql` — keep both in sync if you
  change them.
- `rider_settlements` rows are created when a rider marks a COD order
  picked up, marked `settled` when they mark it delivered, and now
  visible via `/rider/settlements`.
- If a registration partially fails after the auth account is created
  (rare — e.g. connection drops mid-signup), the person will see a
  message asking them to contact support rather than silently losing
  their account. There's no self-service fix for this yet since it
  needs the Supabase service role key (not exposed to the client) to
  clean up — worth a small admin tool later if it comes up often.
- **Geolocation requires HTTPS** (or `localhost`) — browsers block
  `navigator.geolocation` on plain HTTP entirely. This matters once
  you deploy: live tracking (and location permission prompts) will
  silently fail on an HTTP-only deployment. `npm run dev`'s localhost
  is fine for testing.
- Live tracking polls position with `enableHighAccuracy: false` and
  throttles writes to once per ~10 seconds — a deliberate battery/data
  tradeoff for a village audience over pinpoint precision or
  sub-second updates.
