#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "== LOOKIVA production release gate =="
python3 scripts/static_audit.py

if [[ "${STATIC_ONLY:-0}" == "1" ]]; then
  echo "STATIC_ONLY=1: dependency, database, web, and Flutter build checks intentionally skipped."
  exit 0
fi

command -v pnpm >/dev/null 2>&1 || { echo "ERROR: pnpm is required (Corepack: corepack enable && corepack prepare pnpm@9.15.0 --activate)."; exit 1; }
[[ -f pnpm-lock.yaml ]] || { echo "ERROR: pnpm-lock.yaml is missing. Run pnpm install once on a networked build machine, review the lockfile, commit it, then rerun this gate."; exit 1; }
[[ -d node_modules ]] || { echo "ERROR: dependencies are not installed. Run pnpm install --frozen-lockfile."; exit 1; }

if [[ "${NODE_ENV:-}" == "production" ]]; then
  : "${DATABASE_URL:?DATABASE_URL required}"
  : "${REDIS_URL:?REDIS_URL required}"
  : "${JWT_ACCESS_SECRET:?JWT_ACCESS_SECRET required}"
  : "${JWT_REFRESH_SECRET:?JWT_REFRESH_SECRET required}"
  : "${CORS_ORIGINS:?CORS_ORIGINS required}"
  [[ ${#JWT_ACCESS_SECRET} -ge 32 ]] || { echo "ERROR: JWT_ACCESS_SECRET must be >=32 chars"; exit 1; }
  [[ ${#JWT_REFRESH_SECRET} -ge 32 ]] || { echo "ERROR: JWT_REFRESH_SECRET must be >=32 chars"; exit 1; }
  [[ "$JWT_ACCESS_SECRET" != *"replace"* && "$JWT_REFRESH_SECRET" != *"replace"* ]] || { echo "ERROR: placeholder JWT secrets are forbidden"; exit 1; }
  [[ "${SMS_PROVIDER:-console}" != "console" ]] || { echo "ERROR: production SMS_PROVIDER cannot be console"; exit 1; }
  : "${PUBLIC_CUSTOMER_WEB_URL:?PUBLIC_CUSTOMER_WEB_URL required}"
  : "${NEXT_PUBLIC_API_URL:?NEXT_PUBLIC_API_URL required for web builds}"
  [[ "${NEXT_PUBLIC_API_URL}" == https://* ]] || { echo "ERROR: NEXT_PUBLIC_API_URL must use HTTPS in production"; exit 1; }
  : "${NEXT_PUBLIC_MEDIA_BASE_URL:?NEXT_PUBLIC_MEDIA_BASE_URL required for web builds}"
  [[ "${NEXT_PUBLIC_MEDIA_BASE_URL}" == https://* ]] || { echo "ERROR: NEXT_PUBLIC_MEDIA_BASE_URL must use HTTPS in production"; exit 1; }
  [[ "${EMAIL_PROVIDER:-console}" != "console" ]] || { echo "ERROR: production EMAIL_PROVIDER cannot be console"; exit 1; }
  [[ "${EMAIL_PROVIDER:-}" == "generic_http" ]] || { echo "ERROR: unsupported production EMAIL_PROVIDER=${EMAIL_PROVIDER:-}"; exit 1; }
  : "${EMAIL_PROVIDER_BASE_URL:?EMAIL_PROVIDER_BASE_URL required}"
  : "${EMAIL_API_KEY:?EMAIL_API_KEY required}"
  : "${EMAIL_FROM:?EMAIL_FROM required}"
  [[ "${PUSH_PROVIDER:-console}" != "console" ]] || { echo "ERROR: production PUSH_PROVIDER cannot be console"; exit 1; }
  [[ "${PUSH_PROVIDER:-}" == "generic_http" ]] || { echo "ERROR: unsupported production PUSH_PROVIDER=${PUSH_PROVIDER:-}"; exit 1; }
  : "${PUSH_PROVIDER_BASE_URL:?PUSH_PROVIDER_BASE_URL required}"
  : "${PUSH_API_KEY:?PUSH_API_KEY required}"
  : "${MINIO_ENDPOINT:?MINIO_ENDPOINT required}"
  : "${MINIO_ACCESS_KEY:?MINIO_ACCESS_KEY required}"
  : "${MINIO_SECRET_KEY:?MINIO_SECRET_KEY required}"
  : "${MEDIA_PUBLIC_BASE_URL:?MEDIA_PUBLIC_BASE_URL required}"
  [[ "${MINIO_SECRET_KEY}" != *"replace"* && "${MINIO_SECRET_KEY}" != "lookiva_minio_dev" ]] || { echo "ERROR: placeholder MinIO secret is forbidden"; exit 1; }
  [[ "${PUBLIC_CUSTOMER_WEB_URL}" == https://* ]] || { echo "ERROR: PUBLIC_CUSTOMER_WEB_URL must use HTTPS in production"; exit 1; }
  [[ "${MEDIA_PUBLIC_BASE_URL}" == https://* ]] || { echo "ERROR: MEDIA_PUBLIC_BASE_URL must use HTTPS in production"; exit 1; }
  : "${MOBILE_API_URL:?MOBILE_API_URL required for Flutter release builds}"
  [[ "${MOBILE_API_URL}" == https://* ]] || { echo "ERROR: MOBILE_API_URL must use HTTPS in production"; exit 1; }
  if [[ "${ONLINE_PAYMENTS_ENABLED:-false}" == "true" ]]; then
    [[ "${PAYMENT_PROVIDER:-disabled}" != "test" && "${PAYMENT_PROVIDER:-disabled}" != "disabled" ]] || { echo "ERROR: a real PAYMENT_PROVIDER is required when ONLINE_PAYMENTS_ENABLED=true"; exit 1; }
    : "${PAYMENT_PROVIDER_BASE_URL:?PAYMENT_PROVIDER_BASE_URL required when online payments are enabled}"
    : "${PAYMENT_API_KEY:?PAYMENT_API_KEY required when online payments are enabled}"
    : "${PAYMENT_WEBHOOK_SECRET:?PAYMENT_WEBHOOK_SECRET required when online payments are enabled}"
  else
    [[ "${PAYMENT_PROVIDER:-disabled}" != "test" ]] || { echo "ERROR: production PAYMENT_PROVIDER=test is forbidden; use disabled when online payments are off"; exit 1; }
  fi
fi

echo "== Prisma client =="
pnpm --filter @lookiva/api prisma:generate

echo "== Prisma schema validation =="
pnpm --filter @lookiva/api exec prisma validate

echo "== Database migrations =="
pnpm --filter @lookiva/api prisma:migrate

echo "== Type checks =="
pnpm typecheck
pnpm --filter @lookiva/workers typecheck

echo "== Tests =="
pnpm test
pnpm --filter @lookiva/api test:int

echo "== Production web/API builds =="
pnpm build
pnpm --filter @lookiva/workers build

if command -v flutter >/dev/null 2>&1; then
  [[ -d apps/customer-mobile/android && -d apps/customer-mobile/ios ]] || { echo "ERROR: customer-mobile native platforms are missing. Run scripts/bootstrap-flutter-platforms.sh and commit/review the generated files."; exit 1; }
  [[ -d apps/business-mobile/android && -d apps/business-mobile/ios ]] || { echo "ERROR: business-mobile native platforms are missing. Run scripts/bootstrap-flutter-platforms.sh and commit/review the generated files."; exit 1; }
  echo "== Customer Flutter =="
  (cd apps/customer-mobile && flutter pub get && flutter analyze && flutter test && flutter build apk --release --dart-define=LOOKIVA_API_URL="${MOBILE_API_URL:?MOBILE_API_URL required}")
  echo "== Business Flutter =="
  (cd apps/business-mobile && flutter pub get && flutter analyze && flutter test && flutter build apk --release --dart-define=LOOKIVA_API_URL="${MOBILE_API_URL:?MOBILE_API_URL required}")
  if [[ "$(uname -s)" == "Darwin" ]]; then
    (cd apps/customer-mobile && flutter build ios --release --no-codesign --dart-define=LOOKIVA_API_URL="${MOBILE_API_URL:?MOBILE_API_URL required}")
    (cd apps/business-mobile && flutter build ios --release --no-codesign --dart-define=LOOKIVA_API_URL="${MOBILE_API_URL:?MOBILE_API_URL required}")
  else
    echo "INFO: iOS release validation requires macOS/Xcode; Android release builds were checked here."
  fi
else
  echo "ERROR: Flutter SDK is required for a production release gate."
  exit 1
fi

echo "== Release gate PASSED =="
