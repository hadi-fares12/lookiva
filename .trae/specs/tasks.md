# LOOKIVA — Implementation Plan (Complete Missing Deliverables & Fix Audit Issues)

Task ordering: critical hot fixes → scaffolding/tests → feature pages → CI/docs/observability. No concurrent edits to shared files; delegate independent sub-repos concurrently.

## Task 1: Critical constraint fixes (cust_ prefix, Hazmieh rename, PostgreSQL narrative)
- **Status**: `completed`
- **Completion Evidence**:
  - TR-1.1: `rg -e "'theme_mode'|'locale_code'|'onboarding_seen'|'auth_access_token'" apps/customer-mobile --type dart` → 0 matches (all 4 keys now cust_* prefixed)
  - TR-1.2: `rg "'cust_" apps/customer-mobile/lib/main.dart` → 5 matches (theme/locale constants + onboarding/token read + onboarding setter)
  - TR-1.3: `rg "Hamra Main"` in demo-businesses.ts → 0; `rg "Hazmieh Main"` → 4 matches; `rg "hazmieh-main"` → 3 matches; coords 33.8600/35.5750 present; hazmiehArea lookup added
  - TR-1.4: `rg "PostgreSQL 16\+ with PostGIS" .env.example` → 1 match at line 3 header block; HISTORICAL STAGING + CANONICAL DATABASE ENGINE markers present
  - business-mobile verified: 5 `'biz_` matches (theme, locale, onboarding read, token read, onboarding setter) — zero regressions
- **Priority**: high
- **Depends On**: None
- **Description**:
  - 1.1 In `apps/customer-mobile/lib/main.dart`, globally rename shared_preferences keys:
    `'theme_mode'` → `'cust_theme_mode'`,
    `'locale_code'` → `'cust_locale_code'`,
    `'onboarding_seen'` → `'cust_onboarding_seen'`,
    `'auth_access_token'` → `'cust_auth_access_token'`
    (4 string literal renames total; business-mobile biz_* prefix untouched)
  - 1.2 In `apps/api/prisma/seed/demo-businesses.ts`, rename Hadi Barber branch:
    display_name `Hamra Main` → `Hazmieh Main`,
    slug `hamra-main` → `hazmieh-main`,
    correct lat/lon to Hazmieh area (≈33.8600, 35.5750),
    area_id lookup replace Hamra with Hazmieh area when exists or fall back to nearest Mount Lebanon region
  - 1.3 `.env.example`: Add header comment block (lines 1-8) stating canonical DB engine = PostgreSQL 16+ with PostGIS extension. Note: MySQL reference in env memory is historical staging note only. Add similar comment in root `package.json` "engines" note field (or description if engines not in JSON)
- **Acceptance Criteria Addressed**: AC-1, AC-2, AC-3, NFR-4, NFR-7
- **Test Requirements**:
  - `rule` TR-1.1: `rg -e "'theme_mode'|'locale_code'|'onboarding_seen'|'auth_access_token'" apps/customer-mobile --type dart --count-matches` returns 0 matches
  - `rule` TR-1.2: `rg "'cust_"' apps/customer-mobile/lib/main.dart --count-matches` returns ≥ 4 matches
  - `rule` TR-1.3: `rg "Hamra Main" apps/api/prisma/seed/demo-businesses.ts` returns 0 matches; `rg "Hazmieh Main"` and `rg "hazmieh-main"` each ≥ 1 match
  - `rule` TR-1.4: `rg "PostgreSQL 16\+ with PostGIS" .env.example` returns ≥ 1 match
- **Notes**: Read main.dart and demo-businesses.ts before editing.

## Task 2: Backend NestJS unit tests (40+ tests across 6 modules)
- **Status**: `pending`
- **Priority**: high
- **Depends On**: None
- **Description**:
  - 2.1 Create `apps/api/src/auth/__tests__/auth.guard.spec.ts`: JwtAuthGuard canActivate passes when valid Bearer token, fails with 401 otherwise (mock JwtService)
  - 2.2 Create `apps/api/src/auth/__tests__/permissions.guard.spec.ts`: RequirePermissions decorator checks PermissionKey against user_role_scopes (4 cases: match/no match/empty/guest)
  - 2.3 Create `apps/api/src/social/__tests__/social.service.spec.ts` (≥ 14 tests):
    (a) findMany posts include.media_list not .media, include.author not .author_user
    (b) likePost wraps upsert + increment in single $transaction call
    (c) unlikePost wraps delete + decrement in $transaction
    (d) createComment uses parent_comment_id not parent_id, and wraps comment create + post.comment_count increment in $transaction
    (e) deleteComment decrements counter in $transaction
    (f) verify each field name against memory constraint checklists (media_list, author, parent_comment_id) by using exact string assertions on prisma args
  - 2.4 Create `apps/api/src/booking-v2/__tests__/booking-v2.service.spec.ts` (≥ 10 tests):
    (a) checkAvailability returns free slots when no overlapping appointments
    (b) createHold uses TransactionIsolationLevel.Serializable
    (c) createHold sets expires_at = now + 10min default
    (d) findConflicts detects overlapping (branch + pro + resources)
    (e) assertNoConflicts throws when conflicts exist
    (f) prepareBooking sums servicesTotal correctly (1 item, 2 items, 0 items)
    (g) prepareBooking depositAmount == percent or fixed correctly applied
  - 2.5 Create `apps/api/src/health/__tests__/health.controller.spec.ts` (≥ 3 tests): GET /health returns 200, /health/system returns checks array, unknown endpoint 404
  - 2.6 Create `apps/api/src/media/__tests__/media.service.spec.ts` (≥ 5 tests): upload stores storage_key metadata, variants generation mocked, public URLs correct
  - 2.7 Create `apps/api/src/notifications/__tests__/notifications.service.spec.ts` (≥ 4 tests): create saves record to DB with correct recipient, push channels honored based on notification_preferences
- **Acceptance Criteria Addressed**: AC-4, AC-12
- **Test Requirements**:
  - `rule` TR-2.1: Backend spec file count under apps/api/src/**/__tests__ is ≥ 7 files
  - `rule` TR-2.2: `pnpm --filter @lookiva/api test:unit` exits 0 with ≥ 40 passed cases
  - `rule` TR-2.3: In social.service.spec string assertions: `args.include.media_list` (used) matches, literal `args.include.media` does not appear anywhere in mocked call snapshots
  - `rule` TR-2.4: booking-v2.service spec confirms `$transaction` called with Serializable level (assert against lambda capture)
- **Notes**: Use Jest if package declares jest; otherwise use Vitest. Follow existing apps/api/package.json test script runner. Do NOT require live Postgres for unit tests — mock PrismaClient via jest-mock-extended or equivalent.

## Task 3: DB integrity + shared-types enumeration tests (4+ tests, schema introspection)
- **Status**: `pending`
- **Priority**: high
- **Depends On**: None
- **Description**:
  - 3.1 Create `tests/schema-models.spec.ts` at repo root or packages/shared-types: read schema.prisma as text, extract `model Xxx {` names, require list of 80 model names from requirement.txt §203 exists (users, companies, branches, professionals, services, customers, appointments, appointment_services, appointment_resources, appointment_holds, payments, refunds, financial_ledger, reviews, posts, likes, comments, follows, favorites, collections, conversations, messages, notifications, etc.). Test returns pass if 80+ required names appear.
  - 3.2 Create `tests/permission-enum.spec.ts`: import PermissionKey from @lookiva/shared-types; enum Object.keys length ≥ 128; PERMISSION_DEFINITIONS.length == PermissionKey enum cardinality (same number)
  - 3.3 Create `tests/role-enum.spec.ts`: UserRole enum has 15 entries, ScopeType enum 3 entries
  - 3.4 Create `tests/social-constraints.spec.ts`: grep social.service.ts programmatically for forbidden literals (`media:`, `author_user`, `parent_id`) → pass when 0 matches; confirm allowed literals present
- **Acceptance Criteria Addressed**: AC-4, AC-12
- **Test Requirements**:
  - `rule` TR-3.1: Schema required list 80 names assertion passes (≥ 80 model names found via regex)
  - `rule` TR-3.2: PermissionKey count ≥ 128 and equals PERMISSION_DEFINITIONS.length
  - `rule` TR-3.3: UserRole length == 15, ScopeType length == 3
  - `rule` TR-3.4: Forbidden literal grep returns 0 matches
- **Notes**: Use Node fs.readFileSync + regex; tests run offline. This is the first `tests/` at repo root. Ensure it's runnable from vitest or jest as root declares.

## Task 4: Vitest web component tests (6+ tests)
- **Status**: `pending`
- **Priority**: high
- **Depends On**: None
- **Description**:
  - 4.1 customer-web: `__tests__/home-page.spec.tsx` — render skeleton while loading, switch to EmptyState when empty list, show NetworkError + retry button on fetch reject
  - 4.2 business-web: `__tests__/login-page.spec.tsx` — form renders email/password inputs, submit calls signIn with credentials, error banner on reject
  - 4.3 admin-web: `__tests__/login-page.spec.tsx` — same as business, plus redirects to /dashboard on success
  - 4.4 packages/localization: `__tests__/locale-keys.spec.ts` — en/ar/fr 3 JSONs share equal key counts (±2 allowed), no empty string values, AR JSON contains at least 5 RTL-sensitive labels
- **Acceptance Criteria Addressed**: AC-4
- **Test Requirements**:
  - `rule` TR-4.1: web spec files count ≥ 4
  - `rule` TR-4.2: `pnpm --filter customer-web test` exit 0 with ≥ 6 total pass
- **Notes**: customer-web already declares vitest.config.ts in Glob earlier (confirmed present via vitest script reference).

## Task 5: Flutter widget tests (10+ tests, both apps)
- **Status**: `pending`
- **Priority**: high
- **Depends On**: None
- **Description**:
  - 5.1 customer-mobile/test/
    - splash_test.dart: Pump Splash widget with MockGoRouter, wait 1900ms, verify go() called once with correct route prefix
    - theme_test.dart: pump MyApp with theme=dark -> primary color matches #D4AF37 gold; theme=light matches Silver Light surface
    - locale_test.dart: pump MyApp with locale 'ar' -> Directionality is RTL; with 'en' -> LTR
    - home_shell_test.dart: pump CustomerHomePage, 5 NavigationBar destinations rendered, MarketplaceTab renders SectionCard count >= 3
  - 5.2 business-mobile/test/
    - splash_test.dart: same, verify route /dashboard or /login depending on token
    - dashboard_8metrics_test.dart: pump BusinessDashboardPage width=1024, find 8 _MetricTile texts ("Appointments","Confirmed","Completed","Booked","Collected","Cash","NoShows","BusiestPro") all present
    - responsive_nav_test.dart: width=400 -> NavigationBar rendered; width=1000 -> NavigationRail rendered
    - biz_locale_theme_test.dart: theme+locale switching (4 tests combined)
- **Acceptance Criteria Addressed**: AC-4, AC-13, AC-14, AC-16
- **Test Requirements**:
  - `rule` TR-5.1: test files count ≥ 8 under both apps/*mobile/test/
  - `rule` TR-5.2: `cd apps/customer-mobile; flutter test --reporter expanded` exit 0 ≥ 5 pass; `cd apps/business-mobile; flutter test` exit 0 ≥ 5 pass
- **Notes**: Use flutter_test, MockGoRouter via mockito or simple closure-based mock. For timer navigation, use `tester.runAsync` and `tester.pump` with Duration.

## Task 6: GitHub CI/CD Workflows (4 yaml files)
- **Status**: `pending`
- **Priority**: high
- **Depends On**: None
- **Description**:
  - 6.1 `.github/workflows/ci.yml`: on push + pull_request branches [main,develop]; jobs: (1) setup-node 20 + pnpm 9 + install; (2) lint; (3) typecheck; (4) backend unit tests pnpm --filter @lookiva/api test:unit; (5) web vitest pnpm --filter customer-web test; (6) prisma validate; (7) Flutter analyze step runs-on ubuntu-latest with flutter-action: both apps flutter analyze
  - 6.2 `.github/workflows/prisma-migrate-check.yml`: on [push, pull_request] to changes paths apps/api/prisma/**; prisma validate, prisma migrate diff against shadow DB placeholder (or schema only compile), seed TS compile (tsc --noEmit seed)
  - 6.3 `.github/workflows/build.yml`: on push main / release/** tags; build jobs: (a) api build: pnpm build for api; (b) customer-web build Next.js standalone; (c) business-web build; (d) admin-web build; (e) Flutter build web placeholder + apk debug
  - 6.4 `.github/workflows/security.yml`: on schedule daily + pull_request; npm audit --audit-level high (non-blocking warn), ESLint security config, secret-scanning patterns (block `sk_live_`, `pk_live_`, `AKIA*`, etc.) with allowlist for `dev_secret`/`lookiva_dev_*` values
- **Acceptance Criteria Addressed**: AC-5, NFR-8, NFR-9
- **Test Requirements**:
  - `rule` TR-6.1: Directory `.github/workflows` contains exactly 4 files: ci.yml, prisma-migrate-check.yml, build.yml, security.yml
  - `rule` TR-6.2: Each yaml contains an `on:` block with `push` or `pull_request` AND contains a `jobs:` block with ≥ 1 job with steps referencing either `pnpm` or `flutter`
  - `rule` TR-6.3: No hardcoded production credential patterns found in workflows (rg `sk_live_|pk_live_` workflows → 0 matches)
- **Notes**: YAML indentation matters. For Flutter steps use `subosito/flutter-action@v2` canonical. For Node use `actions/setup-node@v4` with cache pnpm.

## Task 7: Realtime Socket.IO gateways (5 domains + workers BullMQ + Flutter sockets)
- **Status**: `pending`
- **Priority**: medium
- **Depends On**: None
- **Description**:
  - 7.1 `apps/api/src/realtime/realtime.module.ts`: Nest module imports 5 gateways, exports them
  - 7.2 `apps/api/src/realtime/chat.gateway.ts` @WebSocketGateway cors. handleConnection attaches user via JWT guard on handshake. handleJoinRoom('conversation:{id}'), handleTyping events. Broadcasts 'message:new' only to conversation members
  - 7.3 `apps/api/src/realtime/bookings.gateway.ts`: JWT guarded. Rooms `company:{id}` and `branch:{id}`. Emits `appointment:created`, `appointment:updated`, `appointment:cancelled`, `hold:expired`
  - 7.4 `apps/api/src/realtime/notifications.gateway.ts`: User-joined rooms `user:{id}`. Emits `notification:new` with badge count delta
  - 7.5 `apps/api/src/realtime/floor.gateway.ts`: Branch room `floor:branch:{id}`. Emits `chair:state_changed`, `resource:blocked`, `queue:position_changed`
  - 7.6 `apps/api/src/realtime/queue.gateway.ts`: Same branch room `queue:branch:{id}`, emits `queue:entry_added` / `queue:entry_called`
  - 7.7 `apps/api/src/app.module.ts`: Add RealtimeModule to imports array
  - 7.8 apps/workers/src: refactor each processor to instantiate BullMQ Queue for 'analytics','email','media','notification' with connection options from env (same Redis). Export queues collection. Add jobs.queue.ts or queues.ts index
  - 7.9 customer-mobile pubspec.yaml: add `socket_io_client: ^2.0.3+1`; main.dart import socket_io_client, instantiate stub (disconnected by default until auth)
  - 7.10 business-mobile pubspec.yaml: add same `socket_io_client: ^2.0.3+1`; dashboard shell includes socket connect/dispose hook
- **Acceptance Criteria Addressed**: AC-6, AC-19
- **Test Requirements**:
  - `rule` TR-7.1: Glob `apps/api/src/realtime/*.gateway.ts` count == 5 exactly; plus realtime.module.ts exists
  - `rule` TR-7.2: AppModule imports includes RealtimeModule (verify import line present in app.module.ts actual file)
  - `rule` TR-7.3: apps/workers/src contains Queue instantiation count ≥ 4 (rg "new Queue" count)
  - `rule` TR-7.4: rg `socket_io_client` apps/customer-mobile/pubspec.yaml == 1 match; same for business-mobile == 1 match
  - `rubric` TR-7.5 (AC-19): Room scopes; scale 1-5; threshold >= 4. Evidence: per-gateway room string pattern includes conversation_id, company_id, branch_id, user_id; JWT guard decorator present on ≥ 80% handleMessage handlers.
- **Notes**: Install @nestjs/websockets @nestjs/platform-socket.io socket.io packages (check package.json; if not present add via package.json edit under @lookiva/api deps — note we do not actually run pnpm install in the spec-only stage, just add to package.json).

## Task 8: Business Web Dashboard pages + sidebar layout (2 pages → 13 pages)
- **Status**: `pending`
- **Priority**: medium
- **Depends On**: None
- **Description**:
  - 8.0 Wrap dashboard routes in route group `(dashboard)` and extend layout to include persistent Sidebar (10+ nav items). Keep login separate outside (dashboard) group.
  - 8.1 app/[locale]/(dashboard)/calendar/page.tsx: bookings calendar skeleton, fetch from /appointments endpoint with states (loading/empty/error/retry)
  - 8.2 app/[locale]/(dashboard)/floor/page.tsx: chair grid 4x2 default, socket subscribe placeholders with useEffect
  - 8.3 app/[locale]/(dashboard)/clients/page.tsx: searchable clients table using shadcn/DataTable, pagination
  - 8.4 app/[locale]/(dashboard)/services/page.tsx: services list + Add Service form shell
  - 8.5 app/[locale]/(dashboard)/staff/page.tsx: pros CRUD table shell with roles dropdown
  - 8.6 app/[locale]/(dashboard)/resources/page.tsx: resources/chairs grid shell, Add Resource modal skeleton
  - 8.7 app/[locale]/(dashboard)/queue/page.tsx: queue entries with position badges
  - 8.8 app/[locale]/(dashboard)/bookings/[id]/page.tsx: dynamic route, booking detail + payment action buttons
  - 8.9 app/[locale]/(dashboard)/finance/page.tsx: KPI cards skeleton Today/Week/Month selector
  - 8.10 app/[locale]/(dashboard)/reviews/page.tsx: review cards + reply textarea
  - 8.11 app/[locale]/(dashboard)/onboarding/page.tsx: 14-step wizard shell with step state (prev/next)
  - 8.12 Update business-web layout Sidebar (layout.tsx under [locale]/(dashboard)/layout.tsx): Dashboard, Calendar, Floor, Clients, Services, Staff, Resources, Queue, Bookings, Finance, Reviews, Onboarding = 12 items
- **Acceptance Criteria Addressed**: AC-7, NFR-1, AC-18
- **Test Requirements**:
  - `rule` TR-8.1: Total page.tsx count under apps/business-web/app/ ≥ 13
  - `rule` TR-8.2: Sidebar nav items list length (actual `<li>` or `<Link>` components count in dashboard layout sidebar component) ≥ 10
  - `rubric` TR-8.3 (AC-18): State handling across pages; scale 1-5; threshold >= 4. Evidence: sample 5 new pages each imports+uses skeleton + empty state component + error state with retry button in output JSX
- **Notes**: Keep consistent with existing component patterns (home used SkeletonCard/EmptyState/NetworkError). Create shared components if missing. Do NOT break existing login and dashboard shell pages. If current layout is single layout.tsx, move to two-level layout with (dashboard) route group.

## Task 9: Admin Web pages + sidebar layout (2 pages → 12 pages)
- **Status**: `pending`
- **Priority**: medium
- **Depends On**: None
- **Description**:
  - 9.0 Admin route group (admin) layout + Sidebar navigation shell
  - 9.1 users/page.tsx: users table with search, role filter, status toggle
  - 9.2 businesses/page.tsx: approval queue table (Pending/Approve/Reject buttons)
  - 9.3 bookings/page.tsx: global bookings table, status filter tabs
  - 9.4 moderation/page.tsx: posts/reviews moderation queue table with Approve/Remove/Takedown actions
  - 9.5 categories/page.tsx: service categories CRUD shell (list + new/edit drawer)
  - 9.6 geo/page.tsx: Countries/Regions/Cities/Areas tabbed data tables
  - 9.7 themes/page.tsx: theme settings editor shell (toggle variables, preview pane)
  - 9.8 plans/page.tsx: subscription plans grid
  - 9.9 features/page.tsx: feature flags toggles with scope (Platform/Company/Branch)
  - 9.10 support/page.tsx: support tickets table, filter open/closed
  - 9.11 sidebar navigation 11+ items in layout
- **Acceptance Criteria Addressed**: AC-8
- **Test Requirements**:
  - `rule` TR-9.1: page.tsx count ≥ 12 under apps/admin-web/app
  - `rule` TR-9.2: sidebar nav items count ≥ 11
  - `rubric` TR-9.3 (AC-18): state handling coverage; threshold >= 4
- **Notes**: Follow admin-web existing nextauth route conventions.

## Task 10: Customer Mobile Flutter split structure + 18 route shells
- **Status**: `pending`
- **Priority**: medium
- **Depends On**: Task 1 (cust_ prefix first)
- **Description**:
  - 10.1 Split lib/: lib/main.dart (entry), lib/app.dart (MaterialApp), lib/router.dart (GoRouter declaration), lib/theme.dart (theme/locale providers), lib/providers/ (providers barrel), lib/widgets/ (Skeleton, EmptyState, NetworkError, MetricTile, SectionCard reusable components), lib/screens/ per FR-7
  - 10.2 Screens created with state shells (splash, onboarding, register, language, location_permission, nearby_optin, home with 5 tabs, booking_flow, booking_detail, bookings_list, qr_checkin, waitlist, chat_list, chat_room, notifications, favorites, collections, reviews, business_profile, pro_profile, service_details)
  - 10.3 pubspec.yaml add deps: `cached_network_image: ^3.3.1`, `video_player: ^2.8.6`, `flutter_map: ^6.1.0`, `socket_io_client: ^2.0.3+1`, `flutter_secure_storage: ^9.2.2`
  - 10.4 Cust_ prefix verified after split (all keys)
  - 10.5 Splash screen split uses initState + Timer 1800ms + context.go navigation (no build() navigation calls)
- **Acceptance Criteria Addressed**: AC-1, AC-9, AC-13, AC-17, NFR-5, NFR-7
- **Test Requirements**:
  - `rule` TR-10.1: lib/screens directory file count ≥ 20 screen files
  - `rule` TR-10.2: router.dart routes list length (GoRoute count) ≥ 18
  - `rule` TR-10.3: pubspec.yaml contains entries: cached_network_image, video_player, flutter_map, socket_io_client, flutter_secure_storage (5 deps check each 1 match)
  - `rule` TR-10.4: Splash screen Stateful initState + Timer(milliseconds: 1800) + context.go all present (3 string matches)
  - `rubric` TR-10.5 (AC-17 flutter analyze): scale 1-5 threshold >= 4; evidence flutter analyze
- **Notes**: Customer mobile currently single main.dart. Keep the SAME behavior and exact same theme colors; only split for maintainability.

## Task 11: Business Mobile Flutter split structure + 14 route shells
- **Status**: `pending`
- **Priority**: medium
- **Depends On**: None
- **Description**:
  - 11.1 Split lib/: main/app/router/theme/providers/widgets/screens structure same pattern as customer
  - 11.2 Screens: splash, login, onboarding_wizard (14-step shell), dashboard, calendar, floor, queue, clients, services, staff, resources, booking_detail, finance, reviews, notifications, settings
  - 11.3 pubspec.yaml add 5 deps (cached_network, video, flutter_map, socket client, flutter_secure_storage) same versions
  - 11.4 Retain biz_ prefix on all shared_preferences keys (explicit check test)
  - 11.5 Dashboard 8-metric grid, responsive NavigationRail ≥720 vs NavigationBar <720 preserved
  - 11.6 Splash Timer preserved
- **Acceptance Criteria Addressed**: AC-14, NFR-5, NFR-6, AC-16, AC-17
- **Test Requirements**:
  - `rule` TR-11.1: GoRouter routes array length ≥ 14
  - `rule` TR-11.2: Dashboard 8 metrics labels all present, responsive check `width >= 720` literal present
  - `rule` TR-11.3: All shared_preferences keys prefix `biz_` verification (grep `'biz_'` ≥ 4 matches, grep unprefixed auth/theme 0 matches)
  - `rubric` TR-11.4 (AC-17 analyze): threshold >= 4
- **Notes**: Keep exact existing behavior and theme colors for business app during split.

## Task 12: Customer Web PWA additional page shells (11 → 19 pages)
- **Status**: `pending`
- **Priority**: medium
- **Depends On**: None
- **Description**:
  - 12.1 app/[locale]/businesses/[slug]/page.tsx business profile tabs: overview/services/pros/reviews
  - 12.2 app/[locale]/professionals/[id]/page.tsx pro profile
  - 12.3 app/[locale]/services/[id]/page.tsx service detail
  - 12.4 app/[locale]/book/[businessSlug]/page.tsx booking wizard shell (step state)
  - 12.5 app/[locale]/bookings/page.tsx bookings list
  - 12.6 app/[locale]/bookings/[id]/page.tsx booking detail
  - 12.7 app/[locale]/qr/page.tsx QR check-in display
  - 12.8 app/[locale]/waitlist/page.tsx waitlist
  - 12.9 app/[locale]/chat/page.tsx conversation list
  - 12.10 app/[locale]/notifications/page.tsx notifications list
  - 12.11 app/[locale]/favorites/page.tsx favorites
  - 12.12 app/[locale]/collections/page.tsx collections
  - 12.13 app/[locale]/reviews/page.tsx reviews feed
  - 12.14 app/[locale]/offers/page.tsx offers list
  - Each page: skeleton loading, empty state, error state with retry button, auth guard redirect, responsive tailwind grid, locale+theme switching support
- **Acceptance Criteria Addressed**: AC-10, AC-18
- **Test Requirements**:
  - `rule` TR-12.1: page.tsx files total under apps/customer-web/app ≥ 19
  - `rubric` TR-12.2 (AC-18 page states): threshold >= 4; evidence sample 6 pages imports Skeleton|EmptyState|NetworkError components and JSX tree includes each
- **Notes**: Keep consistent existing component naming pattern.

## Task 13: Observability middleware + health expansion + Phase-13 docs + .env.example expanded
- **Status**: `pending`
- **Priority**: medium
- **Depends On**: None
- **Description**:
  - 13.1 `apps/api/src/common/middleware/correlation-id.middleware.ts`: attach X-Correlation-Id header or generate UUID if absent, inject into logger context, attach to response header, and pass to audit_logs correlation_id column
  - 13.2 `apps/api/src/app.module.ts` globally register correlation-id middleware (NestConsumer apply)
  - 13.3 Expand health.controller: endpoint GET /health/system returns checks: API_LIVE, DB_PING, REDIS_PING, QUEUES_STATUS, STORAGE_BUCKETS, MEDIA_PROCESSING, PAYMENT_INTEGRATION_DEV, NOTIFICATION_PROVIDERS_DEV, CHAT_WS_SERVER, SOCKETS_SERVER, AUTH_JWKS = 11 checks. Each with checkName/status ('ok'|'degraded'|'down')/latencyMs/details{}
  - 13.4 `docs/` create: BACKUPS.md (pg_dump schedule, retention, restore), DB_INDEXES.md (list compound + geo indexes), SECURITY_REVIEW.md (CORS headers, rate limit, OWASP status), PRIVACY_REVIEW.md (PII fields, retention, GDPR), CONCURRENCY_REVIEW.md (Serializable isolation, holds, queue), FINANCIAL_RECONCILIATION.md (ledger append, payouts, reconciliation steps), PERFORMANCE_REVIEW.md (P95 targets, indexes coverage), ACCESSIBILITY_REVIEW.md (WCAG, reduced motion, high contrast), RTL_REVIEW.md (Arabic layout checklist), THEME_REVIEW.md (Midnight Gold/Silver Light tokens), MOBILE_REVIEW.md (Flutter checklist, offline), WEB_REVIEW.md (PWA checklist, core web vitals), POOR_NETWORK_TESTING.md (2G/3G scenarios, retry, offline). 13 files total, each with structured sections: Scope, Current Status, Open Items, Pass Criteria, Evidence.
  - 13.5 Expand `.env.example` credential placeholders, each `REQUIRED_IN_PROD` empty value. Add:
    Payment section: STRIPE_SECRET_KEY, STRIPE_PUBLISHABLE_KEY, STRIPE_WEBHOOK_SECRET, TAP_PAYMENT_API_KEY, WALLET_PROVIDER_URL, WALLET_PROVIDER_SECRET;
    SMS: SMS_PROVIDER_API_KEY line already there, add SMS_PROVIDER_SENDER_ID;
    WhatsApp: WHATSAPP_BUSINESS_PHONE_ID;
    Push: FCM_SERVER_KEY, APN_KEY_ID, APN_TEAM_ID, APN_KEY_P8;
    Maps: MAPBOX_ACCESS_TOKEN, GOOGLE_MAPS_API_KEY (keep existing MAP_TILES_URL)
- **Acceptance Criteria Addressed**: AC-11, NFR-9
- **Test Requirements**:
  - `rule` TR-13.1: correlation-id.middleware.ts exists AND registered (import in app.module.ts main or in CommonModule)
  - `rule` TR-13.2: health.controller GET /health/system check names array count ≥ 11 (each distinct)
  - `rule` TR-13.3: `Get-ChildItem docs -Recurse -Filter "*.md"` count ≥ 13
  - `rule` TR-13.4: rg `REQUIRED_IN_PROD` .env.example count ≥ 8 (payment+sms+whatsapp+fcm/apns+maps sections populated with placeholder lines each)
- **Notes**: All env values leave empty string default placeholders with comment `# REQUIRED_IN_PROD: contact vendor for live key`. Never hardcode real tokens.

## Task 14: Build + lint + typecheck verification (AC-15) and test run pass confirmation
- **Status**: `pending`
- **Priority**: high
- **Depends On**: 1,2,3,4,5,6,7,8,9,10,11,12,13 (everything else first)
- **Description**: Run the final verification commands and capture evidence. If any fail, loop back to relevant task to fix:
  - 14.1 `pnpm lint`
  - 14.2 `pnpm typecheck`
  - 14.3 `pnpm build` (builds api + 3 webs)
  - 14.4 `pnpm test` (all tests)
  - 14.5 For each mobile: `flutter analyze` then `flutter test`
  - For each failure, fix the minimum patch needed (import paths, missing types, test mocks). Add fixes to the originating task files, do not create Task 14 sub-tasks.
- **Acceptance Criteria Addressed**: AC-15, AC-16, NFR-1, NFR-2, NFR-3
- **Test Requirements**:
  - `rule` TR-14.1: lint exit 0; typecheck exit 0; build exit 0
  - `rule` TR-14.2: pnpm test exit 0, total passed ≥ 60
  - `rule` TR-14.3: Both flutter analyze exit 0; both flutter test exit 0, total widget cases ≥ 10
- **Notes**: This task is the composite gate. Implementation stays `in_progress` until all pass.
