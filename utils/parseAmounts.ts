// ─── Parsing types ────────────────────────────────────────────────────────────
export interface ParsedAmount {
  value: number;
  label: string;    // surrounding text from the receipt line
  isTotal: boolean; // detected as the bill total
}

export interface OcrLine {
  id: string;
  text: string;
  label: string;
  amount: number | null;
  kind: 'item' | 'total' | 'skip' | 'header';
}

// Lines whose amount is the final bill total
const TOTAL_KEYWORDS = [
  'grand total', 'total due', 'amount due', 'balance due', 'total amount',
  'to pay', 'amount to pay', 'total',
  // Norwegian
  'å betale', 'totalt', 'til betaling',
  // German
  'gesamt', 'gesamtbetrag', 'zu zahlen',
  // French
  'total à payer', 'montant total', 'à régler',
  // Spanish
  'total a pagar', 'importe total', 'a pagar',
];

// Lines to skip entirely — not the final bill total
const SKIP_KEYWORDS = [
  'subtotal', 'sub-total', 'sub total',
  'tax', 'vat', 'mva', 'moms', 'gst', 'hst',
  'tip', 'gratuity', 'service charge',
  'discount', 'rabatt',
];

// Currency symbols and codes to strip before parsing numbers
const CURRENCY_RE = /[$€£¥₩₹฿₫]|\b(NOK|USD|EUR|GBP|SEK|DKK|CHF|AUD|CAD|NZD|SGD|HKD|JPY|CNY|THB|ZAR|AED|SAR|ILS|QAR|KWD|OMR|BHD|JOD|LBP|LKR|NPR|PKR|BDT|TWD|FJD|INR|MYR|PHP|VND|IDR|KES|TZS|GHS|NGN|TND|MAD|EGP)\b/gi;

/** Extract the human-readable label (text part) from a receipt line */
function extractLabel(line: string): string {
  return line
    .replace(CURRENCY_RE, '')
    .replace(/[\d.,]+/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 30);
}

/** Extract all currency amounts from a single receipt line */
function extractValues(line: string): number[] {
  const clean = line.replace(CURRENCY_RE, ' ');
  const values: number[] = [];

  // 1. European thousands format: 1.234,56
  for (const m of clean.match(/\b\d{1,3}(?:\.\d{3})+,\d{2}\b/g) ?? []) {
    const v = parseFloat(m.replace(/\./g, '').replace(',', '.'));
    if (!isNaN(v) && v >= 1) values.push(v);
  }

  // Remove European matches to avoid double-counting
  const remaining = clean.replace(/\b\d{1,3}(?:\.\d{3})+,\d{2}\b/g, ' ');

  // 2. Standard decimal: 123.45 or 123,45 (comma as decimal separator)
  for (const m of remaining.match(/\b\d{1,7}[.,]\d{2}\b/g) ?? []) {
    const v = parseFloat(m.replace(',', '.'));
    if (!isNaN(v) && v >= 1) values.push(v);
  }

  // 3. Round integer amounts (only when no decimal found on this line,
  //    to avoid matching years, table numbers, item counts etc.)
  if (values.length === 0) {
    for (const m of remaining.match(/\b\d{2,5}\b/g) ?? []) {
      const n = parseInt(m, 10);
      // Exclude plausible years and very small numbers
      if (n >= 10 && n <= 99999 && !(n >= 1900 && n <= 2100)) values.push(n);
    }
  }

  return values;
}

/** Parse all detected amounts from OCR text, with context labels and total detection */
export function parseAmountsFromText(text: string): ParsedAmount[] {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const seen = new Set<string>(); // deduplicate by normalised value
  const results: ParsedAmount[] = [];

  for (const line of lines) {
    const lower = line.toLowerCase();

    // Skip lines that are clearly not the bill total
    if (SKIP_KEYWORDS.some(k => lower.includes(k))) continue;

    const isTotal = TOTAL_KEYWORDS.some(k => lower.includes(k));
    const label = extractLabel(line);
    const values = extractValues(line);

    for (const value of values) {
      const key = value.toFixed(2);
      if (seen.has(key)) continue;
      seen.add(key);
      results.push({ value, label, isTotal });
    }
  }

  // Sort: detected totals first, then by value descending
  return results.sort((a, b) => {
    if (a.isTotal !== b.isTotal) return a.isTotal ? -1 : 1;
    return b.value - a.value;
  });
}

/** Parse line items from OCR text for bill itemization.
 *  Returns one entry per line that has both a label and a value.
 */
export function parseItemsFromText(text: string): Array<{ label: string; value: number }> {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const results: Array<{ label: string; value: number }> = [];

  for (const line of lines) {
    const lower = line.toLowerCase();
    if (SKIP_KEYWORDS.some(k => lower.includes(k))) continue;
    if (TOTAL_KEYWORDS.some(k => lower.includes(k))) continue;

    const values = extractValues(line);
    const label = extractLabel(line);
    if (values.length > 0 && label.length > 0) {
      results.push({ label, value: values[0] });
    }
  }

  return results;
}

/**
 * Classify raw OCR text lines for the assisted review modal.
 * Every non-empty line is returned; `kind` determines pre-check state.
 */
export function classifyOcrLines(rawLines: string[]): OcrLine[] {
  const result: OcrLine[] = [];
  let idx = 0;
  for (const raw of rawLines) {
    const trimmed = raw.trim();
    if (!trimmed) continue;

    const lower = trimmed.toLowerCase();
    const isTotal = TOTAL_KEYWORDS.some(k => lower.includes(k));
    const isSkip = SKIP_KEYWORDS.some(k => lower.includes(k));

    const amounts = extractValues(trimmed);
    const amount = amounts.length > 0 ? amounts[0] : null;

    const label = extractLabel(trimmed) || trimmed.slice(0, 40);

    let kind: OcrLine['kind'];
    if (isTotal) kind = 'total';
    else if (isSkip) kind = 'skip';
    else if (amount !== null) kind = 'item';
    else kind = 'header';

    result.push({ id: String(idx++), text: trimmed, label, amount, kind });
  }
  return result;
}
