export type BookingFinancialInput = {
  status: string;
  total: number;
  currency: string;
};

export type PaymentFinancialInput = {
  status: string;
  amount: number;
  currency: string;
  method: string;
};

export type CurrencyMetrics = {
  currency: string;
  bookedRevenue: number;
  completedRevenue: number;
  collectedRevenue: number;
  outstanding: number;
  cash: number;
  card: number;
  online: number;
};

const activeBookingStatuses = new Set([
  'pending',
  'confirmed',
  'checked_in',
  'in_progress',
  'completed',
]);
const successfulPaymentStatuses = new Set(['succeeded', 'partially_refunded', 'refunded']);

function money(value: number) {
  return Number(value.toFixed(2));
}

export function calculateFinancialMetrics(
  bookings: BookingFinancialInput[],
  payments: PaymentFinancialInput[],
): CurrencyMetrics[] {
  const currencies = new Set<string>();
  for (const item of bookings) currencies.add(item.currency || 'UNKNOWN');
  for (const item of payments) currencies.add(item.currency || 'UNKNOWN');

  return [...currencies].sort().map((currency) => {
    const currencyBookings = bookings.filter((item) => (item.currency || 'UNKNOWN') === currency);
    const currencyPayments = payments.filter((item) => (item.currency || 'UNKNOWN') === currency);
    const bookedRevenue = currencyBookings
      .filter((item) => activeBookingStatuses.has(item.status))
      .reduce((sum, item) => sum + item.total, 0);
    const completedRevenue = currencyBookings
      .filter((item) => item.status === 'completed')
      .reduce((sum, item) => sum + item.total, 0);
    const successful = currencyPayments.filter((item) => successfulPaymentStatuses.has(item.status));
    const collectedRevenue = successful.reduce((sum, item) => sum + item.amount, 0);
    const cash = successful
      .filter((item) => item.method.toLowerCase() === 'cash')
      .reduce((sum, item) => sum + item.amount, 0);
    const card = successful
      .filter((item) => item.method.toLowerCase() === 'card')
      .reduce((sum, item) => sum + item.amount, 0);
    const online = successful
      .filter((item) => !['cash', 'card'].includes(item.method.toLowerCase()))
      .reduce((sum, item) => sum + item.amount, 0);

    return {
      currency,
      bookedRevenue: money(bookedRevenue),
      completedRevenue: money(completedRevenue),
      collectedRevenue: money(collectedRevenue),
      // Confirmed future appointments are still money owed. This intentionally uses
      // active booked value rather than completed value.
      outstanding: money(Math.max(0, bookedRevenue - collectedRevenue)),
      cash: money(cash),
      card: money(card),
      online: money(online),
    };
  });
}
