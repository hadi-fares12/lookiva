import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('schema.prisma model inventory', () => {
  const schemaPath = resolve(__dirname, '../apps/api/prisma/schema.prisma');
  const schemaContent = readFileSync(schemaPath, 'utf-8');

  const modelMatches = schemaContent.match(/^model\s+(\w+)\s*\{/gm);
  const modelNames = (modelMatches || []).map((m) =>
    m.replace(/^model\s+/, '').replace(/\s*\{$/, ''),
  );

  const REQUIRED_MODELS: readonly string[] = [
    'users',
    'user_profiles',
    'user_preferences',
    'sessions',
    'roles',
    'permissions',
    'role_permissions',
    'user_role_scopes',
    'countries',
    'regions',
    'districts',
    'cities',
    'areas',
    'languages',
    'currencies',
    'platform_settings',
    'theme_settings',
    'feature_flags',
    'remote_config',
    'companies',
    'company_settings',
    'company_verification',
    'branches',
    'branch_locations',
    'branch_hours',
    'branch_exceptions',
    'professionals',
    'professional_profiles',
    'professional_branches',
    'service_professionals',
    'professional_schedules',
    'professional_schedule_exceptions',
    'service_categories',
    'services',
    'service_translations',
    'service_branch_settings',
    'service_dependencies',
    'service_stages',
    'resource_types',
    'resources',
    'resource_attributes',
    'professional_resources',
    'service_resource_requirements',
    'resource_blocks',
    'resource_maintenance',
    'floor_plans',
    'floor_plan_items',
    'customers',
    'customer_profiles',
    'customer_addresses',
    'customer_preferences',
    'customer_dependents',
    'appointments',
    'appointment_participants',
    'appointment_services',
    'appointment_resources',
    'appointment_holds',
    'appointment_status_history',
    'appointment_notes',
    'appointment_media',
    'booking_snapshots',
    'booking_financial_snapshots',
    'queues',
    'queue_entries',
    'payments',
    'payment_transactions',
    'refunds',
    'financial_ledger',
    'cash_sessions',
    'cash_movements',
    'exchange_rate_snapshots',
    'commissions',
    'professional_payouts',
    'professional_payout_items',
    'wallets',
    'wallet_ledger',
    'reviews',
    'review_ratings',
    'review_media',
    'review_reports',
    'posts',
    'post_media',
    'post_services',
    'likes',
    'comments',
    'follows',
    'favorites',
    'collections',
    'collection_items',
    'media_consents',
    'conversations',
    'conversation_members',
    'messages',
    'message_attachments',
    'notifications',
    'notification_preferences',
    'location_preferences',
    'nearby_notification_preferences',
    'geofence_candidates',
    'recommendation_events',
  ];

  it('should discover at least 80 models in schema.prisma', () => {
    expect(modelNames.length).toBeGreaterThanOrEqual(80);
  });

  it(`should contain all ${REQUIRED_MODELS.length} required model names`, () => {
    const missing: string[] = [];
    for (const name of REQUIRED_MODELS) {
      if (!modelNames.includes(name)) {
        missing.push(name);
      }
    }
    expect(missing, `Missing models: ${missing.join(', ')}`).toEqual([]);
  });

  it('should have exactly 100 models (current snapshot)', () => {
    expect(modelNames.length).toBe(100);
  });
});
