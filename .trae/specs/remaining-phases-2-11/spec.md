# LOOKIVA Platform - Product Requirements Document (Phases 2–11 + Appendices 200–218)

## Overview
- **Summary**: Complete all remaining work in `requirement.txt` beyond the Phase 0-1 foundation. This deliverable implements the full product suite: booking engine, financial ledgers, wallet/loyalty/packages/memberships, social & media (Reels feed, follows, Book This Look, Verified Work), full business operations (calendar/floor board/CRM/staff), admin web CRUDs, customer + business mobile full-feature Flutter apps, customer/business/admin web full pages, AI search, moderation, near-by geofencing, complete multi-currency/payment/tax/commission engine, the full test matrix, CI, and observability.
- **Purpose**: Bring the entire 4320-line master spec to a passing build with all required feature slices implemented, type-checked, linted, and independently reviewed.
- **Target Users**: Customers (web + mobile), salon pros/owners/managers/receptionists (business web + mobile), platform admins/super admins, moderators, support agents, QA, developers.

## Goals
1. **Data completeness**: Migrations/models exist for every entity listed in requirement §203 (Required Models) and §204 (Required Database Indexes).
2. **API completeness**: NestJS REST modules exist with RBAC, Swagger, and i18n for Booking, Calendar, Payments, Finance, Wallet, Loyalty, Packages, Memberships, Promotions, Gift Cards, Referrals, Inventory, Reviews, Social (full), Notifications, Chat/Realtime, Admin CRUDs, Moderation, Support, AI, Nearby/Geofence, Analytics, Workers, Media v2, Audit.
3. **Customer Web fullness**: Every Phase 2-11 customer flow page exists: Bookings (6-step + holds/deposit), Book This Look from Reels, Wallet/Loyalty, My Reels/Favorites/Following, Notifications, QR Check-in, Chat, Settings, Security, Help.
4. **Business Web fullness**: 6-view Calendar, Floor Board, CRM, Services CRUD, Staff CRUD, Products/Inventory, Promotions/Loyalty/Packages/Gift Cards, Forms builder, Reports/Finance Dashboard, Staff permissions, Settings, Accountants, Branches, Professional onboarding, Bank Accounts, Payouts.
5. **Admin Web fullness**: All 16 CRUDs (§87-211 list): Users/Businesses/Branches/Professionals/Services/Categories/Countries/Regions/Languages/Currencies/Themes/Plans/Feature Flags/Payments/Bookings/Moderation + Audit Log viewer + Manual Actions.
6. **Flutter Mobile completeness**: Customer app has all full booking/chat/wallet/reels/notifications flows; Business app has calendar/floor/clients/staff/services/settings/payouts flows.
7. **Finance correctness**: `Booked/Completed/Collected/Cash/Outstanding` reconcile exactly per §209 example test; multi-currency LBP/USD per §216 never mixes raw values; commission splits, tax engine, ledger immutable rows.
8. **Concurrency safety**: Double-book §211 returns exactly one success + clear conflict; row-level locks or unique constraints used.
9. **Nearby/Geofence §64-83**: Smart discovery + dynamic geofences + 30min cooldown + quiet hours + relevance scoring + deep links.
10. **Test matrix §210-216**: Unit, integration, API, DB, permissions, concurrency, resources, payment, financial reconciliation, i18n, Flutter, React, E2E, nearby, queue, performance test suites wired + run passing.
11. **Phase 10 compliance/GDPR**: Cookie banners, access/deletion requests, retention.
12. **CI/CD §217 + Observability §218**.

## Non-Goals
1. Production cloud deployment (build Dockerfiles + CI workflows; actual deploy user-operated).
2. Live production secrets (provider abstractions + dev/test impls + `.env.example` placeholders only, per §30-48).
3. Paid third-party SaaS keys activation (Mapbox paid tiles, Stripe live mode, Google/Apple OAuth live, Twilio, WhatsApp, FCM prod creds — provider abstractions with dev stubs only).
4. Full model training for AI (embeddings dev mode using local TF-IDF; OpenAI placeholders).

## Background & Context
- Existing Phase 0-1 artifacts: [spec.md (Phase 0-1)](file:///C:/Users/USER/Desktop/LOOKIVA/.trae/specs/spec.md), [tasks.md (Phase 0-1)](file:///C:/Users/USER/Desktop/LOOKIVA/.trae/specs/tasks.md), plus recent 5-task patch set (Flutter splash lifecycles, social.service Prisma fixes, social.controller decorators).
- Master spec source: [requirement.txt](file:///C:/Users/USER/Desktop/LOOKIVA/requirement.txt) (4320 lines, §1–§218).
- Master schema target list: §203 Required Models (~180 entities). Index targets: §204.
- The 5 recent patch tasks are NOT a full Phase 0-1 completion; Tasks 3–24 in the existing Phase 0-1 tasks.md remain pending. This PRD therefore **subsumes remaining Phase 0-1 work into Phase 2-11 delivery as dependency prerequisites so nothing is orphaned**.

## Functional Requirements
(Grouped by phase; for full line-item wording see requirement.txt.)

### Data & API (vertical foundation)
- **FR-2.1**: Prisma migrations for all §203 entities; §204 indexes applied (GIST, composite, unique, partial).
- **FR-2.2**: Phase 2 booking engine: availability search (multi-pro + chair), holds (5min/extend), concurrency DB guards, create/update/cancel booking, reschedule, QR check-in, walk-ins, waiting queue, group booking (§214).
- **FR-2.3**: Phase 3 Calendar 6 views (Day/Week/2-Week/Month/List/4-Day) + drag-drop; Floor Board live chair/staff map.
- **FR-2.4**: Phase 5 finance: ledger, deposits, payment splits, multi-currency §216, tax engine, commissions, payout batches, ledger immutable.
- **FR-2.5**: Phase 6 payments: provider abstraction (stripe/cash/wallet/card-terminal) + tokenization dev stub + refunds + voids.
- **FR-2.6**: Wallet/Loyalty/Packages/Memberships/Gift Cards/Referrals full APIs + points engine.
- **FR-2.7**: Phase 4 social full: Reels feed (paginated), follows/unfollow/followers, Book This Look deep-link, Verified Work badge (booking→review→portfolio link), collections, favorites.
- **FR-2.8**: Phase 9 Moderation: content reports, post/comment/review hide/takedown, user strikes, appeal, auto-violation, audit.
- **FR-2.9**: Phase 10 Compliance: consent tracking, cookie banner hooks, SAR endpoints (data export, account deletion w/ scrub).
- **FR-2.10**: Phase 11 Admin: 16 CRUDs + audit log viewer + manual actions + impersonation guard.
- **FR-2.11**: Phase 7 Analytics: dashboard §206 charts + drilldown §207; permissions §208 (owner vs receptionist); reconciliation test §209.
- **FR-2.12**: §200 Media v2 with full BullMQ processing pipeline, CDN routes, abuse throttles.
- **FR-2.13**: §201 Realtime (Socket.IO): chat messages, calendar updates, floor board pushes, notifications, typing.
- **FR-2.14**: §202 Background Jobs (BullMQ): analytics/email/media/notification/report export/payout/SMS/WSPush workers + retry policies + dead-letter.
- **FR-2.15**: §64-83 Nearby smart discovery: relevance = f(distance, availability, chair, follow, rating, cooldown, quiet hours); deep links + server availability check; §213 E2E scenarios.
- **FR-2.16**: Phase 8 CRM/Staff/Services/Promotions/Inventory API.
- **FR-2.17**: Phase 12 AI placeholders (NL search, image search, recommendations, chat assistant).
- **FR-2.18**: Audit logging on every mutation §11 (audit_logs rows).
- **FR-2.19**: Permissions: every non-public endpoint has `@RequirePermissions` + correct scopes; roles seed full permission matrix.

### Customer Web (Next.js)
- **FR-2.20**: Full bookings flow (6 steps + create hold + pay deposit + confirm + reminders).
- **FR-2.21**: Book This Look from Reel/post page, deep linking.
- **FR-2.22**: Wallet, Loyalty, Packages/Memberships, Gift Cards, Referral pages.
- **FR-2.23**: My Bookings list (upcoming/history/waitlist/cancelled), reschedule/cancel, QR check-in.
- **FR-2.24**: Favorites, Following, Collections, Reels watch page, watch Reels feed.
- **FR-2.25**: Chat list + chat 1:1 with pro/shop, media upload in chat, receipts view, reviews prompt.
- **FR-2.26**: Notifications list, mark-all-read, preferences.
- **FR-2.27**: Settings, Security, Privacy, Help, Delete Account/SAR request, Language/Theme persisted cross-device.
- **FR-2.28**: Skeleton loaders, error boundaries, error states, empty states, responsive.
- **FR-2.29**: Cookie banner + SAR start endpoints (comms).

### Business Web (Next.js)
- **FR-2.30**: Calendar 6 views, drag-drop booking move, quick-add, filter by pro/branch/chair.
- **FR-2.31**: Floor Board: chair map, occupancy, pro status, status updates (Ready/Started/Completed/Paid/Checked-Out).
- **FR-2.32**: Services CRUD with pricing/categories, Service Dependencies, Service Stages.
- **FR-2.33**: Staff directory, roles invite, permission scoping, schedule config, commissions.
- **FR-2.34**: CRM: clients list, filters, view client history, notes, tags, merge duplicate.
- **FR-2.35**: Products/Inventory, stock tracking, stock in/out, low-stock alerts.
- **FR-2.36**: Promotions/Loyalty engine, Packages, Gift Cards issue/redeem.
- **FR-2.37**: Forms builder + Form Templates (consent, intake, COVID).
- **FR-2.38**: Finance Dashboard + Reports with analytics §206 charts, tax reports, payout batches, download CSV/XLSX.
- **FR-2.39**: Accountants, Settings, Branches, Verification upload, Bank accounts, Payout history, withdrawal.
- **FR-2.40**: Walk-in queue, package redemption log.

### Admin Web (Next.js)
- **FR-2.41**: 16 CRUDs: Users, Businesses, Branches, Professionals, Services, Categories, Countries, Regions, Languages, Currencies, Themes, Plans, Feature Flags, Payments, Bookings, Moderation.
- **FR-2.42**: Audit Log viewer with filters (actor, entity, action, date).
- **FR-2.43**: Manual actions: send manual OTP, force reset password, manual refund, toggle business verification, toggle user strikes.
- **FR-2.44**: impersonation with strict permission `admin.impersonate` + audit record.

### Flutter Apps (Customer + Business Mobile)
- **FR-2.45**: Customer Flutter: 6-step booking flow, holds, deposit, QR check-in, notifications, wallet, favorites/following/reels watch/chat/settings.
- **FR-2.46**: Business Flutter: calendar 6 views, floor board snapshot, client CRM, staff schedules, service quick-edit, payouts summary, notifications.
- **FR-2.47**: Offline-first skeleton (cached lists + optimistic UI). Push notifications handler dev stub + deep links + share intent.

### Testing §210-216
- **FR-2.48**: Unit, API, DB, Integration, Resource, Payment, Financial reconciliation, Permissions, i18n, React, Flutter, Nearby/Geofence, Queue, Performance tests.
- **FR-2.49**: §209 analytics reconciliation test automated; §211 concurrency test; §212 customer E2E; §213 nearby E2E; §214 group booking; §215 queue; §216 multi-currency automated.

### CI/CD, Observability §217-218
- **FR-2.50**: GitHub Actions (or generic CI) for lint/typecheck/unit/int/build/flutter-check.
- **FR-2.51**: Structured logs, correlation IDs, traces skeleton, metrics exporters (OpenTelemetry wiring), crash reporting.

## Non-Functional Requirements
- **NFR-2.1 (Build)**: `pnpm typecheck`, `pnpm lint`, `pnpm build` (web/api/packages) all exit 0; Flutter analyze 0 errors.
- **NFR-2.2 (Performance)**: Booking list endpoints paginated; No N+1 (Prisma includes + batch + Promise.all where needed). Average 95p < 400ms for core endpoints.
- **NFR-2.3 (Security)**: OWASP top 10; SQL injection safe (Prisma parameterized); CSP headers; CSRF; rate limits; upload limits; token scoped; PII scrubbed logs.
- **NFR-2.4 (i18n/RTL)**: All new pages EN/AR/FR; Arabic `dir="rtl"` (web) / Directionality (flutter); Intl date/number/currency with active locale; no visible hard-coded strings.
- **NFR-2.5 (Themes)**: Midnight Gold + Silver Light + Follow System on every new page; gold reserved for CTAs/selected/premium.
- **NFR-2.6 (Geo)**: PostGIS-only distance calculations; GIST used; LB seed respected.
- **NFR-2.7 (Strict TS)**: All new code strict, any cast < 2 per file (exceptions documented).
- **NFR-2.8 (Type contracts)**: `packages/api-contracts` expanded with new request/response types and consumed by all 4 frontends.
- **NFR-2.9 (Accessibility)**: Semantic HTML / Widget semantics; WCAG AA; color contrast.
- **NFR-2.10 (Idempotency)**: Seeds idempotent; migrations additive only; bookings idempotency key.
- **NFR-2.11 (Data Integrity)**: Financial ledger append-only; soft-deletes used for mutations that change owner views; foreign keys preserved.

## Constraints
- **Technical**: Existing stack (NestJS+Prisma+PostGIS+Redis+BullMQ+Next.js+Flutter) extended, no tech changes. Sockets via Socket.IO. Providers always abstractions with dev stub + env switch.
- **Business**: Lebanon first launch but no hard-coding. LBP/USD multi-currency from §216 default enabled for LB country ISO.
- **Dependencies**: Stripe/Google/Apple/Twilio/WhatsApp/MoEngage etc. = `.env.example` placeholders only; dev providers wired by default.
- **External maps**: OSM + MapLibre free tiles only.

## Assumptions
1. All required external credentials remain absent; provider abstractions + DevProviderImpl pattern will be used.
2. Flutter tests/widgets work best in CI where SDK exists; if Flutter SDK unavailable locally, widgets will be validated by structure + `GetDiagnostics` static analyzer.
3. External OAuth (Google, Apple) flow is handled by NestJS passport strategies; no frontend deep integration required beyond buttons + routing.
4. Push notifications are dev stub only; device tokens optional.
5. The full 220+ section scope is bounded by the sections enumerated in §1-§218 of requirement.txt; no features beyond that text.

## Acceptance Criteria

### AC-R1: §203 Required Models + §204 Indexes implemented
- **Type**: `rule`
- **Given**: Fresh DB; latest migrations
- **When**: Deploy all migrations; then run introspection + index enumeration SQL
- **Then**: Every entity listed in §203 exists as a table (or materialized view with migrations); every composite/GIST/unique/partial index from §204 exists and is valid (EXPLAIN-amenable)
- **Pass Condition**: Count of tables (excluding `_prisma_migrations` + PostGIS system) >= 180; §204 checklist verified by grep against SQL output, 0 missing
- **Evidence**: SQL introspection output; `\d+` on 20 sample tables showing expected indexes; EXPLAIN on 5 sample joins using the indexes

### AC-R2: Booking engine + holds + concurrency matches §211
- **Type**: `rule`
- **Given**: Seeded demo business, 1 chair 1 free slot
- **When**: Two requests POST /bookings in the same millisecond create race for identical slot (Hadi + Chair 3, 4:30PM)
- **Then**: Exactly one returns 201; the second returns 409 with `code=SLOT_CONFLICT` and human-readable message; the DB never contains two bookings covering the same pro+chair+overlap
- **Pass Condition**: Automated §211 integration test passes; direct SQL `SELECT COUNT(*) FROM appointments WHERE ...` returns exactly 1 after the race
- **Evidence**: Concurrency test log showing both request IDs and response codes; DB assertion after

### AC-R3: Finance reconciliation matches §209 example
- **Type**: `rule`
- **Given**: Seeded data: Hadi 10 confirmed haircuts $10 each; 0 payments initially
- **When**: Run analytics snapshot initial → receive 7 cash payments → receive remaining 3 cash; GET /analytics/dashboard/business/:id summary each step
- **Then**: Initial: Booked=$100, Collected=$0, Cash=$0, Outstanding=$100; after 7: Completed=$70 (iff completed), Collected=$70, Cash=$70, Outstanding=$30; after all paid: Collected=$100, Cash=$100, Outstanding=$0
- **Pass Condition**: Numbers match exactly at every step; no rounding drift; multi-currency totals kept separate per §216
- **Evidence**: Automated test output §209 passing; JSON response for each stage captured

### AC-R4: Multi-currency LBP/USD never mixes raw totals
- **Type**: `rule`
- **Given**: Payment A=$20 USD, Payment B=2,000,000 LBP (§216)
- **When**: Finance ledger inserts payments; business analytics aggregates totals
- **Then**: Totals separated by currency (`totalsByCurrency[{USD,LBP}]`); optional primary-currency reporting only via stored FX snapshot; `sum(amount_raw)` with mixed currencies never occurs
- **Pass Condition**: Code search for naive aggregate mixing = 0 matches; analytics response shows separate keys; §216 test passes
- **Evidence**: grep for `sum.*amount` without currency grouping returning 0 unsafe uses; analytics JSON sample

### AC-R5: RBAC `analytics.permissions §208` correct
- **Type**: `rule`
- **Given**: Receptionist at Branch A, Owner of both Branch A/B, Customer
- **When**: Each user calls Branch A analytics + Branch B analytics GET
- **Then**: Receptionist A=200 (basic view); Receptionist B=403 (not scoped); Owner A/B both 200; Customer always 403; receptionist response body does NOT include owner-only profit fields
- **Pass Condition**: HTTP status match exactly; response shape difference observable; no naive `role === 'admin'` style guard code
- **Evidence**: 6 HTTP request/response pairs; guard code grep showing 0 naive patterns

### AC-R6: Nearby §64-83 + §213 E2E passes
- **Type**: `rule`
- **Given**: Following = Hadi; user entering Hamra area; Hadi available; chair free; no prior notification today
- **When**: Simulate area enter event → deep-link → shortly re-enter same area (within 30min cooldown)
- **Then**: 1st send: relevance score > threshold, availability check pass, cooldown pass, not quiet hours → push send + deep-link valid; 2nd send: cooldown pass fails → NO duplicate
- **Pass Condition**: Notifications table exactly 1 row; deep-link navigates correctly; quiet-hours override case also unit-tested
- **Evidence**: Automated §213 test output; rows count; notification timestamps

### AC-R7: §210 full test matrix wired + results passing
- **Type**: `rule`
- **Given**: Dependencies installed, DB/Redis/MinIO up
- **When**: `pnpm test:all` or equivalent script runs
- **Then**: Unit, integration, API, DB, permissions, booking concurrency, resources, payments, financial reconciliation, i18n, React, Flutter (where env), nearby, queue, performance tests all pass
- **Pass Condition**: Exit 0; >= 200 passing tests total; 0 skipped reconciliation/concurrency/E2E key tests
- **Evidence**: Test runner summary output per suite

### AC-R8: All 4 frontends implement every required page skeleton + navigation
- **Type**: `rubric`
- **Dimension**: Feature coverage of implemented pages/routes vs spec
- **Scale**: 1-5
- **Anchors**: 1 = scaffolded skeletons only, most flows missing; 3 = 50% page routes wired, heavy placeholders; 4 = every listed FR route exists with real domain objects and navigation between flows; empty/error states; 5 = every route, every section within a page present and interactive
- **Pass Threshold**: >= 4
- **Evidence**: Route registry (flutter: GoRouter routes, web: Next.js app dir) listing vs requirement.txt pages; manual route list checklist

### AC-R9: Theme/i18n parity
- **Type**: `rubric`
- **Dimension**: Theme correctness + i18n RTL in all new pages
- **Scale**: 1-5
- **Anchors**: 1 = hard-coded English and gold used everywhere; 3 = 2 themes exist, many strings hard-coded; 4 = Midnight Gold/Silver Light/Follow System correct + all UI uses i18n keys, Arabic RTL works; 5 = Intl date/number/currency formatters used everywhere, validation messages localized, theme tokens consistent
- **Pass Threshold**: >= 4
- **Evidence**: Screenshots of 5 representative pages in both themes + all 3 languages; grep for hard-coded strings returns < 5 occurrences (excluding comments)

### AC-R10: Admin web 16 CRUDs + audit log viewer + manual actions
- **Type**: `rule`
- **Given**: Admin web authenticated as Super Admin user
- **When**: Open each CRUD page (Users, Businesses, Branches, Professionals, Services, Categories, Countries, Regions, Languages, Currencies, Themes, Plans, Feature Flags, Payments, Bookings, Moderation) + audit log viewer + manual actions
- **Then**: Each page has list view with pagination/filters; create/edit/delete (where applicable) works; audit log viewer searchable; manual actions perform target function and write audit rows
- **Pass Condition**: 16 list endpoints 200; manual actions write audit log; no 500s from empty forms
- **Evidence**: HTTP request/response 2xx for each list page; audit_logs row sample after 3 manual actions

### AC-R11: Workers §202 + Realtime §201 wired
- **Type**: `rule`
- **Given**: Workers package up, Redis/BullMQ reachable
- **When**: Enqueue media job + email job + notification job + analytics job
- **Then**: Each job dequeues, logs start/complete, succeeds; dead-letter queue configured; Socket.IO namespace `chat` and `dashboard` emit test events received by subscribers
- **Pass Condition**: BullMQ queues dashboard shows success counts; socket listeners receive events
- **Evidence**: Worker logs; socket test output

### AC-R12: Lint, typecheck, build clean
- **Type**: `rule`
- **Given**: Fresh `pnpm install`
- **When**: Run `pnpm lint && pnpm typecheck && pnpm build` across all packages/apps
- **Then**: All exit 0; Flutter `flutter analyze` exits with 0 errors (where SDK available)
- **Pass Condition**: Exit code 0 chain
- **Evidence**: Build logs summary; `GetDiagnostics` confirming 0 issues on modified files if compile unavailable

### AC-R13: CI workflow + observability skeleton
- **Type**: `rule`
- **Given**: `.github/workflows/ci.yml` (or equivalent) and OTel wiring
- **When**: CI config parsed + app code inspected
- **Then**: Workflow runs lint/typecheck/tests/build; logs structured JSON with correlation IDs; traces exporter env-wired; crash report provider abstracted
- **Pass Condition**: Workflow YAML parses valid; no raw console.log in prod path; Correlation-ID middleware active
- **Evidence**: CI YAML listing; middlewares reference; log sample JSON line

## Open Questions
- [ ] None at this time — external credentials are universally addressed via provider abstraction + dev stub pattern.
