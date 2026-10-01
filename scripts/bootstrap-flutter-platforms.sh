#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
command -v flutter >/dev/null 2>&1 || { echo "ERROR: Flutter SDK is required."; exit 1; }

bootstrap() {
  local app="$1" org="$2" name="$3"
  cd "$ROOT/$app"
  echo "== Bootstrapping $app =="
  # Generates only native platform scaffolding around the existing lib/pubspec.
  # Existing Dart application source is preserved.
  flutter create --platforms=android,ios --org "$org" --project-name "$name" .
  flutter pub get
  cd "$ROOT"
}

[[ -d "$ROOT/apps/customer-mobile/android" && -d "$ROOT/apps/customer-mobile/ios" ]] || bootstrap apps/customer-mobile com.lookiva lookiva_customer
[[ -d "$ROOT/apps/business-mobile/android" && -d "$ROOT/apps/business-mobile/ios" ]] || bootstrap apps/business-mobile com.lookiva lookiva_business

echo "Flutter Android/iOS platform scaffolds are present. Review bundle IDs, signing, entitlements, location/push permissions and icons before release."
