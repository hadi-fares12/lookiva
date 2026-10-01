# LOOKIVA — Complete Missing Deliverables & Fix Audit Issues

## Overview
- **Summary**: Implement all incomplete items and fix the 3 critical constraint violations identified in the 27-item audit (2026-09-29). External production credentials (Stripe/Tap/Google OAuth/Apple OAuth/SMS/WhatsApp/Map API keys/FCM/APNs) are EXCLUDED — user will add those separately after this work completes.
- **Purpose**: Upgrade project from "6 complete / 14 partial / 7 incomplete" to "27 complete / 0 partial / 0 incomplete" on the 27-item report, subject to the explicit external-credential exclusion.
- **Target Users**: Developers running local dev, QA verifying feature completeness against requirement.txt, and the user deploying to Ubuntu staging.

## Goals
- Fix 3 critical constraint violations: (a) customer-mobile shared_preferences → `cust_*` prefix rename to prevent state leakage, (b) demo-business seed rename "Hamra Main" → "Hazmieh Main" per requirement.txt mandate, (c) align profile memory note with PostgreSQL+PostGIS (schema does not change — only environment profile narrative clarification)
- Reduce 7 ❌ Incomplete items (Business Web Dashboard, Admin Web, Realtime/WebSockets, Tests, CI/CD, Hardening+Backups, DoD 20-criteria) to 0 ❌ by adding shell implementation, tests, pipelines, and documentation
- Upgrade 14 🟨 Partial items → ✅ or 🟨 with evidence of real API wiring, state coverage, and test passes for each module
- Zero regressions to existing passing items (6 ✅) and 5 memory-constrained SocialService patterns

## Non-Goals
- Do NOT add real production payment provider SDK calls, real SMS/WhatsApp billing APIs, or real OAuth production secrets (user explicitly defers external credentials)
- Do NOT generate real test-payment Stripe/Tap keys or real Google/Apple OAuth production client IDs
- Do NOT replace PostgreSQL with MySQL — memory profile contradiction is a narrative clarification only, NOT a schema rewrite
- Do NOT produce 500+ pixel-perfect production UI screens — provide production-ready page shells with real backend data wiring, state handling (loading/empty/error/retry/permission-denied), i18n keys, responsive layouts, and auth guards
- Do NOT deploy to production — local build pass + unit tests pass is acceptable bar per user's local Windows/Ubuntu staging scope
- Do NOT write E2E Playwright/Cypress scenarios requiring a running browser farm — write backend unit tests, NestJS e2e tests, Flutter widget tests, and Vitest component tests that pass without real browser orchestration

## Background & Context
Audit (2026-09-29, 27-Item Report, 4516-line requirement.txt):
- ✅ 6: Monorepo, Docker+PostGIS+Redis+MinIO, Setup, DB Schema (~110 models), RBAC (15 roles/128 perms), Themes
- 🟨 14: Seeds, Auth, i18n, Customer Mobile, Customer Web, Business Mobile, Booking Engine, Social, Trust/Reviews, Payments, Retention, Advanced Business, Analytics, Observability
- ❌ 7: Business Web pages, Admin pages, Realtime WS, Tests 0 files, CI/CD 0 workflows, Hardening+Backups, DoD
- CRITICAL violations:
  (1) apps/customer-mobile/lib/main.dart shared_preferences uses NO `cust_*` prefix → state leakage risk
  (2) apps/api/prisma/seed/demo-businesses.ts L185 branch slug `hamra-main` / name `Hamra Main` → requirement.txt specifies Hazmieh
  (3) Memory profile says "MySQL persistence" — but schema.prisma datasource uses `provider = "postgresql"` with postgis; docker-compose uses postgis/postgis; contradiction to be documented as PostgreSQL=truth
- Verified memory constraints already correctly implemented in SocialService (5 patterns all pass: media_list/author/parent_comment_id/$transaction likes/$transaction comments)
- Verified SplashScreen constraint: initState+Timer+context.go in both Flutters (infinite spinner prevention)
- Verified Business Dashboard 8-metric grid, NavigationRail ≥720px / NavigationBar <720px responsive
- Flutter pubspec current: flutter_localizations, shared_preferences, provider, go_router, dio, intl (missing cached_network_image, video_player, map, socket_io_client, flutter_secure_storage)

## Functional Requirements
**FR-1 — Critical Constraints Fixes**:
  - FR-1.1 Rename all customer-mobile shared_preferences keys: `theme_mode`→`cust_theme_mode`, `locale_code`→`cust_locale_code`, `onboarding_seen`→`cust_onboarding_seen`, `auth_access_token`→`cust_auth_access_token`
  - FR-1.2 Rename demo-businesses seed branch: name `Hamra Main`→`Hazmieh Main`, slug `hamra-main`→`hazmieh-main`, correct lat/lon to Hazmieh zone
  - FR-1.3 Add internal doc comment/note in .env.example header + root package.json engines clarifying PostgreSQL+PostGIS as canonical DB engine

**FR-2 — Tests (0 → ≥ 60 passing test files)**:
  - FR-2.1 NestJS unit tests for: auth/guard, social.service (likes transaction, comments, field naming), booking-v2.service (Serializable, hold, conflict), health.controller, media module, notifications
  - FR-2.2 Vitest tests for customer-web home page state transitions, business-web login, admin-web login
  - FR-2.3 Flutter widget tests for both apps: Splash navigation, Theme switching, Locale switching, Business dashboard 8-metric grid renders responsive
  - FR-2.4 DB integrity test: schema.prisma all 80+ required model names exist (test enumerates required list vs actual model declarations)
  - FR-2.5 Permission enumeration test: 128+ PermissionKey values exist in @lookiva/shared-types enum + matches PERMISSION_DEFINITIONS.length

**FR-3 — CI/CD GitHub Workflows (0 → ≥ 4 workflows)**:
  - FR-3.1 `ci.yml`: pnpm install, lint, typecheck, backend unit tests, web tests, migration validate (prisma validate), Flutter analyze
  - FR-3.2 `prisma-migrate-check.yml`: prisma migrate diff, schema validate, seed typescript compile
  - FR-3.3 `build.yml`: production build api, customer-web, business-web, admin-web; Flutter build apk/web placeholder
  - FR-3.4 `security.yml`: npm audit non-blocking high-only, ESLint security rules, Secret Scanning pattern match (blocklist credential patterns with placeholder allow-list for dev)

**FR-4 — Realtime WebSockets / Socket.IO Gateways**:
  - FR-4.1 `apps/api/src/realtime/realtime.module.ts` + `apps/api/src/realtime/chat.gateway.ts`: room scoped conversation_id, presence join/leave, typing indicator
  - FR-4.2 `apps/api/src/realtime/bookings.gateway.ts`: company_id/branch_id rooms — appointment created/updated/cancelled + hold-expired broadcast
  - FR-4.3 `apps/api/src/realtime/notifications.gateway.ts`: per-recipient user_id room — delivery status + badge count
  - FR-4.4 `apps/api/src/realtime/floor.gateway.ts`: branch_id room — chair state, resource blocks, queue position
  - FR-4.5 `apps/api/src/realtime/queue.gateway.ts`: branch_id room — queue_entries position broadcast
  - FR-4.6 Add socket.io-client to both Flutter pubspecs and import+stub connection in both main.dart
  - FR-4.7 BullMQ wiring: workers app wires Queue objects for analytics/email/media/notification with repeatable jobs scaffolding

**FR-5 — Business Web Dashboard (2 pages → 12 pages)**:
  - FR-5.1 Add app/[locale]/(dashboard)/calendar/page.tsx — skeleton, empty, error, real bookings list fetch wired
  - FR-5.2 Add app/[locale]/(dashboard)/floor/page.tsx — chair grid with BranchId context, socket subscription placeholders
  - FR-5.3 Add app/[locale]/(dashboard)/clients/page.tsx — searchable customers table with actions
  - FR-5.4 Add app/[locale]/(dashboard)/services/page.tsx — services list, add/edit form shell
  - FR-5.5 Add app/[locale]/(dashboard)/staff/page.tsx — pros management table, add/edit shell
  - FR-5.6 Add app/[locale]/(dashboard)/resources/page.tsx — chairs/resources grid
  - FR-5.7 Add app/[locale]/(dashboard)/queue/page.tsx — queue entries with position
  - FR-5.8 Add app/[locale]/(dashboard)/bookings/[id]/page.tsx — dynamic booking detail, payment actions
  - FR-5.9 Add app/[locale]/(dashboard)/finance/page.tsx — today/week/month KPIs skeleton
  - FR-5.10 Add app/[locale]/(dashboard)/reviews/page.tsx — reviews with reply
  - FR-5.11 Add app/[locale]/(dashboard)/onboarding/page.tsx — 14-step wizard shell with step state
  - FR-5.12 Add sidebar nav with all 10+ items in business-web layout

**FR-6 — Admin Web (2 pages → 11 pages)**:
  - FR-6.1 app/[locale]/(admin)/users/page.tsx — users table search/filter
  - FR-6.2 app/[locale]/(admin)/businesses/page.tsx — businesses approval queue table
  - FR-6.3 app/[locale]/(admin)/bookings/page.tsx — global bookings table with status filter
  - FR-6.4 app/[locale]/(admin)/moderation/page.tsx — posts/reviews moderation queue
  - FR-6.5 app/[locale]/(admin)/categories/page.tsx — service categories CRUD shell
  - FR-6.6 app/[locale]/(admin)/geo/page.tsx — countries/regions/cities/areas table
  - FR-6.7 app/[locale]/(admin)/themes/page.tsx — theme settings editor shell
  - FR-6.8 app/[locale]/(admin)/plans/page.tsx — subscription plans grid
  - FR-6.9 app/[locale]/(admin)/features/page.tsx — feature flags toggle shell
  - FR-6.10 app/[locale]/(admin)/support/page.tsx — support tickets table
  - FR-6.11 Add sidebar navigation shell in admin layout

**FR-7 — Customer Mobile Flutter Structural Page Shells (4 routes → 18 routes with GoRouter)**:
  - FR-7.1 Split customer-mobile main.dart into lib/ structure: main.dart, router.dart, theme.dart, app.dart
  - FR-7.2 Create lib/screens/: splash, onboarding, register, language, location_permission, nearby_optin, home (tabs: marketplace/discover/map/bookings/profile), booking/flow, booking/detail, bookings/list, qr_checkin, waitlist, chat/list, chat/room, notifications, favorites, collections, reviews, business_profile, pro_profile, service_details
  - FR-7.3 Update pubspec.yaml add: cached_network_image, video_player, flutter_map, socket_io_client, flutter_secure_storage
  - FR-7.4 All state screens use shared Skeleton, EmptyState, NetworkError components with retry

**FR-8 — Business Mobile Flutter Structural Page Shells (4 routes → 14 routes)**:
  - FR-8.1 Split business-mobile main.dart into lib/ structure with GoRouter
  - FR-8.2 Add screens: onboarding_wizard (14-step), dashboard, calendar, floor, queue, clients, services, staff, resources, bookings/[id], finance, reviews, notifications, settings
  - FR-8.3 Update pubspec same deps as customer (cached_network, video, map, socket, flutter_secure_storage)
  - FR-8.4 Persist biz_* prefix on all shared_preferences keys (already correct; verify in split files)

**FR-9 — Customer Web PWA Additional Page Shells (11 → 19)**:
  - FR-9.1 app/[locale]/businesses/[slug]/page.tsx — business profile with tabs
  - FR-9.2 app/[locale]/professionals/[id]/page.tsx — pro profile
  - FR-9.3 app/[locale]/services/[id]/page.tsx — service detail
  - FR-9.4 app/[locale]/book/[businessSlug]/page.tsx — booking wizard shell
  - FR-9.5 app/[locale]/bookings/page.tsx + bookings/[id]/page.tsx
  - FR-9.6 app/[locale]/qr/page.tsx + waitlist/page.tsx + chat/page.tsx + notifications/page.tsx
  - FR-9.7 app/[locale]/favorites/page.tsx + collections/page.tsx + reviews/page.tsx + offers/page.tsx
  - FR-9.8 Each page: loading skeleton, empty, error, retry, auth guards, 3 locale×2 theme responsive

**FR-10 — Observability + Health Checks + Phase-13 Documentation**:
  - FR-10.1 Add correlation-id middleware (request id attach to logger, audit_logs, response header X-Correlation-Id)
  - FR-10.2 Expand health.controller with 11 checks: API, DB (ping), Redis (PING), queues (BullMQ queue status), storage (MinIO bucket list), media-processing, payment integrations (dev provider alive), notification providers (dev email/SMS alive), chat WS, socket server, auth
  - FR-10.3 Add docs/ folder (permitted, since required by requirement.txt §218 backups strategy) with: BACKUPS.md, DB_INDEXES.md, SECURITY_REVIEW.md, PRIVACY_REVIEW.md, CONCURRENCY_REVIEW.md, FINANCIAL_RECONCILIATION.md, PERFORMANCE_REVIEW.md, ACCESSIBILITY_REVIEW.md, RTL_REVIEW.md, THEME_REVIEW.md, MOBILE_REVIEW.md, WEB_REVIEW.md, POOR_NETWORK_TESTING.md — each with baseline sections and current known status so Phase-13 checklist becomes trackable
  - FR-10.4 Environment example .env.example add placeholder blocks for: payment provider vars (STRIPE_*, TAP_*, WALLET_*), SMS provider, WhatsApp Business, FCM/APNs push, flutter maps API keys — all with `REQUIRED_IN_PROD` placeholder values
  - FR-10.5 Health check typespec endpoint /api/health/system returns array of {checkName, status, latencyMs, details}

## Non-Functional Requirements
- **NFR-1 Build Pass**: `pnpm install && pnpm lint && pnpm typecheck && pnpm build` returns exit code 0 (no new TS/ESLint build breakage)
- **NFR-2 Tests Pass**: `pnpm test` returns exit code 0 with ≥60 test cases across all apps/packages
- **NFR-3 Flutter Analyze Pass**: For both apps, `flutter analyze` returns no new issues beyond any existing baseline
- **NFR-4 Social Constraints Preserved**: After all edits, SocialService still uses `media_list`, `author` relation, `parent_comment_id`, `$transaction` on like/comment counters — NEVER allow regression to `media`, `author_user`, `parent_id`, or non-transactional counter updates
- **NFR-5 Splash Timer Preserved**: After split/lib refactor, both mobile apps SplashScreen STILL uses StatefulWidget `initState() → Timer(milliseconds: 1800) → context.go(route)` — NEVER trigger navigation from build() method (prevents infinite spinner)
- **NFR-6 Business Dashboard Metric Grid Preserved**: Responsive NavigationRail ≥720px / NavigationBar <720px, exact 8 Today metric tiles (Appointments/Confirmed/Completed/Booked/Collected/Cash/NoShows/BusiestPro)
- **NFR-7 Customer Prefix Isolation**: After rename, NO string literals `'theme_mode'`/`'locale_code'`/`'onboarding_seen'`/`'auth_access_token'` without `cust_` prefix remain anywhere under `apps/customer-mobile`
- **NFR-8 CI pipeline self-runs**: Workflow YAML files parse valid (yamllint pass equivalent), GitHub Actions syntax valid, required `on: push/pull_request` triggers present
- **NFR-9 Zero hardcoded secrets**: grep for `sk-`/`pk_live_`/real tokens returns 0 matches — all credentials in .env.example are `REQUIRED_IN_PROD` placeholder values

## Constraints
- **Technical**:
  - Node.js ≥ v20, pnpm@9
  - Flutter SDK ≥ 3.19.0
  - Next.js 15+ App Router with [locale] dynamic routing (customer-web/business-web/admin-web i18n already)
  - NestJS 10+ REST + Gateways
  - Prisma ≥5 (postgresql + PostGIS, Serializable isolation already present)
  - BullMQ for workers, Socket.IO 4.x for WS
  - Shared-types package as single source of truth for PermissionKey/UserRole/ScopeType enums
  - Theme colors locked: Midnight Gold (#080808/#101010/#151515 + #D4AF37 gold), Silver Light (auto white)
  - GoRouter for Flutter, `NavigationBar` <720px, `NavigationRail` ≥720px
- **Business**:
  - Lebanon initial market still default (BEIRUT_LAT/LON 33.8950/35.4780 acceptable for web home fallback — fix branch seed only)
  - Currencies: USD primary, LBP and EUR supported via exchange_rate_snapshots
  - 3 languages EN/AR/FR (AR full RTL)
- **Dependencies**:
  - Docker Compose 3 services already present — no infra removal
  - Existing migrations 0001_init + 0002_remaining_models immutable — add new migrations only if schema changes (none planned here, only code changes)

## Assumptions
- User confirms: local environment has Node 20+, pnpm@9, Flutter ≥3.19.0, Docker Desktop with Compose v2 available
- No Prisma schema migration runs are required for this work item (tests use schema introspection without DB modifications for FR-2.4, FR-2.5)
- pnpm node_modules are already installed or will be installed as part of verification commands
- External credentials (user's responsibility later) will be placed into `.env.server` on Ubuntu production (per user profile); `.env.example` receives placeholders only
- "DoD 20-criteria per page" is interpreted achievable for the new shell pages: UI + migration exists + auth guard + validation types + real API wiring stubs + 4 states covered + 3 lang × 2 theme × responsive skeleton + component tests exist + build passes + no TODOs = criteria met

## Acceptance Criteria

### AC-1: Customer-mobile shared_preferences cust_* prefix isolation
- **Type**: `rule`
- **Given**: The customer-mobile Flutter app source code under apps/customer-mobile
- **When**: grep recursively for any shared_preferences access using the bare unprefixed keys `'theme_mode' | 'locale_code' | 'onboarding_seen' | 'auth_access_token'`
- **Then**: Zero matches; every string literal shared_preferences key has `cust_` prefix; business-mobile retains `biz_` prefix
- **Pass Condition**: `rg "'theme_mode'|'locale_code'|'onboarding_seen'|'auth_access_token'" apps/customer-mobile --count-matches` returns 0 matches; `rg "'cust_"' apps/customer-mobile` returns ≥4 matches
- **Evidence**: Shell command output (ripgrep)

### AC-2: Demo business branch name Hazmieh matches requirement.txt
- **Type**: `rule`
- **Given**: apps/api/prisma/seed/demo-businesses.ts content
- **When**: Search for the string `Hamra Main` or `hamra-main` slug used as Hadi Barber branch
- **Then**: Hadi Barber's main branch display name == "Hazmieh Main", slug == "hazmieh-main", and geo references Hazmieh area lookup when available
- **Pass Condition**: Content grep for `Hamra Main` in demo-businesses.ts returns 0 matches; content grep for `Hazmieh Main` returns ≥1 match; slug string `hazmieh-main` ≥1 match
- **Evidence**: ripgrep output on demo-businesses.ts

### AC-3: DB engine narrative aligned (PostgreSQL+PostGIS = canonical truth)
- **Type**: `rule`
- **Given**: .env.example header and package.json engines comment
- **When**: Search in root repo artifacts for explicit canonical DB engine declaration
- **Then**: .env.example header comment block says "LOOKIVA uses PostgreSQL 16+ with PostGIS extension (NOT MySQL)"; any environment profile reference to MySQL is historical staging note only
- **Pass Condition**: grep lines in .env.example L1-10 header includes string "PostgreSQL 16+ with PostGIS"
- **Evidence**: .env.example L1-20 lines output

### AC-4: ≥60 tests exist and pass
- **Type**: `rule`
- **Given**: Clean pnpm install
- **When**: Execute `pnpm test` from repo root
- **Then**: Tests run successfully with exit code 0 and total passed tests ≥ 60 (at least: backend ≥ 40, web ≥ 6, Flutter widget ≥ 10, schema/permission enum ≥ 4)
- **Pass Condition**: Terminal command exit code 0; last line summary passed count ≥ 60
- **Evidence**: `pnpm test` console output last 30 lines

### AC-5: 4 CI/CD workflow YAML files exist with valid push/pull triggers
- **Type**: `rule`
- **Given**: .github/workflows directory
- **When**: Enumerate yaml files + validate each has `on:` block referencing `push` or `pull_request`
- **Then**: Exactly 4 workflow files (ci.yml, prisma-migrate-check.yml, build.yml, security.yml); each file parses with at least one Job containing steps referencing pnpm or flutter commands
- **Pass Condition**: `Get-ChildItem .github/workflows -Recurse -File` returns 4 *.yml files; each file contains both "jobs:" and "on:"
- **Evidence**: Directory listing + yq/powershell yaml header extracts

### AC-6: Socket.IO gateways exist for 5 realtime domains + workers BullMQ queue wiring + both Flutters add socket client dep
- **Type**: `rule`
- **Given**: apps/api/src/realtime/ and apps/workers/src/ and pubspecs
- **When**: Enumerate gateway files, check workers Queue instantiation, check pubspec socket_io_client present in both Flutter apps
- **Then**: 5 gateway files (chat, bookings, notifications, floor, queue); realtime.module.ts exists; workers exports 4 BullMQ Queue objects; socket_io_client dep line present ≥ 2 pubspecs
- **Pass Condition**: Glob patterns `**/realtime/*.gateway.ts` count ≥5; apps/workers/src contains Queue class import/usage; `rg socket_io_client apps/*mobile/pubspec.yaml` 2 matches
- **Evidence**: Glob lists + source grep output

### AC-7: Business Web Dashboard ≥ 12 pages with state shells
- **Type**: `rule`
- **Given**: apps/business-web/app/ directory tree
- **When**: Count page.tsx files under [locale] excluding login
- **Then**: dashboard shell, calendar, floor, clients, services, staff, resources, queue, bookings/[id] dynamic, finance, reviews, onboarding wizard = ≥ 12 distinct pages
- **Pass Condition**: `Get-ChildItem apps/business-web/app -Recurse -Filter "page.tsx"` count ≥ 13 (login + 12)
- **Evidence**: Dir listing of page.tsx files

### AC-8: Admin Web Dashboard ≥ 11 pages
- **Type**: `rule`
- **Given**: apps/admin-web/app/ directory
- **When**: Count distinct page.tsx under [locale] minus login
- **Then**: dashboard shell, users, businesses, bookings, moderation, categories, geo, themes, plans, features, support = ≥ 11 pages
- **Pass Condition**: `Get-ChildItem apps/admin-web/app -Recurse -Filter "page.tsx"` count ≥ 12 (login + 11)
- **Evidence**: Dir listing

### AC-9: Customer Mobile ≥ 18 routes after split
- **Type**: `rule`
- **Given**: apps/customer-mobile/lib/ structure and router file
- **When**: Enumerate GoRouter routes list in router.dart
- **Then**: Route list includes splash + onboarding + register + language + location_permission + nearby_optin + home (with 5 child tabs) + booking_flow + booking_detail + bookings_list + qr_checkin + waitlist + chat_list + chat_room + notifications + favorites + collections + reviews + business_profile + pro_profile + service_details = ≥ 18 defined GoRoute entries
- **Pass Condition**: Code inspection of router.dart `routes:[...]` array length >= 18
- **Evidence**: Read router.dart routes array lines count

### AC-10: Customer Web PWA ≥ 19 distinct pages with state handling
- **Type**: `rule`
- **Given**: apps/customer-web/app/ directory
- **When**: Count page.tsx files
- **Then**: Existing 11 + new businesses/[slug], professionals/[id], services/[id], book/[businessSlug], bookings, bookings/[id], qr, waitlist, chat, notifications, favorites, collections, reviews, offers = ≥ 19
- **Pass Condition**: `Get-ChildItem apps/customer-web/app -Recurse -Filter "page.tsx"` count ≥ 19
- **Evidence**: Dir listing output

### AC-11: Observability: correlation-id middleware, 11+ health checks, 13 Phase-13 docs files, and .env.example expanded credential placeholders
- **Type**: `rule`
- **Given**: apps/api/src/common/middleware/ + health.controller + docs/ dir + .env.example
- **When**: Grep for middleware use, health check function count, docs markdown files list, placeholder credential env lines
- **Then**: (a) correlation-id middleware present AND globally mounted; (b) health.controller checks count >= 11 named checks; (c) docs/ directory 13 .md files for Phase 13 checklist; (d) .env.example contains placeholder block comments for payment + SMS + WhatsApp + FCM/APNs + maps
- **Pass Condition**: (a) middleware file exists + app.module applies; (b) health.controller defined check names array length >= 11; (c) docs/*.md file count >= 13; (d) rg "REQUIRED_IN_PROD" .env.example >= 5 matches
- **Evidence**: File listings + grep excerpts

### AC-12: Social service 5 memory constraints preserved (no regression)
- **Type**: `rule`
- **Given**: apps/api/src/social/social.service.ts
- **When**: Grep for field/relation names and $transaction blocks on like/comment endpoints
- **Then**: Line `media_list:` present in post includes (NOT "media"), `author:` present (NOT "author_user"), `parent_comment_id` present (NOT "parent_id"), likeToggle uses `$transaction([upsert, increment/decrement])`, comment create uses `$transaction([create, increment])`
- **Pass Condition**: `rg "media_list" apps/api/src/social/social.service.ts` ≥ 1 match; `rg "media:"` absent; same check for author vs author_user; parent_comment_id vs parent_id; 2 $transaction blocks
- **Evidence**: ripgrep output with counts

### AC-13: Splash Timer navigation preserved in both split Flutters
- **Type**: `rule`
- **Given**: Customer and business mobile splash screens after lib split
- **When**: Inspect Splash widget class
- **Then**: Both Splash widgets are StatefulWidgets with `initState()` overrides that create a Timer(1800ms) then call `context.go(route)`; no navigation call present in build() body
- **Pass Condition**: `rg "initState" apps/customer-mobile/lib/screens/splash` 1 match; `rg "Timer.*1800"` same file 1 match; `rg "context.go"` same 1 match; `rg "context.go" build` 0 matches. Identical for business.
- **Evidence**: Source line matches + code reads

### AC-14: Business Dashboard 8-metric grid + responsive nav preserved
- **Type**: `rule`
- **Given**: business-mobile dashboard screen files
- **When**: Inspect dashboard shell source
- **Then**: 8 metric labels exactly match set {Appointments, Confirmed, Completed, Booked, Collected, Cash, NoShows, BusiestPro}; responsive layout uses `width >= 720` to switch NavigationRail vs NavigationBar
- **Pass Condition**: `rg "Appointments|Confirmed|Completed|Booked|Collected|Cash|NoShows|BusiestPro"` dashboard_screen.dart returns exact 8 matches; `rg "width >= 720"` >= 1 match
- **Evidence**: grep counts

### AC-15: Build + lint + typecheck pass with exit 0
- **Type**: `rule`
- **Given**: Fresh pnpm install
- **When**: Run sequentially `pnpm lint` then `pnpm typecheck` then `pnpm build`
- **Then**: Each command exits with code 0
- **Pass Condition**: All three commands terminate with $LASTEXITCODE -eq 0
- **Evidence**: Combined command output tail

### AC-16: Widget and unit test pass count
- **Type**: `rule`
- **Given**: Flutter SDK installed
- **When**: For each mobile app run `flutter test`
- **Then**: Each app returns exit 0 + tests executed >= 5 (combined >= 10 as also AC-4)
- **Pass Condition**: flutter test exit 0 for both apps
- **Evidence**: flutter test output summary lines

### AC-17: Flutter analyze clean across both apps after pubspec changes
- **Type**: `rubric`
- **Dimension**: Static analysis warnings/issues density after split+dep-add
- **Scale**: 1-5
- **Anchors**: 1 = 20+ new analyzer issues introduced; 3 = <10 new issues but no errors; 5 = no new errors, no new warnings, code follows flutter_lints clean
- **Pass Threshold**: >= 4
- **Evidence**: `flutter analyze` for both apps combined output (error/warning/info counts)

### AC-18: Global Page Quality Rule (17-state) coverage across all new shell pages
- **Type**: `rubric`
- **Dimension**: State-handling coverage across the set {loading, empty, error, retry, permission denied, no network} for all new shell pages
- **Scale**: 1-5
- **Anchors**: 1 = <20% of pages have skeleton+empty+error states; 3 = 50% have skeleton, some empty/error; 5 = every new shell page imports/shared uses skeleton, empty state, error+retry button, auth guard redirect when unauthenticated
- **Pass Threshold**: >= 4
- **Evidence**: Random sample 6 new page.tsx files per web app (customer/business/admin) inspect imports of Skeleton|EmptyState|ErrorBoundary components and use in JSX tree; sample 6 mobile screen files check Skeleton/Empty/Error component imports present

### AC-19: Socket room isolation scopes (per user, branch, company, conversation) observable
- **Type**: `rubric`
- **Dimension**: Gateway room-join isolation correctness
- **Scale**: 1-5
- **Anchors**: 1 = no distinct rooms (global broadcasts only); 3 = some rooms but missing user-to-user DM isolation; 5 = 5 gateways each define distinct rooms per scope (chat: per conversation_id + presence user_id; bookings: per company_id + per branch_id; notifications per user_id; floor/queue per branch_id), guards match JWT auth scope
- **Pass Threshold**: >= 4
- **Evidence**: Source read of each gateway handleConnection / handleJoinRoom with room string patterns and @UseGuards(JwtAuthGuard) decorator presence

## Open Questions
- [ ] None. User explicitly deferred all external credentials (said "external later i will add it"), so no ambiguity remains on scope boundaries
