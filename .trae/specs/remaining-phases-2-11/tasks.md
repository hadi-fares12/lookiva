# LOOKIVA Platform - Implementation Plan (Phases 2–11 + Appendices 200–218)

Vertical-sliced task queue. All tasks non-overlapping on files to enable safe delegation. Coupled items bundled into single tasks; tests stay together with implementation.

## Task 1: Data completeness — §203 missing models + §204 indexes in Prisma schema + migrations
- **Status**: `pending`
- **Priority**: high
- **Depends On**: None
- **Description**:
  - Read §203 Required Models checklist (line ~3583–3760). Cross-reference `apps/api/prisma/schema.prisma` and identify missing tables.
  - Add Prisma models for: appointments/services/resources deep details, booking_snapshots, queues, payments full, financial_ledger with double-entry rows, wallets, wallet_transactions, loyalty_accounts/redemptions/tiers, packages, memberships, gift_cards/card_redemptions, referrals, promotions, inventories/products/stock_movements, intake_forms/form_submissions, conversations/messages/attachments, moderation_reports/strikes/appeals, audit_logs detail, country-specific tax tables, payout_batches/payout_items, customer_dependents, customer_addresses, platform_plans/subscriptions, analytics_events/daily_analytics_snapshots, etc.
  - Add §204 indexes: composite unique `(branch_id, chair_id, start_at, end_at)` with constraints, GIST indexes, partial indexes on statuses, bloom indexes where useful; enforce SQL-level `EXCLUDE USING gist` for appointment conflict.
  - Generate migration `0002_remaining_models.sql` (raw SQL via `prisma migrate dev --create-only` then post-process); no existing data loss.
  - Ensure Prisma `@@index`, `@@unique`, `@@id` match §204 list. Update `seed/demo-businesses.ts` minimally if relation fields change.
- **Acceptance Criteria Addressed**: AC-R1, AC-R2 (DB constraint part), AC-R12
- **Test Requirements**:
  - `rule` TR-1.1: `pnpm --filter api prisma migrate deploy` against fresh empty PostGIS DB exits 0; all tables created
  - `rule` TR-1.2: Table count (Postgres `SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name NOT IN ('_prisma_migrations', 'spatial_ref_sys', 'geography_columns', 'geometry_columns', 'raster_columns', 'raster_overviews');`) >= 180
  - `rule` TR-1.3: §204 checklist grep against DB introspection output, 0 missing indexes
  - `rule` TR-1.4: Prisma generate succeeds; TypeScript compilation of `@prisma/client` has 0 errors
  - `rubric` TR-1.5: Relation and cascade quality; scale 1-5; 1 = missing FK, orphan rows possible; 3 = most relations OK; 5 = all FKs SET NULL / CASCADE / RESTRICT as intended, no delete anomalies; threshold >= 4; evidence = schema.prisma diff inspection
- **Notes**: Review existing `0001_init/migration.sql` first to avoid naming collisions. Keep migrations additive-only.

## Task 2: Permissions matrix seed + permission keys for social/payments/booking/admin/analytics
- **Status**: `pending`
- **Priority**: high
- **Depends On**: Task 1 (new relation keys optional to reference)
- **Description**:
  - Enumerate every permission used across all endpoints to follow: `social.post.like`, `social.post.*`, `social.comment.*`, `social.follows.*`, `social.reels.*`, `booking.create`, `booking.cancel`, `booking.reschedule`, `booking.hold`, `wallet.read`, `wallet.topup`, `loyalty.read`, `loyalty.redeem`, `packages.*`, `promotions.*`, `payment.capture`, `payment.refund`, `finance.ledger.read`, `finance.payouts.read`, `finance.payouts.execute`, `admin.users.*`, `admin.businesses.*`, `admin.moderation.*`, `analytics.basic`, `analytics.financial`, `calendar.read`, `calendar.write`, `floorboard.read`, `floorboard.write`, `crm.read`, `crm.write`, `staff.read`, `staff.write`, `inventory.*`, `nearby.events`, `moderation.reports.read`, `moderation.actions.write`, `ai.search`, `support.tickets.create`, `support.tickets.admin`.
  - Map to 13 roles in `prisma/seed/users-and-roles.ts`: Super Admin, Platform Admin, Moderator, Support Agent, Owner, Branch Manager, Receptionist, Professional, Freelancer, Customer, Guest, Accountant, Impersonator.
  - Add scoping rules (platform vs company vs branch) for Owner/Manager/Receptionist/Professional per §208 analytics permissions.
  - Register Role enums and Permission enums in `packages/shared-types`; keep in sync.
- **Acceptance Criteria Addressed**: AC-R5, AC-R10 (permission basis)
- **Test Requirements**:
  - `rule` TR-2.1: Re-seed, `SELECT count(*) FROM permissions` >= 150; `SELECT count(*) FROM roles` = 13; role_permissions junction seeded
  - `rule` TR-2.2: Role "Customer" is NEVER granted an admin.* permission; `SELECT count(*) FROM role_permissions rp JOIN roles r ON r.id=rp.role_id WHERE r.name='Customer' AND rp.permission_id IN (SELECT id from permissions where key LIKE 'admin.%')` = 0
  - `rule` TR-2.3: Grep `@RequirePermissions` across all controllers after later tasks — every non-public endpoint references a key that exists in seed
  - `rubric` TR-2.4: Scope granularity; scale 1-5; 1 = all platform-level; 3 = some scoped; 5 = `company_id` + `branch_id` scoping for every role that makes sense; threshold >= 4; evidence = `user_role_scopes` table counts
- **Notes**: Define all constants in `packages/shared-types/src/permissions.enum.ts` so controllers import string enums, never raw strings.

## Task 3: Booking Engine API v2 — holds, concurrency, create/cancel/reschedule/check-in, queue, group
- **Status**: `pending`
- **Priority**: high
- **Depends On**: Task 1, Task 2
- **Description**:
  - Implement `BookingsModule` / `CalendarModule` / `AvailabilityModule` services:
    - Availability search: by branch + date + service + pro preference + resource; uses generated schedule tables + excludes existing appointments + buffer times.
    - Hold creation (`POST /bookings/holds`): inserts TTL row 5min with idempotency key; releases on expiry via BullMQ job.
    - Create booking from hold: row-level transaction, validates chair/pro/resource non-overlap using gist EXCLUDE constraint + app-level overlap check. Returns 409 `SLOT_CONFLICT` if conflict per §211.
    - Reschedule, cancel-with-fee rules, refund-calculations per policy.
    - Walk-in flow (`POST /walk-ins`): minimal-customer booking → queue.
    - Queue (`GET/PUT /queue/:branchId`): join, position, ETA, notify "nearly ready", convert to appointment, auto-expire abandoned.
    - Group booking §214: 4 participants, 3 pros, 3 chairs, parallel times, shared deposit, split remainder; writes per-participant appointment rows + shared invoice.
    - QR check-in: `POST /bookings/:id/check-in` with signed JWT QR payload verification (HMAC).
    - Calendar 6 view queries (Day/Week/2-week/Month/List/4-day) returning serializable shape.
  - Seed sample schedule data.
- **Acceptance Criteria Addressed**: AC-R2, AC-R7, AC-R12
- **Test Requirements**:
  - `rule` TR-3.1: §211 concurrency test — 2 simultaneous POST create with same slot → exact 1 success, other 409 SLOT_CONFLICT
  - `rule` TR-3.2: Availability returns no slots for times where demo booking was created
  - `rule` TR-3.3: Hold expires correctly (time-jump test) and slot becomes free afterwards
  - `rule` TR-3.4: Cancel fee policy computes correct charges for 0h / 24h / 48h windows
  - `rule` TR-3.5: Group booking §214 creates N appointment rows, 1 invoice, N separate payment remainder splits calculable
  - `rubric` TR-3.6: Code clarity; scale 1-5; 1 = one giant file; 3 = moderate split; 5 = AvailabilityService / HoldService / BookingService / CheckinService / QueueService / GroupBookingService split; threshold >= 4

## Task 4: Finance — payments provider abstraction, ledger, tax, commissions, payouts, §209
- **Status**: `pending`
- **Priority**: high
- **Depends On**: Task 1, Task 2, Task 3 (bookings produce invoices)
- **Description**:
  - `PaymentsModule`: provider abstraction (`PaymentProvider` interface) + 2 impls: `DevMockPaymentProvider` (always approves, saves logs) + `StripePaymentProvider` stub with `.env.example` keys. Exposes methods: createPaymentIntent, capture, void, refund, webhook.
  - Financial Ledger: double-entry style rows (debit account, credit account, amount, currency, snapshot FX, reference booking/payout). Append-only (audit).
  - Tax engine: country/state lookup (LB default) with service-level overrides; per-line tax calc (VAT/service tax).
  - Commission splits: platform commission + pro commission + branch override.
  - Payout batches: period-close, summarize due pros, batch create payout_items, export CSV, mark paid.
  - Multi-currency per §216: every aggregate separates totals by currency (`totalsByCurrency` map); optional primary-currency reporting uses stored FX snapshot from `currency_rates` table at transaction time.
  - Dashboard summary: `Booked/Completed/Collected/Cash/Outstanding` per §209.
- **Acceptance Criteria Addressed**: AC-R3, AC-R4, AC-R7, AC-R12
- **Test Requirements**:
  - `rule` TR-4.1: §209 automated reconciliation test — step 0/7/10 all numbers exact
  - `rule` TR-4.2: §216 multi-currency test — Payment A=20 USD, B=2M LBP; aggregate never sums them as numbers (code path verified)
  - `rule` TR-4.3: Refund on a paid booking → 2 ledger rows; totals reflect; analytics reports decrease by refunded amount
  - `rule` TR-4.4: Payout batch for a week produces 1 payout_batch row + N payout_items summing to expected
  - `rubric` TR-4.5: Ledger immutability; scale 1-5; 1 = UPDATE rows allowed; 3 = soft-delete; 5 = immutable (no UPDATE/DELETE on financial_ledger), DB-level trigger rejects UPDATE/DELETE; threshold >= 4

## Task 5: Wallets, Loyalty, Packages, Memberships, Gift Cards, Referrals, Promotions
- **Status**: `pending`
- **Priority**: high
- **Depends On**: Task 1, Task 4
- **Description**:
  - Wallets: top-up via provider, apply wallet credit to invoice, transfer (guarded), transactions list.
  - Loyalty: points engine (per-currency or per-visit), tier rules, redemptions (discount).
  - Packages: sell service packs (e.g., 10 haircuts prepaid), redeem, track remaining credits per customer.
  - Memberships: recurring monthly membership with auto-renew dev stub; benefit grants (discount, priority booking).
  - Gift Cards: issue/redeem/balance; partial redemption state; expirable.
  - Referrals: codes, invite credit on referee first booking.
  - Promotions: flat/percent/buyXgetY; eligibility (category/pro/min spend/code); stackability rules; countdown.
- **Acceptance Criteria Addressed**: AC-R7, AC-R12
- **Test Requirements**:
  - `rule` TR-5.1: Wallet topup → payment → apply-to-invoice chain with sum-zeros in ledger
  - `rule` TR-5.2: Gift card $100 partial redeem $40 → balance $60; invoice $60
  - `rule` TR-5.3: Loyalty 10% back after a $50 haircut → 5 points; user can redeem points with min threshold rule
  - `rubric` TR-5.4: Package/membership coverage; scale 1-5; threshold >= 4

## Task 6: Social Full v2 — reels feed, follows, Book This Look, Verified Work badge, collections, moderation reports API
- **Status**: `pending`
- **Priority**: high
- **Depends On**: Task 1, Task 2, Task 3 (Book This Look → hold booking)
- **Description**:
  - Build `ReelsService` / `FollowsService` / `CollectionsService` / `ModerationReportsService`.
  - Reels feed: GET `/social/reels/feed` paginated; cursor; personalized if auth (followed pros + area + preferences).
  - Follow/unfollow/followers/following endpoints; mutual-follows badge.
  - Book This Look: `POST /social/posts/:id/book-this-look` → creates draft booking with service/snapshot from post.linked_service_id and returns hold.
  - Verified Work badge: reviews created by a customer who actually completed the linked appointment → badge computed column/field exposed on review.
  - Collections: user collections CRUD (public/private), add/remove posts.
  - Moderation reports: POST report (post/comment/review/pro/user) with reason + image; GET list (moderator only).
- **Acceptance Criteria Addressed**: AC-R7, AC-R12
- **Test Requirements**:
  - `rule` TR-6.1: Book This Look actually creates a hold linked to post; deleting hold unlinks
  - `rule` TR-6.2: Verified Work badge = true for review created after completed booking, false otherwise
  - `rule` TR-6.3: Follow/followers counts atomically updated; duplicate follow upserts (no double count)
  - `rubric` TR-6.4: Feed personalization; scale 1-5; threshold >= 4

## Task 7: Analytics module — §206 charts, §207 drilldown, §208 permission-checked dashboards + snapshots
- **Status**: `pending`
- **Priority**: high
- **Depends On**: Task 1, Task 2, Task 4
- **Description**:
  - AnalyticsService aggregates: Revenue (Booked/Completed/Collected/Cash/Outstanding), Bookings by status, Professionals ranking, Branch performance, Services ranking, Customer retention, Cancellation, New vs Returning, Peak hours, Payment methods mix, Avg ticket, Commission, Tax, Payout due.
  - Dashboard charts endpoint: returns series arrays (Chart.js / Recharts compatible) + summary metrics.
  - Drilldown §207: GET `/analytics/drilldown?metric=revenue&by=professional&from=&to=` → paginated list rows.
  - Branch vs Owner vs Receptionist shapes: Receptionist response strips profit fields per §208.
  - Daily snapshotting BullMQ job: writes daily_analytics_snapshots for fast historical charts.
  - Reports export CSV/XLSX endpoints (sheetjs csv or xlsx).
- **Acceptance Criteria Addressed**: AC-R3, AC-R5, AC-R7, AC-R12
- **Test Requirements**:
  - `rule` TR-7.1: §209 exact numbers automated test
  - `rule` TR-7.2: Receptionist GET /analytics/dashboard/branch/:B — response lacks profit / payout fields; Owner has them
  - `rule` TR-7.3: Drilldown endpoint returns 20 rows for a populated seed and totals match chart totals
  - `rubric` TR-7.4: Coverage of analytics metrics vs §206 list; scale 1-5; threshold >= 4

## Task 8: Media v2 §200, Realtime §201, Workers §202 (queues processors)
- **Status**: `pending`
- **Priority**: medium
- **Depends On**: Task 1, Task 2
- **Description**:
  - Media module: complete Sharp pipeline (thumb/small/medium/large), video thumbnail via ffmpeg WASM or BullMQ worker; MIME + magic-byte validation; abuse throttles.
  - Socket.IO gateway wired: `/chat`, `/dashboard` namespaces. Auth middleware validates JWT. Typed events.
    - Chat: send/receive message, typing indicator, read receipts.
    - Dashboard: booking created/cancelled, floor updates, notification push.
  - BullMQ workers: media processor, email processor (Nodemailer ethereal/stub), notification (push stub + in-app row), analytics-snapshot, report-export, payout-batch-summary, sms-dev, WhatsApp-dev. All workers: retry + backoff + dead-letter.
  - `apps/workers` project wiring: one entry that bootstraps all workers.
- **Acceptance Criteria Addressed**: AC-R11, AC-R7, AC-R12
- **Test Requirements**:
  - `rule` TR-8.1: Media JPEG upload creates 4 variant URLs; EXIF rotation handled; .exe upload 400
  - `rule` TR-8.2: Socket.IO chat messages emitted to namespace received by 2nd client in room
  - `rule` TR-8.3: BullMQ job enqueue → worker picks → completion row updated; failed job retries and goes to DLQ after max attempts
  - `rubric` TR-8.4: Observability within workers; scale 1-5; threshold >= 4

## Task 9: Nearby / Smart Discovery / Geofence §64-83 + §213 E2E
- **Status**: `pending`
- **Priority**: medium
- **Depends On**: Task 1, Task 3, Task 6, Task 8
- **Description**:
  - GeofenceEventService: receives client location ping (or simulated) -> relevance score = f(distance, open, rating, following, chair-free, cooldown, quiet hours).
  - Cooldown store (Redis 30min key per user+pro); quiet hours window per business setting.
  - If passes: fires BullMQ notification → push stub + writes notifications row + deep link.
  - Deep link routing on both web and flutter.
  - GET `/discovery/smart-nearby` endpoint used by mobile/feed.
- **Acceptance Criteria Addressed**: AC-R6, AC-R7, AC-R12
- **Test Requirements**:
  - `rule` TR-9.1: §213 E2E automated — 1 notification sent first enter; 2nd within 30min → no duplicate
  - `rule` TR-9.2: Quiet hours 22:00-08:00 returns "not now" for a 23:00 event
  - `rule` TR-9.3: Relevance = 0 for a closed business regardless of distance
  - `rubric` TR-9.4: Tunability of scoring; scale 1-5; threshold >= 4

## Task 10: Moderation, Compliance (GDPR), Support, Platform Admin API endpoints
- **Status**: `pending`
- **Priority**: medium
- **Depends On**: Task 1, Task 2, Task 6
- **Description**:
  - Moderation: list reports, take action (hide post, hide comment, warn user, 1d ban, permanent ban, dismiss report). Writes audit row + strikes table.
  - Appeal endpoint; auto-violation checks (bad-words list scan on text submission, NSFW image stub reject).
  - Compliance / GDPR: Data export endpoint (JSON/ZIP) → queued BullMQ report export; Right to Erasure (account delete + PII scrubbing of reviews/chat where needed, logs retention).
  - Cookie banner endpoints: save consent version, preferences per granular purposes.
  - Support: tickets CRUD for customers, reply from support agent role, ticket state machine, merge duplicates.
  - Admin 16 CRUDs API (§87-218 list): Users, Businesses, Branches, Professionals, Services, Categories, Countries, Regions, Languages, Currencies, Themes, Plans, Feature Flags, Payments, Bookings, Moderation. Plus audit log query endpoint.
- **Acceptance Criteria Addressed**: AC-R10, AC-R7, AC-R12
- **Test Requirements**:
  - `rule` TR-10.1: Account delete request anonymizes all PII; user cannot login after; audit_log records action
  - `rule` TR-10.2: Admin users.list / businesses.list / bookings.list → paginate + filter + sort work
  - `rule` TR-10.3: Moderator action hide-post → post no longer returned from public feed
  - `rubric` TR-10.4: Admin CRUD parity with spec; scale 1-5; threshold >= 4

## Task 11: AI placeholders — NL search, image search, recommendations, chat assistant (dev stubs)
- **Status**: `pending`
- **Priority**: low
- **Depends On**: Task 1, Task 2, Task 3
- **Description**:
  - `AIModule`: get_llm_config() env gate — if OpenAI key absent uses local TF-IDF fallback.
  - NL search: maps query string to structured discovery filters.
  - Image search: perceptual hash stub (hamming) linked to media table.
  - "For You" recommendations: popularity × recency × personalization (view history).
  - Chat assistant: intent classifier → FAQ answer → human handoff.
- **Acceptance Criteria Addressed**: AC-R7, AC-R12
- **Test Requirements**:
  - `rule` TR-11.1: NL "cheap men's haircut near Hamra open now" returns structured filters object with category=Barber, area=Hamra, openNow=true
  - `rule` TR-11.2: Recommendations endpoint returns non-empty list after demo views seeded
  - `rubric` TR-11.3: Graceful degradation with no API keys; scale 1-5; threshold >= 4

## Task 12: Expand packages/api-contracts + shared-types for all new endpoint DTOs
- **Status**: `pending`
- **Priority**: high
- **Depends On**: Task 1–Task 11 (iteratively, but bundled final pass here)
- **Description**:
  - Add to `packages/api-contracts`: request/response types for booking, payments, wallet, loyalty, packages, memberships, giftcards, referrals, promotions, analytics, media, moderation, nearby, support, admin cruds, AI.
  - Add enums, pagination shapes, error codes enum.
  - Ensure all new NestJS controllers import these types as DTOs (or map via class-validator wrappers).
- **Acceptance Criteria Addressed**: AC-R12, NFR-2.8
- **Test Requirements**:
  - `rule` TR-12.1: All DTO imports resolve; build passes
  - `rubric` TR-12.2: Frontend type-sharing adoption; scale 1-5; threshold >= 4

## Task 13: Customer Web full pages (Bookings, Book This Look, Wallet/Loyalty, Packages/Memberships/GiftCards, Referrals, My Bookings/History, QR, Chat, Notifications, Settings/Help)
- **Status**: `pending`
- **Priority**: high
- **Depends On**: Task 3–Task 6, Task 8, Task 12
- **Description**:
  - 6-step booking flow with skeleton loaders, hold countdown, deposit UI, confirm, success.
  - Book This Look entry from reel/post page; prefill service/pro.
  - Wallet top-up UI; loyalty tiers; package purchase + remaining credits; gift cards send/redeem; referrals dashboard.
  - My Bookings (tabs: Upcoming/History/Waitlist/Cancelled) + reschedule/cancel flows; QR check-in card.
  - Favorites/Following/Collections pages; Reels watch + feed page.
  - Chat list page + chat 1:1 with attachments + receipts bubble; chatbot AI stub.
  - Notifications list with filters + preferences page.
  - Settings (theme, language, privacy, notification preferences), Security (2fa, password change, sessions), SAR start, Help (FAQ + ticket submit).
  - Cookie banner + consent manager.
  - Components: skeleton loaders, empty states, error + retry, `useConfirmation` hook; responsive mobile/tablet/desktop.
- **Acceptance Criteria Addressed**: AC-R8, AC-R9, AC-R12
- **Test Requirements**:
  - `rule` TR-13.1: Routes exist for every subflow listed above; 404 not returned on 30+ page routes
  - `rule` TR-13.2: Hold countdown ticks and expires correctly (test with fake timers)
  - `rule` TR-13.3: i18n — Arabic `dir="rtl"` flipped on all new pages; Intl number/date used
  - `rubric` TR-13.4: Page completeness; scale 1-5; threshold >= 4

## Task 14: Business Web full pages (Calendar 6 views, Floor Board, Services CRUD, Staff CRM Products Inventory Promotions Loyalty Packages Gift Cards Forms Finance Reports Payouts Accountants Settings Verification Bank)
- **Status**: `pending`
- **Priority**: high
- **Depends On**: Task 3–Task 8, Task 10, Task 12
- **Description**:
  - Calendar 6 views: drag-drop booking move, resize (time), quick create, filters (pro/branch/resource/room).
  - Floor Board: chair map component, occupancy coloring, drag pro-to-chair, status (Arrived/Ready/Started/Completed/Paid/CheckedOut), service stage progress bar.
  - Services CRUD with dependencies, stages, per-branch pricing, deposits, tax selection, media gallery.
  - Staff directory + invite, role picker with scopes, schedule editor + exceptions, commissions plan, permissions matrix UI.
  - CRM: clients grid, advanced filter, client detail (history, tags, notes, dependents, invoices, packages, points). Merge duplicate action.
  - Products/Inventory: SKU CRUD, stock in/out, low-stock alerts, transfers between branches, batch pricing.
  - Promotions/Loyalty engine/Packages/Gift Cards config screens + issue/redeem logs.
  - Forms builder (drag-drop-lite) + form templates, link-to-booking-service, submission viewer.
  - Finance dashboard with §206 charts, reports CSV export, tax reports, payout batches UI, execute payout, bank-accounts, withdrawal history.
  - Accountants invite/role; Verification step uploader; Business Settings, Branches list CRUD.
  - Walk-in queue screen + quick convert.
- **Acceptance Criteria Addressed**: AC-R8, AC-R9, AC-R12
- **Test Requirements**:
  - `rule` TR-14.1: Calendar 6 view routes all render; drag-drop booking move updates backend
  - `rule` TR-14.2: Finance dashboard numbers match §209 steps in Task 4 seeded state
  - `rule` TR-14.3: Service CRUD create → POST success → list reflects; delete warns about references; validation passes
  - `rubric` TR-14.4: Desktop UX quality; scale 1-5; threshold >= 4

## Task 15: Admin Web full UI — 16 CRUDs, Audit Log viewer, Manual Actions, impersonation
- **Status**: `pending`
- **Priority**: medium
- **Depends On**: Task 10, Task 12
- **Description**:
  - Shared data-table + search + filter + sort + pagination generic component used in all 16 CRUDs.
  - CRUDs: Users, Businesses, Branches, Professionals, Services, Categories, Countries, Regions, Languages, Currencies, Themes, Plans, Feature Flags, Payments, Bookings, Moderation.
  - Audit log viewer: filters actor/entity/action/date; export.
  - Manual actions screen: send OTP manually, force password reset, manual refund, toggle verification, toggle strikes, re-run analytics snapshot.
  - Impersonation: strict guard, audit-logged, banner when impersonating, exit button.
- **Acceptance Criteria Addressed**: AC-R10, AC-R8, AC-R12
- **Test Requirements**:
  - `rule` TR-15.1: All 16 CRUD list pages load via routing; each row view + edit buttons exist and route
  - `rule` TR-15.2: Manual refund → writes audit_log row; row shows when filter applied
  - `rule` TR-15.3: Impersonate as admin = banner visible, exit removes banner, audit rows
  - `rubric` TR-15.4: Admin UX polish; scale 1-5; threshold >= 4

## Task 16: Flutter Customer Mobile full feature set (booking, wallet, reels, chat, qr, notifications, settings)
- **Status**: `pending`
- **Priority**: high
- **Depends On**: Task 3, 5, 6, 8, 12
- **Description**:
  - Booking flow 6 steps, hold countdown, pay deposit dev stub, confirm, reminders notifications.
  - QR check-in screen from upcoming booking tile.
  - Wallet top-up UI, loyalty card, packages, gift card redeem, referral code share.
  - Reels vertical page; Book This Look; Favorites, Following, Collections.
  - Chat list + 1:1 chat with attachments; notification tap deep-link.
  - Notifications list + preferences; theme/language/settings cross-device (syncs via API when logged in).
  - My Bookings tabs + reschedule/cancel.
  - Push notifications dev stub + share intents.
- **Acceptance Criteria Addressed**: AC-R8, AC-R9, AC-R12
- **Test Requirements**:
  - `rule` TR-16.1: Widget tests pass for 10 critical flows (splash→login→home→booking, etc.)
  - `rule` TR-16.2: Arabic RTL layout correct; language switcher flips direction
  - `rule` TR-16.3: Offline cached list skeleton shows during no-network (local fallback list or error)
  - `rubric` TR-16.4: Feature parity with customer-web; scale 1-5; threshold >= 4

## Task 17: Flutter Business Mobile full feature set (calendar, floor, clients, staff, services, payouts, notifications)
- **Status**: `pending`
- **Priority**: high
- **Depends On**: Task 3, 4, 7, 8, 14 (use same API)
- **Description**:
  - Calendar 6 view responsive with mobile defaults (day/today view + switcher).
  - Floor board compact mobile view with status chips.
  - CRM client list, client detail + notes + history.
  - Staff roster view; schedule quick edits; professional commissions snapshot row.
  - Services list + quick-edit price/duration; toggle active.
  - Payouts summary + history; Bank accounts.
  - Notifications.
  - Theme/language switches.
- **Acceptance Criteria Addressed**: AC-R8, AC-R9, AC-R12
- **Test Requirements**:
  - `rule` TR-17.1: Widget tests pass for 8 critical flows
  - `rule` TR-17.2: Calendar list pulls real data from seeded API; filter by pro works
  - `rubric` TR-17.3: Feature parity with business-web; scale 1-5; threshold >= 4

## Task 18: Full test matrix + CI/CD + Observability wiring
- **Status**: `pending`
- **Priority**: high
- **Depends On**: Task 1–Task 17
- **Description**:
  - Add unit, integration, API, DB, permissions, concurrency §211, resources, payment, finance reconciliation §209, i18n, React, Flutter (where SDK), nearby §213, queue §215, group booking §214, multi-currency §216, performance (k6 or autocannon dev file) tests.
  - Vitest configs + Jest flutter + Playwright E2E §212 customer flow.
  - Test DB setup, Testcontainers where applicable or env-switch for speed.
  - Root `scripts/ci.mjs` or GitHub Actions `.github/workflows/ci.yml`: lint → typecheck → unit → int → build → flutter checks (conditional).
  - Observability: NestJS pino-http structured JSON + correlation IDs + OTel exporter env config + crash reporter abstraction.
- **Acceptance Criteria Addressed**: AC-R7, AC-R13, AC-R12
- **Test Requirements**:
  - `rule` TR-18.1: `pnpm test:all` exits 0 locally; >= 200 passing tests
  - `rule` TR-18.2: §209, §211, §212, §213, §214, §215, §216 automated tests all passing in suite
  - `rule` TR-18.3: CI workflow YAML parses valid (`act` or `yamllint`).
  - `rubric` TR-18.4: Test balance; scale 1-5; 1 = smoke only; 5 = pyramid (heavy unit, mid int, thin E2E); threshold >= 4

## Task 19: Final verification pass — lint, typecheck, build, migrations, README completeness
- **Status**: `pending`
- **Priority**: high
- **Depends On**: Task 1–Task 18
- **Description**:
  - Final audit of controllers/services/pages. `pnpm lint`, `pnpm typecheck`, `pnpm build` all green.
  - README / DEVELOPER.md updates documenting new env vars, new apps, test commands, provider activation steps (no new files unless explicitly needed).
  - Prisma seed still runs idempotently against fresh DB.
  - Any outstanding GetDiagnostics fixes.
- **Acceptance Criteria Addressed**: AC-R12
- **Test Requirements**:
  - `rule` TR-19.1: `pnpm lint` exit 0
  - `rule` TR-19.2: `pnpm typecheck` exit 0
  - `rule` TR-19.3: `pnpm build` exit 0 for packages + api + customer-web + business-web + admin-web
  - `rubric` TR-19.4: Developer docs realism; scale 1-5; threshold >= 4
