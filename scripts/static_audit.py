#!/usr/bin/env python3
from pathlib import Path
import re, sys, json, subprocess
ROOT=Path(__file__).resolve().parents[1]
errors=[]; warnings=[]

def fail(msg): errors.append(msg)
def warn(msg): warnings.append(msg)

schema=(ROOT/'apps/api/prisma/schema.prisma').read_text()
models=re.findall(r'^model\s+(\w+)\s*\{',schema,re.M)
blocks=dict(re.findall(r'^model\s+(\w+)\s*\{(.*?)^\}',schema,re.M|re.S))
actual=[]
for name,body in blocks.items():
    m=re.search(r'@@map\("([^"]+)"\)',body); actual.append(m.group(1) if m else name)
mig=ROOT/'apps/api/prisma/migrations/202609300001_baseline/migration.sql'
if not mig.exists(): fail('Schema-aligned baseline migration is missing')
else:
    sql=mig.read_text()
    created=re.findall(r'^CREATE TABLE "([^"]+)"',sql,re.M)
    missing=sorted(set(actual)-set(created)); extra=sorted(set(created)-set(actual))
    if missing: fail('Migration missing schema tables: '+', '.join(missing[:20]))
    if extra: fail('Migration creates unknown tables: '+', '.join(extra[:20]))
    if len(created)!=len(actual): fail(f'Model/table count mismatch: {len(actual)} schema models vs {len(created)} migration tables')
    for token in ['trg_guard_professional_overlap','trg_guard_resource_overlap','trg_guard_appointment_reschedule']:
        if token not in sql: fail(f'Missing database overlap guard: {token}')

# Required API modules/controllers from the production requirement.
required_api=[
 'auth','discovery','businesses','professionals','services','resources','booking-v2','finance-v2','analytics-v2',
 'social','reviews','notifications','retention-v2','platform-ops-v2','business-ops','customer-ops','admin','health'
]
api_src=ROOT/'apps/api/src'
api_text='\n'.join(p.read_text(errors='ignore') for p in api_src.rglob('*.ts'))
for item in required_api:
    if item not in api_text and not (api_src/item).exists(): fail(f'Required API surface not found: {item}')

# Route-level web surfaces. Dynamic section routes intentionally cover operational sections.
required_files=[
 'apps/customer-web/app/[locale]/home/page.tsx','apps/customer-web/app/[locale]/discover/page.tsx',
 'apps/customer-web/app/[locale]/search/page.tsx','apps/customer-web/app/[locale]/map/page.tsx',
 'apps/customer-web/app/[locale]/nearby/page.tsx','apps/customer-web/app/[locale]/available-now/page.tsx',
 'apps/customer-web/app/[locale]/businesses/[id]/page.tsx','apps/customer-web/app/[locale]/professionals/[id]/page.tsx',
 'apps/customer-web/app/[locale]/services/[id]/page.tsx','apps/customer-web/app/[locale]/book/[serviceId]/page.tsx',
 'apps/customer-web/app/[locale]/bookings/[id]/page.tsx','apps/business-web/app/[locale]/[section]/page.tsx',
 'apps/admin-web/app/[locale]/[section]/page.tsx'
]
for rel in required_files:
    if not (ROOT/rel).exists(): fail(f'Required route file missing: {rel}')

# Reject known fake-login implementation patterns.
for app in ['business-web','admin-web']:
    txt='\n'.join(p.read_text(errors='ignore') for p in (ROOT/'apps'/app).rglob('*.tsx'))
    if re.search(r'setTimeout\s*\([^;]{0,200}500',txt,re.S): fail(f'{app} still contains simulated 500ms login behavior')

# Contract/runtime consistency checks found during hardening.
contract=(ROOT/'packages/api-contracts/src/index.ts').read_text()
for pair in [('/api/v1/discovery/home','DISCOVERY_HOME_SECTIONS'),('/api/v1/auth/send-otp','SEND_OTP'),('/api/v1/auth/verify-otp','VERIFY_OTP')]:
    if pair[0] not in contract: fail(f'API contract missing {pair[1]} -> {pair[0]}')
axios=(ROOT/'apps/customer-web/lib/axios.ts').read_text()
if "Object.keys(body).length === 1 && 'data' in body" not in axios: fail('Customer API envelope normalization is missing')


# Discovery must use one real contract end-to-end and must never silently substitute demo salons/coordinates.
discovery_service=(ROOT/'apps/api/src/discovery/discovery.service.ts').read_text()
for token in ['items: DiscoveryBusinessResult[]','hasMore: boolean','windowMinutes','professional_schedule_exceptions']:
    if token not in discovery_service: fail(f'Discovery production contract/scheduling control missing: {token}')
for rel in [
 'apps/api/src/discovery/__tests__/discovery-contract.spec.ts',
 'apps/customer-web/hooks/useAvailableNow.ts',
]:
    if not (ROOT/rel).exists(): fail(f'Discovery regression surface missing: {rel}')
discovery_web='\n'.join((ROOT/rel).read_text(errors='ignore') for rel in [
 'apps/customer-web/app/[locale]/home/page.tsx',
 'apps/customer-web/app/[locale]/search/page.tsx',
 'apps/customer-web/app/[locale]/nearby/page.tsx',
 'apps/customer-web/app/[locale]/available-now/page.tsx',
 'apps/customer-web/app/[locale]/map/page.tsx',
])
for token in ['MOCK_DATA','MOCK_RESULTS','MOCK_NEARBY','MOCK_AVAILABLE','MOCK_MAP_BUSINESSES','33.8938','demotiles.maplibre.org']:
    if token in discovery_web: fail(f'Customer discovery still contains forbidden production demo/fallback data: {token}')
if 'NEXT_PUBLIC_MAP_STYLE_URL' not in discovery_web: fail('Customer map is not production-provider configurable')
mobile_discovery=(ROOT/'apps/customer-mobile/lib/core/discovery_search.dart').read_text() + (ROOT/'apps/customer-mobile/lib/core/discovery_home.dart').read_text()
if "payload['items']" not in mobile_discovery or "envelope['sections']" not in mobile_discovery:
    fail('Flutter discovery is not aligned with the canonical items/sections API contract')

# Finance invariants.
finance=(ROOT/'apps/api/src/common/finance/financial-metrics.ts')
if not finance.exists(): fail('Central financial metric helper is missing')
else:
    f=finance.read_text()
    if 'bookedRevenue - collectedRevenue' not in f: fail('Outstanding does not use booked minus collected revenue')
    if 'currency' not in f: fail('Financial metrics are not currency-separated')


# Security and database integration regression coverage.
for rel in [
 'apps/api/src/security/__tests__/scope-isolation.spec.ts',
 'apps/api/vitest.int.config.ts',
 'apps/api/src/health/production-readiness.int.spec.ts',
]:
    if not (ROOT/rel).exists(): fail(f'Production regression test missing: {rel}')
booking=(ROOT/'apps/api/src/booking-v2/booking-v2.service.ts').read_text()
if 'scope.scopeType === ScopeType.Branch' not in booking: fail('Booking scope checks are not branch-type aware')
if 'This booking hold belongs to another customer' not in booking: fail('Booking hold ownership protection is missing')
finance_src=(ROOT/'apps/api/src/finance-v2/finance-v2.service.ts').read_text()
if 'scope.scopeType === ScopeType.Branch' not in finance_src: fail('Finance scope checks are not branch-type aware')
ops_src=(ROOT/'apps/api/src/business-ops/business-ops.service.ts').read_text()
if 'allBranches' not in ops_src or 'assertRequestedBranch' not in ops_src: fail('Business operations branch scoping is missing')


# Production payment adapter/webhook safety.
payment_provider=(ROOT/'apps/api/src/finance-v2/payment-provider.service.ts')
controller=(ROOT/'apps/api/src/finance-v2/finance-v2.controller.ts')
main_ts=(ROOT/'apps/api/src/main.ts')
if not payment_provider.exists(): fail('Payment provider adapter is missing')
else:
    pp=payment_provider.read_text()
    for token in ['idempotency-key','verifyWebhook','timingSafeEqual','PAYMENT_WEBHOOK_SECRET']:
        if token not in pp: fail(f'Payment provider safety control missing: {token}')
if not controller.exists() or "webhooks/payment" not in controller.read_text(): fail('Signed payment webhook endpoint is missing')
if not main_ts.exists() or 'rawBody: true' not in main_ts.read_text(): fail('Nest raw-body capture required for webhook signature verification is missing')
if 'processPaymentWebhook' not in finance_src or "existingPaymentLedger" not in finance_src: fail('Idempotent payment webhook ledger handling is missing')
if not (ROOT/'apps/api/src/finance-v2/__tests__/payment-provider.spec.ts').exists(): fail('Payment provider signature regression tests are missing')

# Mobile production safety: no fixture/demo identities, no dev-login bypass, and tokens must use secure storage.
forbidden_mobile_fixtures = [
    'Continue (Dev)', 'Lumiere Salon', 'Noir Spa', 'Forma Clinic', 'Mira Haddad',
    'Premium member, 12 visits', 'USD 1,284',
]
for app in ['customer-mobile', 'business-mobile']:
    source_parts=[]
    for root_name in ['lib', 'test']:
        root=ROOT/'apps'/app/root_name
        if root.exists(): source_parts.extend(p.read_text(errors='ignore') for p in root.rglob('*.dart'))
    mobile_text='\n'.join(source_parts)
    for token in forbidden_mobile_fixtures:
        if token in mobile_text: fail(f'{app} contains forbidden production fixture/demo text: {token}')

# Mobile production safety: no dev-login bypass and tokens must use secure storage.
for app,api_class in [('customer-mobile','LookivaApi'),('business-mobile','LookivaBusinessApi')]:
    dart='\n'.join(p.read_text(errors='ignore') for p in (ROOT/'apps'/app/'lib').rglob('*.dart'))
    if 'Continue (Dev)' in dart: fail(f'{app} still contains development login bypass')
    if 'flutter_secure_storage' not in (ROOT/'apps'/app/'pubspec.yaml').read_text(): fail(f'{app} does not use native secure token storage')
    if api_class not in dart: fail(f'{app} production API session client is missing')
    if "bool.fromEnvironment('dart.vm.product')" not in dart or 'LOOKIVA_API_URL must be supplied for production builds' not in dart: fail(f'{app} can still build a release without an explicit production API URL')

# Environment/deployment basics.
for rel in ['.env.example','docker-compose.yml','scripts/release-gate.sh']:
    if not (ROOT/rel).exists(): fail(f'Production support file missing: {rel}')

# Production provider/storage hardening.
auth_service = (ROOT/'apps/api/src/auth/auth.service.ts').read_text()
env_schema = (ROOT/'apps/api/src/common/config/env.schema.ts').read_text()
media_service = (ROOT/'apps/api/src/media/media.service.ts').read_text()
worker_email = (ROOT/'apps/workers/src/processors/email.processor.ts').read_text()
worker_push = (ROOT/'apps/workers/src/processors/notification.processor.ts').read_text()
notifications_service = (ROOT/'apps/api/src/notifications/notifications.service.ts').read_text()
if 'email-queue' not in auth_service or 'PUBLIC_CUSTOMER_WEB_URL' not in auth_service: fail('Password reset must enqueue provider email with a public reset URL')
if not (ROOT/'apps/customer-web/app/[locale]/reset-password/page.tsx').exists(): fail('Customer reset-password page is missing')
for token in ['EMAIL_PROVIDER','PUSH_PROVIDER','MEDIA_PUBLIC_BASE_URL']:
    if token not in env_schema: fail(f'Production provider/media env validation missing: {token}')
for token in ['Production object storage is unavailable','Unable to persist uploaded media']:
    if token not in media_service: fail(f'Media storage does not fail closed in production: {token}')
if 'EMAIL_PROVIDER=console is forbidden in production' not in worker_email: fail('Email worker must fail closed in production')
if 'PUSH_PROVIDER=console is forbidden in production' not in worker_push: fail('Push worker must fail closed in production')
if 'push_devices' not in notifications_service or 'notification-queue' not in notifications_service: fail('Push device persistence/queue dispatch is incomplete')
media_worker = (ROOT/'apps/workers/src/processors/media.processor.ts').read_text()
for token in ['sharp(input)', 'ffmpeg', 'putVariant', "status: 'processed'"]:
    if token not in media_worker: fail(f'Real media variant processing missing: {token}')
for forbidden in ['[DEV-MEDIA]','Sharp image processing simulated','lookiva-media-dev']:
    if forbidden in media_worker: fail(f'Media worker still contains production simulation: {forbidden}')

# Analytics must be durable/scoped and must not use the old development logger.
analytics_worker=(ROOT/'apps/workers/src/processors/analytics.processor.ts').read_text()
analytics_service=(ROOT/'apps/api/src/analytics-v2/analytics-v2.service.ts').read_text()
if '[DEV-ANALYTICS]' in analytics_worker: fail('Analytics worker still contains development-only logging instead of persistence')
for token in ['analytics_events.create','companyAccess(user, companyId)','professionalBreakdown','DashboardViewFinancial']:
    if token not in analytics_worker + analytics_service: fail(f'Analytics production requirement missing: {token}')

# Production seed must never insert demo businesses/users by default.
seed=(ROOT/'apps/api/prisma/seed.ts').read_text()
if "mode === 'prod'" not in seed and "mode !== 'prod'" not in seed: fail('Production-safe seed mode is missing')
if 'includeDemoData' not in seed or 'bootstrapProductionAdmin' not in seed: fail('Production seed does not separate reference data from demo data')
if not (ROOT/'.env.production.example').exists(): fail('.env.production.example is missing')
compose=(ROOT/'docker-compose.production.yml').read_text()
if 'service_completed_successfully' not in compose or 'prisma migrate deploy' not in compose: fail('Production compose does not gate API startup on schema migration')



# Flutter source sanity/localization gate for environments where the Flutter SDK is unavailable.
dart_sanity = ROOT/'scripts/dart_static_sanity.py'
if not dart_sanity.exists():
    fail('Dart static sanity checker is missing')
else:
    check = subprocess.run([sys.executable, str(dart_sanity)], cwd=ROOT, capture_output=True, text=True)
    if check.returncode != 0:
        fail('Dart structural sanity failed: ' + (check.stdout + check.stderr).strip()[:2000])
for app, helper in [('customer-mobile','ct('),('business-mobile','bt(')]:
    l10n = ROOT/'apps'/app/'lib/core/l10n.dart'
    main = ROOT/'apps'/app/'lib/main.dart'
    if not l10n.exists(): fail(f'{app} shared EN/AR/FR localization helper is missing')
    elif not all(token in l10n.read_text(errors='ignore') for token in ["'en'", "'ar'", "'fr'"]): fail(f'{app} localization helper does not contain all launch locales')
    if not main.exists() or helper not in main.read_text(errors='ignore'): fail(f'{app} shell is not wired to the shared localization helper')

# Customer critical-path localization must exist for every launch locale.
locale_dir=ROOT/'packages/localization/src/locales'
required_namespaces=['customerAccount','customerBooking','customerChat','resetPassword','passwordRecovery','publicDetails','discoverFeed','bookingDetails']
for locale in ['en','ar','fr']:
    file=locale_dir/f'{locale}.json'
    if not file.exists():
        fail(f'Missing localization file: {locale}.json')
        continue
    try:
        payload=json.loads(file.read_text())
    except Exception as exc:
        fail(f'Invalid localization JSON {locale}.json: {exc}')
        continue
    for namespace in required_namespaces:
        if namespace not in payload:
            fail(f'Missing {namespace} localization namespace in {locale}.json')

print(json.dumps({'schemaModels':len(models),'errors':errors,'warnings':warnings},indent=2))
if errors: sys.exit(1)
