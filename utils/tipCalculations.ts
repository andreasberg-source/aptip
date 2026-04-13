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
 *  Step size is derived from the total's magnitude so the suggestion always ends in 0.
 *  e.g. total=1050 → 1100, total=105 → 110, total=55 → 60
 */
export function getRoundUpOption(total: number): number | null {
  if (!total || total <= 0) return null;
  const magnitude = Math.pow(10, Math.floor(Math.log10(total)));
  const step = Math.max(10, magnitude / 10);
  const next = Math.ceil((total + Number.EPSILON) / step) * step;
  return next > total ? next : null;
}

/** Round a number to a specified precision */
export function formatAmount(value: number, decimals = 2): string {
  return value.toFixed(decimals);
}
