# Lookiva Platform

Modern salon, barber and beauty marketplace monorepo.

## Repository layout
- `apps/api` NestJS API + Prisma/PostgreSQL/PostGIS schema
- `apps/workers` background workers
- `apps/customer-web` customer Next.js/PWA
- `apps/business-web` business dashboard
- `apps/admin-web` platform admin
- `apps/customer-mobile` Flutter customer app
- `apps/business-mobile` Flutter business app
- `packages/*` shared contracts/config/design/localization packages

## Important status
This repository is a hardened **production candidate source tree**. Static architecture, schema/migration, TypeScript syntax and Dart structural gates pass in the current environment. Final production certification must be performed on a networked CI/build machine with Node dependencies, PostgreSQL/PostGIS, Redis, Flutter SDK/native platform folders, signing material and real production provider credentials. See `docs/COMPLETENESS_AUDIT.md`.

Never deploy by bypassing `scripts/release-gate.sh`.

## Environment
Copy `.env.example` to `.env` and provide local secrets. The intended database is PostgreSQL with PostGIS and Redis for cache/queues.

## Verification
Fast/source verification:
```bash
./scripts/verify.sh
STATIC_ONLY=1 ./scripts/release-gate.sh
```

Final production gate on the real build machine:
```bash
NODE_ENV=production ./scripts/release-gate.sh
```

## Flutter
Each Flutter application has its own `pubspec.yaml`. Run `flutter pub get`, `flutter analyze`, and platform builds from the corresponding mobile app directory on a machine with Flutter installed.
# LOOKIVA
