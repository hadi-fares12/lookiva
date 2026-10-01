import { describe, expect, it } from 'vitest';
import { calculateFinancialMetrics } from '../financial-metrics';

describe('calculateFinancialMetrics', () => {
  it('keeps booked revenue separate from cash collected', () => {
    const bookings = Array.from({ length: 10 }, (_, i) => ({
      status: i < 7 ? 'completed' : 'confirmed',
      total: 10,
      currency: 'USD',
    }));
    const payments = Array.from({ length: 7 }, () => ({
      status: 'succeeded',
      amount: 10,
      currency: 'USD',
      method: 'cash',
    }));
    expect(calculateFinancialMetrics(bookings, payments)).toEqual([
      {
        currency: 'USD',
        bookedRevenue: 100,
        completedRevenue: 70,
        collectedRevenue: 70,
        outstanding: 30,
        cash: 70,
        card: 0,
        online: 0,
      },
    ]);
  });

  it('separates mixed payment methods', () => {
    const bookings = Array.from({ length: 10 }, () => ({ status: 'confirmed', total: 10, currency: 'USD' }));
    const payments = [
      ...Array.from({ length: 5 }, () => ({ status: 'succeeded', amount: 10, currency: 'USD', method: 'cash' })),
      ...Array.from({ length: 3 }, () => ({ status: 'succeeded', amount: 10, currency: 'USD', method: 'card' })),
    ];
    expect(calculateFinancialMetrics(bookings, payments)[0]).toMatchObject({
      bookedRevenue: 100,
      collectedRevenue: 80,
      outstanding: 20,
      cash: 50,
      card: 30,
    });
  });

  it('never adds different currencies together', () => {
    const result = calculateFinancialMetrics(
      [
        { status: 'confirmed', total: 20, currency: 'USD' },
        { status: 'confirmed', total: 2_000_000, currency: 'LBP' },
      ],
      [
        { status: 'succeeded', amount: 20, currency: 'USD', method: 'cash' },
        { status: 'succeeded', amount: 2_000_000, currency: 'LBP', method: 'cash' },
      ],
    );
    expect(result).toHaveLength(2);
    expect(result.find((row) => row.currency === 'USD')?.cash).toBe(20);
    expect(result.find((row) => row.currency === 'LBP')?.cash).toBe(2_000_000);
  });
  it('keeps gross collection history for a later-refunded payment', () => {
    const [usd] = calculateFinancialMetrics(
      [{ status: 'completed', total: 10, currency: 'USD' }],
      [{ status: 'refunded', amount: 10, currency: 'USD', method: 'cash' }],
    );

    expect(usd.bookedRevenue).toBe(10);
    expect(usd.completedRevenue).toBe(10);
    expect(usd.collectedRevenue).toBe(10);
    expect(usd.cash).toBe(10);
    expect(usd.outstanding).toBe(0);
  });

});
