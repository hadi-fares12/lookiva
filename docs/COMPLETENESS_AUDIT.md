# LOOKIVA Production Candidate Audit — 2026-09-30

## Current verdict
This source tree has been substantially hardened and expanded into a **production candidate**, but it is **not production-certified in this execution environment**. The source-level release gates pass. Final production certification still requires a networked build/CI machine with installed Node dependencies, PostgreSQL/PostGIS + Redis, Flutter SDK/native platform projects, Android/iOS signing, and the real production provider credentials.

## Verified here
- Static architecture/migration audit: **PASS**.
- Prisma schema: **144 models** represented by the schema-aligned baseline migration.
- PostgreSQL overlap guards are present for professional/resource conflicts and reschedule conflicts.
- TypeScript/TSX source syntax: **231 files, 0 parse errors**.
- Dart structural sanity: **15 files, 0 structural errors**.
- Static production release gate: **PASS**.
- No active mobile development-login bypass or legacy demo customer/salon fixtures covered by the release audit.
- Customer/business/admin web authentication is connected to the NestJS API.
- Customer/business Flutter authentication uses the real API, secure token storage, refresh handling, role checks, and requires an explicit production API URL in product builds.

## Major implementation/hardening completed
- Customer Flutter: discovery, search, native business/professional/service details, booking/availability/hold/confirmation, booking history/details/cancellation, chat, account/retention/security/nearby sections, EN/AR/FR shell localization and RTL direction.
- Business Flutter: authenticated dashboard/calendar/floor/customer operations plus real operations navigation for services, staff, finance, analytics, queue, promotions, reviews, branches, subscription and audit.
- Customer Web/PWA: real discovery/search/map/nearby/available-now, public entity details, booking, account, bookings, favorites/following, notifications, chat, reviews, retention, security, nearby settings and password recovery.
- Business Web: authenticated company/branch scoped operational console for calendar, resources/floor, queue, customers, professionals, services, payments, finance, analytics/reports, promotions, reviews, staff, branches, subscriptions, audit and settings, including CRUD/lifecycle actions where implemented.
- Admin Web: authenticated operational console for users, businesses, verification, bookings, payments/refunds, moderation, taxonomy/countries/themes/subscriptions, support/disputes, audit, feature flags, remote config and system health, including audited mutation actions.
- Booking security: company/branch scope isolation, hold ownership protection, lifecycle history, PostgreSQL overlap protection, staff/customer ownership correction.
- Finance: booked/completed/collected/cash/outstanding separation, multi-currency-safe metrics, immutable ledger paths, idempotent signed provider webhooks and production fail-closed online payment adapter.
- Analytics: durable events and company/branch/professional-scoped reporting; no development-only analytics logger.
- Discovery: real contract alignment, durable search history, real location only, no fake salon fallback, schedule/conflict-aware Available Now.
- Notifications/auth: persisted push devices, preference-aware queues, lifecycle notifications, real password-reset flow, production fail-closed email/SMS/push provider configuration.
- Media: durable object-storage path, real Sharp image variants and FFmpeg video variants/thumbnail processing; production local-storage simulation forbidden.
- Production seeding: reference-data seed separated from demo data; production does not insert demo businesses/users by default.
- Deployment: production Compose, Dockerfiles, health/readiness checks, environment validation, CI/release gate, Flutter platform bootstrap script.
- Themes/language: Midnight Gold/Silver Light/System controls, EN/AR/FR and Arabic RTL on core customer/business/admin surfaces.

## Final certification blockers outside this environment
The following are intentionally **not marked passed** because this workspace cannot perform them:
1. `pnpm install --frozen-lockfile` / committed reviewed `pnpm-lock.yaml` (network unavailable here).
2. Prisma client generation and full compiled TypeScript typechecks against installed packages.
3. PostgreSQL/PostGIS migration execution + database integration tests against a running production-like database.
4. Full API/web/worker tests and production builds.
5. Flutter `pub get`, `flutter analyze`, Flutter tests, Android release builds and native platform validation (Flutter SDK unavailable here).
6. iOS release validation/signing on macOS/Xcode.
7. Production secrets/provider verification: SMS, email, push, object storage, payment provider (if enabled), map configuration, TLS/DNS.
8. Store signing/provisioning and final device acceptance testing.

## Required release command
On the actual build/CI machine, configure `.env.production`, install dependencies, bootstrap/review Flutter native platform folders, and run:

```bash
NODE_ENV=production ./scripts/release-gate.sh
```

**Do not deploy if this command fails.** The gate intentionally fails closed for missing secrets, providers, migrations, tests, web/API builds, Flutter platform folders or Flutter Android release builds.

## Production principle
A static/source pass is not equivalent to a signed production release. This candidate is designed so the final build environment, rather than a human claim, decides whether deployment is allowed.
