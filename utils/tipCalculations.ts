export type Satisfaction = 'poor' | 'ok' | 'excellent' | 'custom';

export interface TipResult {
  amount: number;
  tipPercent: number;
  tipAmount: number;
  total: number;
  perPerson: number;
  roundUpOption: number | null;
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
    roundUpOption: getRoundUpOption(total),
    currency,
  };
}

/** Return the nearest round-number total above the current total.
 *  For totals < 100, rounds to the nearest 5 (e.g. 53 → 55).
 *  For larger totals, step is magnitude-derived so the suggestion always ends in 0.
 *  e.g. total=53 → 55, total=105 → 110, total=1050 → 1100
 */
export function getRoundUpOption(total: number): number | null {
  if (!total || total <= 0) return null;
  const step = total < 100
    ? 5
    : Math.max(10, Math.pow(10, Math.floor(Math.log10(total))) / 10);
  const next = Math.ceil((total + Number.EPSILON) / step) * step;
  return next > total ? next : null;
}

/** Round a number to a specified precision */
export function formatAmount(value: number, decimals = 2): string {
  return value.toFixed(decimals);
}
