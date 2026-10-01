import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

beforeAll(async () => {
  await prisma.$connect();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('production database readiness', () => {
  it('connects to PostgreSQL and has the critical booking/finance tables', async () => {
    const rows = await prisma.$queryRaw<Array<{ table_name: string }>>`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name IN (
          'appointments',
          'appointment_participants',
          'appointment_resources',
          'appointment_holds',
          'booking_financial_snapshots',
          'payments',
          'financial_ledger',
          'queue_entries'
        )
    `;

    expect(new Set(rows.map((row) => row.table_name))).toEqual(new Set([
      'appointments',
      'appointment_participants',
      'appointment_resources',
      'appointment_holds',
      'booking_financial_snapshots',
      'payments',
      'financial_ledger',
      'queue_entries',
    ]));
  });

  it('has all database overlap protection triggers installed', async () => {
    const rows = await prisma.$queryRaw<Array<{ trigger_name: string }>>`
      SELECT trigger_name
      FROM information_schema.triggers
      WHERE trigger_schema = 'public'
        AND trigger_name IN (
          'trg_guard_professional_overlap',
          'trg_guard_resource_overlap',
          'trg_guard_appointment_reschedule'
        )
    `;

    expect(new Set(rows.map((row) => row.trigger_name))).toEqual(new Set([
      'trg_guard_professional_overlap',
      'trg_guard_resource_overlap',
      'trg_guard_appointment_reschedule',
    ]));
  });

  it('can read the migration ledger', async () => {
    const rows = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*)::bigint AS count FROM "_prisma_migrations"
    `;
    expect(Number(rows[0]?.count ?? 0)).toBeGreaterThan(0);
  });
});
