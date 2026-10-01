# LOOKIVA Production Deployment

The source tree is designed to fail closed when required production infrastructure is missing. Do not deploy by copying source files directly to a public server.

## Required release sequence

1. Use a networked CI/build machine with Node 22+, Corepack/pnpm 9.15, PostgreSQL/PostGIS, Redis, Docker, and Flutter. Use macOS/Xcode for iOS validation/signing.
2. Run `pnpm install` once to create/review/commit `pnpm-lock.yaml`; after that CI must use `pnpm install --frozen-lockfile`.
3. Generate both Flutter native platform projects with `scripts/bootstrap-flutter-platforms.sh`; configure Android package IDs/signing and iOS bundle IDs/signing/push capabilities.
4. Copy `.env.example` to a secret-managed `.env.production` and replace every placeholder. Production startup rejects console SMS/email/push providers and incomplete durable media configuration.
5. Point `DATABASE_URL` and `REDIS_URL` at production services. Use TLS/private networking where available.
6. Run `NODE_ENV=production pnpm release:gate`. Deployment is blocked unless migrations, tests, type checks, web/API/worker builds and Flutter release checks pass.
7. Back up PostgreSQL and object storage before every schema/application deployment. Test restore procedures periodically.
8. Run Prisma deployment migrations before switching traffic: `pnpm --filter @lookiva/api prisma:generate` then `pnpm --filter @lookiva/api prisma:migrate`.
9. Deploy API and workers before web/mobile clients that require new endpoints. Perform `/api/v1/health` checks before routing public traffic.
10. Put API/web behind HTTPS with a reverse proxy/load balancer. Do not expose PostgreSQL, Redis, MinIO admin, or internal worker ports publicly.

## Mandatory external providers

Production requires a real SMS provider for OTP, a real email provider for reset/system mail, a real push provider for mobile notifications, durable MinIO/S3-compatible object storage, and a production map style/provider for customer maps. Online card payments may stay disabled for a cash-only launch; if enabled, a real signed-webhook provider is mandatory.

## Mobile release

Android and iOS packages require native projects and signing secrets that are intentionally not stored in this repository. The release gate refuses to certify a mobile release when those platform projects or Flutter SDK are missing.

## Database safety

The baseline migration matches the current Prisma schema and includes database-level overlap protection for professionals and resources. Run the integration suite against a disposable PostgreSQL/PostGIS database before production migration.

## Media

API uploads durable originals to object storage. Workers create real image/video variants and update `media.variants` after processing. Production does not silently fall back to local disk.

## Secrets

Use your hosting platform's secret manager. Never commit `.env.production`, signing keys, payment keys, email/SMS/push credentials, MinIO secrets, or JWT secrets.

## Production database initialization

Do **not** run the development seed against production. Development/test seeds intentionally create sample users and sample businesses.

For a first production deployment:

```bash
pnpm --filter @lookiva/api prisma:migrate
BOOTSTRAP_ADMIN_EMAIL='admin@yourdomain.com' \
BOOTSTRAP_ADMIN_PASSWORD='use-a-unique-long-random-password' \
pnpm --filter @lookiva/api prisma:seed:prod
```

`prisma:seed:prod` creates reference geography/categories/resource types/roles/permissions and, only when the two bootstrap variables are supplied, creates the first Super Admin. It does **not** create demo customers or demo salons. Remove the bootstrap password from the deployment environment after the first successful seed and rotate the administrator password normally.

The production Compose file runs `prisma migrate deploy` as a one-shot `migrate` service and will not start the API until migrations succeed.

## Build-time public configuration

Next.js public variables are compiled into browser bundles. The Docker web builds therefore require these values as build arguments (the production Compose file passes them):

- `NEXT_PUBLIC_API_URL` — HTTPS API base ending in `/api/v1`
- `NEXT_PUBLIC_MEDIA_BASE_URL` — HTTPS public media/CDN base
- `NEXT_PUBLIC_MAP_STYLE_URL` — production map style URL when map discovery is enabled

Flutter release builds require:

```bash
--dart-define=LOOKIVA_API_URL=https://api.yourdomain.com/api/v1
```

The release gate rejects a production build when the mobile API URL is missing or non-HTTPS.

## Lockfile requirement

A production release requires a reviewed `pnpm-lock.yaml`. Generate it on a networked build machine with the pinned pnpm version, commit it, and then use `pnpm install --frozen-lockfile`. Docker production builds intentionally expect this lockfile so dependency versions cannot drift between releases.
