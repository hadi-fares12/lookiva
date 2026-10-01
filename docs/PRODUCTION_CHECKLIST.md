# LOOKIVA Production Upload Checklist

Do not upload/publish until every item below is green.

- [ ] `pnpm-lock.yaml` generated, reviewed and committed.
- [ ] `pnpm install --frozen-lockfile` succeeds.
- [ ] Production PostgreSQL has PostGIS enabled.
- [ ] `prisma migrate deploy` succeeds on a production-like database.
- [ ] API integration tests pass, including overlap/scope/readiness tests.
- [ ] All Node typechecks/tests/builds pass.
- [ ] Customer/business/admin web production builds pass.
- [ ] Redis and BullMQ workers healthy.
- [ ] Durable object storage and HTTPS media base configured.
- [ ] Real production email provider configured and tested.
- [ ] Real production SMS provider configured and tested.
- [ ] Real production push provider configured and tested.
- [ ] Real payment provider + signed webhook configured if online payments are enabled.
- [ ] `NEXT_PUBLIC_API_URL`, `MOBILE_API_URL`, web/media URLs all HTTPS.
- [ ] CORS allows only intended production origins.
- [ ] Flutter native `android/` and `ios/` projects generated/reviewed for both apps.
- [ ] Flutter analyze/tests pass for both apps.
- [ ] Signed Android customer/business release builds pass and install on physical devices.
- [ ] iOS customer/business release validation passes on macOS/Xcode and provisioning is configured.
- [ ] Camera/location/notification/background-location permissions are reviewed on Android/iOS.
- [ ] Map provider/style configured for production.
- [ ] Nearby/geofencing behavior tested on physical devices with user consent/cooldowns/quiet hours.
- [ ] Payment, refund, cash, multi-currency and reconciliation acceptance tests pass.
- [ ] Booking concurrency test proves only one user can reserve the same professional/resource/time.
- [ ] Arabic RTL, French and English smoke tests pass on web and mobile.
- [ ] Midnight Gold, Silver Light and System theme smoke tests pass.
- [ ] Backup/restore procedure tested.
- [ ] Monitoring/logging/alerts configured.
- [ ] Privacy/terms/support/production company details finalized.
- [ ] Demo/test users and credentials are absent from production data.
- [ ] `NODE_ENV=production ./scripts/release-gate.sh` returns `Release gate PASSED`.
