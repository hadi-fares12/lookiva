import { describe, expect, it } from 'vitest';
import { APIPaths } from '@lookiva/api-contracts';

describe('shared API paths match live controllers', () => {
  it('matches booking v2 appointment and queue routes', () => {
    expect(APIPaths.BOOKING_V2_ID_START('a1')).toBe('/api/v1/booking-v2/appointments/a1/start');
    expect(APIPaths.BOOKING_V2_ID_COMPLETE('a1')).toBe('/api/v1/booking-v2/appointments/a1/complete');
    expect(APIPaths.BOOKING_V2_ID_NO_SHOW('a1')).toBe('/api/v1/booking-v2/appointments/a1/no-show');
    expect(APIPaths.BOOKING_V2_QUEUE('b1')).toBe('/api/v1/booking-v2/queues/b1');
    expect(APIPaths.BOOKING_V2_QUEUE_JOIN('b1')).toBe('/api/v1/booking-v2/queues/b1/join');
    expect(APIPaths.BOOKING_V2_QUEUE_ID_CALL('q1')).toBe('/api/v1/booking-v2/queue-entries/q1/call');
    expect(APIPaths.BOOKING_V2_QUEUE_ID_SERVE('q1')).toBe('/api/v1/booking-v2/queue-entries/q1/serve');
  });

  it('matches finance and analytics company-scoped routes', () => {
    expect(APIPaths.FINANCE_V2_LEDGER('c1')).toBe('/api/v1/finance-v2/companies/c1/ledger');
    expect(APIPaths.FINANCE_V2_RECONCILIATION('c1')).toBe('/api/v1/finance-v2/companies/c1/reconciliation');
    expect(APIPaths.ANALYTICS_V2_DASHBOARD('c1')).toBe('/api/v1/analytics-v2/companies/c1/dashboard');
    expect(APIPaths.ANALYTICS_V2_DRILLDOWN('c1', 'revenue')).toBe('/api/v1/analytics-v2/companies/c1/drilldown/revenue');
    expect(APIPaths.ANALYTICS_V2_SNAPSHOTS_DAILY).toBe('/api/v1/analytics-v2/snapshots');
  });

  it('matches retention, notifications and platform-ops routes', () => {
    expect(APIPaths.RETENTION_V2_WALLET('cust1')).toBe('/api/v1/retention-v2/wallets/cust1');
    expect(APIPaths.RETENTION_V2_WALLET_ADJUST).toBe('/api/v1/retention-v2/wallets/adjust');
    expect(APIPaths.RETENTION_V2_LOYALTY('cust1')).toBe('/api/v1/retention-v2/loyalty/cust1');
    expect(APIPaths.NOTIFICATIONS_DEVICES).toBe('/api/v1/notifications/devices');
    expect(APIPaths.PLATFORM_OPS_V2_STATUS).toBe('/api/v1/platform-ops-v2/workers/status');
    expect(APIPaths.PLATFORM_OPS_V2_REALTIME_STATUS).toBe('/api/v1/platform-ops-v2/realtime/status');
    expect(APIPaths.PLATFORM_OPS_V2_GEOFENCE).toBe('/api/v1/platform-ops-v2/nearby/geofence-candidates');
    expect(APIPaths.PLATFORM_OPS_V2_AI_PARSE_SEARCH).toBe('/api/v1/platform-ops-v2/ai/search/parse');
  });
});
