#!/usr/bin/env bash
set -u
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
failed=0
run() { printf '\n== %s ==\n' "$1"; shift; "$@" || failed=1; }
run "Static architecture/migration audit" python3 "$ROOT/scripts/static_audit.py"
if command -v pnpm >/dev/null 2>&1 && [[ -d "$ROOT/node_modules" ]]; then
  run "API typecheck" bash -lc "cd '$ROOT' && pnpm --filter @lookiva/api typecheck"
  run "Customer web typecheck" bash -lc "cd '$ROOT' && pnpm --filter @lookiva/customer-web typecheck"
  run "Business web typecheck" bash -lc "cd '$ROOT' && pnpm --filter @lookiva/business-web typecheck"
  run "Admin web typecheck" bash -lc "cd '$ROOT' && pnpm --filter @lookiva/admin-web typecheck"
else
  echo "Node dependencies unavailable; run pnpm install on a networked machine for full typecheck."
fi
if command -v flutter >/dev/null 2>&1; then
  run "Customer Flutter analyze" bash -lc "cd '$ROOT/apps/customer-mobile' && flutter analyze"
  run "Business Flutter analyze" bash -lc "cd '$ROOT/apps/business-mobile' && flutter analyze"
else
  echo "Flutter SDK not installed; Flutter analysis skipped in this environment."
fi
exit $failed
