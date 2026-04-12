export type Satisfaction = 'poor' | 'ok' | 'excellent' | 'custom';

export interface TipResult {
  amount: number;
  tipPercent: number;
  tipAmount: number;
  total: number;
  perPerson: number;
  roundUpOptions: number[];
  currency: string;
}

export function calculateTip(
  amount: number,
  tipPercent: number,
  currency: string,
  people: number,
): TipResult {
  const tipAmount = amount * (tipPercent / 100);
  const total = amount + tipAmount;
  const perPerson = people > 1 ? total / people : total;

  return {
    amount,
    tipPercent,
    tipAmount,
    total,
    perPerson,
    roundUpOptions: getRoundUpOptions(total),
    currency,
  };
}

/** Generate 3 round-number targets above the given total.
 *  Step size is derived from the total's magnitude so suggestions always end in 0.
 *  e.g. total=1050 → [1100, 1200, 1300], total=105 → [110, 120, 130], total=55 → [60, 70, 80]
 */
export function getRoundUpOptions(total: number): number[] {
  const magnitude = Math.pow(10, Math.floor(Math.log10(total)));
  // Step = one order of magnitude below total's magnitude, minimum 10
  // e.g. total in 1000s → step=100, total in 100s → step=10, total in 10s → step=10
  const step = Math.max(10, magnitude / 10);
  const first = Math.ceil((total + Number.EPSILON) / step) * step;
  return [first, first + step, first + step * 2];
}

/** Round a number to a specified precision */
export function formatAmount(value: number, decimals = 2): string {
  return value.toFixed(decimals);
}
