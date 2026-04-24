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

// ─── Spatial parsing using ML Kit block/element structure ────────────────────

interface MlFrame { left: number; top: number; width: number; height: number }
interface MlElement { text: string; frame?: MlFrame }
interface MlLine { text: string; frame?: MlFrame; elements?: MlElement[] }
interface MlBlock { lines?: MlLine[] }

function getReceiptBounds(blocks: MlBlock[]) {
  let minLeft = Infinity, maxRight = -Infinity, minTop = Infinity, maxBottom = -Infinity;
  for (const block of blocks) {
    for (const line of (block.lines ?? [])) {
      if (!line.frame) continue;
      const { left, top, width, height } = line.frame;
      if (left < minLeft) minLeft = left;
      if (left + width > maxRight) maxRight = left + width;
      if (top < minTop) minTop = top;
      if (top + height > maxBottom) maxBottom = top + height;
    }
  }
  return { minLeft, maxRight, minTop, maxBottom };
}

/**
 * Classify OCR lines using ML Kit's spatial element data.
 * Uses bounding boxes to separate left-column labels from right-column prices.
 * Falls back gracefully if frame data is missing.
 */
export function classifyOcrLinesFromBlocks(blocks: MlBlock[]): OcrLine[] {
  const { minLeft, maxRight, minTop, maxBottom } = getReceiptBounds(blocks);
  const receiptWidth = maxRight - minLeft;
  const receiptHeight = maxBottom - minTop;
  const hasBounds = receiptWidth > 0 && receiptHeight > 0;

  // Price column starts at 55% of receipt width from left edge
  const priceXThreshold = minLeft + receiptWidth * 0.55;

  const result: OcrLine[] = [];
  let idx = 0;

  // Collect all lines in order
  const allLines: MlLine[] = blocks.flatMap(b => b.lines ?? []);

  for (let i = 0; i < allLines.length; i++) {
    const line = allLines[i];
    const trimmed = line.text?.trim();
    if (!trimmed) continue;

    // Filter header/footer by vertical position (top 12% and bottom 8%)
    if (hasBounds && line.frame) {
      const lineCenter = line.frame.top + line.frame.height / 2;
      const relY = (lineCenter - minTop) / receiptHeight;
      if (relY < 0.12 || relY > 0.92) continue;
    }

    const lower = trimmed.toLowerCase();
    const isTotal = TOTAL_KEYWORDS.some(k => lower.includes(k));
    const isSkip = SKIP_KEYWORDS.some(k => lower.includes(k));

    let label = '';
    let amount: number | null = null;

    if (hasBounds && line.elements && line.elements.length > 0) {
      // Split elements by x-position into label (left) and price (right)
      const labelWords: string[] = [];
      let rightmostPrice: number | null = null;
      let rightmostX = -Infinity;

      for (const el of line.elements) {
        const elLeft = el.frame?.left ?? (line.frame?.left ?? 0);
        const elText = el.text.trim();
        if (!elText) continue;

        const vals = extractValues(elText);
        const isRightCol = elLeft >= priceXThreshold;

        if (isRightCol && vals.length > 0) {
          // Rightmost numeric element in the price column wins
          if (elLeft > rightmostX) {
            rightmostX = elLeft;
            rightmostPrice = vals[0];
          }
        } else if (!isRightCol) {
          labelWords.push(elText);
        }
      }

      label = labelWords.join(' ').trim().slice(0, 40);
      amount = rightmostPrice;

      // If no price found via spatial split, try full-line extraction as fallback
      if (amount === null) {
        const vals = extractValues(trimmed);
        if (vals.length > 0) amount = vals[0];
        if (!label) label = extractLabel(trimmed);
      }

      // Handle amount-only lines: pair with preceding label-only line
      if (amount !== null && !label && i > 0) {
        const prev = result[result.length - 1];
        if (prev && prev.amount === null && prev.kind === 'header') {
          prev.amount = amount;
          prev.kind = isSkip ? 'skip' : isTotal ? 'total' : 'item';
          continue;
        }
      }
    } else {
      // No spatial data — fall back to text-only extraction
      label = extractLabel(trimmed) || trimmed.slice(0, 40);
      const vals = extractValues(trimmed);
      if (vals.length > 0) amount = vals[0];
    }

    if (!label && amount === null) continue;

    let kind: OcrLine['kind'];
    if (isTotal) kind = 'total';
    else if (isSkip) kind = 'skip';
    else if (amount !== null) kind = 'item';
    else kind = 'header';

    result.push({ id: String(idx++), text: trimmed, label: label || trimmed.slice(0, 40), amount, kind });
  }

  return result;
}

// ─── Country-aware receipt totals detection ───────────────────────────────────

const COUNTRY_LANG: Record<string, string> = {
  Norway: 'no', Sweden: 'sv', Denmark: 'da', Finland: 'fi',
  Germany: 'de', Austria: 'de', Switzerland: 'de',
  France: 'fr', Belgium: 'fr',
  Spain: 'es', Mexico: 'es', Argentina: 'es', Colombia: 'es', Chile: 'es', Peru: 'es',
  Netherlands: 'nl', Portugal: 'pt', Brazil: 'pt',
  Italy: 'it', Thailand: 'th',
};

const LANG_PRETAX_KW: Record<string, string[]> = {
  en: ['subtotal', 'sub-total', 'sub total', 'net total', 'excl. tax', 'excl. vat', 'before tax'],
  no: ['eks. mva', 'ekskl. mva', 'beløp eks', 'netto', 'subtotal'],
  sv: ['exkl. moms', 'netto', 'delsumma', 'ex moms'],
  da: ['ekskl. moms', 'netto', 'subtotal', 'ex moms'],
  fi: ['ilman alv', 'veroton', 'subtotal'],
  de: ['netto', 'zwischensumme', 'exkl. mwst', 'nettobetrag', 'zzgl. mwst'],
  fr: ['total ht', 'hors taxe', 'hors tva', 'sous-total', 'montant ht'],
  es: ['subtotal', 'base imponible', 'neto', 'antes de impuestos'],
  nl: ['subtotaal', 'excl. btw', 'netto'],
  pt: ['subtotal', 'sem iva', 'liquido'],
  it: ['subtotale', 'imponibile', 'escluso iva'],
  th: ['subtotal', 'ยอดรวมก่อนภาษี'],
};

const LANG_POSTTAX_KW: Record<string, string[]> = {
  en: ['grand total', 'total due', 'amount due', 'balance due', 'total amount', 'to pay', 'total'],
  no: ['totalt', 'å betale', 'til betaling', 'inkl. mva', 'total inkl', 'total'],
  sv: ['totalt', 'att betala', 'inkl. moms', 'summa att betala', 'total'],
  da: ['total', 'i alt', 'betales', 'inkl. moms'],
  fi: ['yhteensä', 'maksettava', 'loppusumma', 'total'],
  de: ['gesamt', 'gesamtbetrag', 'zu zahlen', 'inkl. mwst', 'bruttobetrag', 'endbetrag'],
  fr: ['total ttc', 'total à payer', 'montant total', 'à régler', 'montant ttc'],
  es: ['total a pagar', 'importe total', 'total con iva', 'a pagar', 'total'],
  nl: ['totaal', 'te betalen', 'incl. btw', 'eindtotaal'],
  pt: ['total', 'total a pagar', 'com iva'],
  it: ['totale', 'da pagare', 'totale complessivo'],
  th: ['total', 'ยอดรวม', 'ราคารวม'],
};

const LANG_TAX_KW: Record<string, string[]> = {
  en: ['tax', 'vat', 'gst', 'hst', 'sales tax'],
  no: ['mva', 'merverdiavgift'],
  sv: ['moms'], da: ['moms'], fi: ['alv'],
  de: ['mwst', 'mehrwertsteuer', 'ust'],
  fr: ['tva'], es: ['iva'], nl: ['btw'], pt: ['iva'], it: ['iva'],
  th: ['vat', 'ภาษีมูลค่าเพิ่ม'],
};

function getKws(map: Record<string, string[]>, lang: string): string[] {
  const specific = map[lang] ?? [];
  const english = map['en'] ?? [];
  return lang === 'en' ? english : [...new Set([...specific, ...english])];
}

export interface ReceiptTotals {
  preTax: ParsedAmount | null;
  postTax: ParsedAmount | null;
  tax: ParsedAmount | null;
}

function extractTotalsFromLines(
  lines: Array<{ text: string; elements?: MlElement[]; frame?: MlFrame }>,
  country: string | undefined,
  minLeft: number,
  maxRight: number,
  hasSpatial: boolean,
): ReceiptTotals {
  const lang = COUNTRY_LANG[country ?? ''] ?? 'en';
  const preTaxKws = getKws(LANG_PRETAX_KW, lang);
  const postTaxKws = getKws(LANG_POSTTAX_KW, lang);
  const taxKws = getKws(LANG_TAX_KW, lang);
  const priceXThreshold = minLeft + (maxRight - minLeft) * 0.45;

  let preTax: ParsedAmount | null = null;
  let postTax: ParsedAmount | null = null;
  let tax: ParsedAmount | null = null;

  for (const line of lines) {
    const trimmed = line.text?.trim();
    if (!trimmed) continue;
    const lower = trimmed.toLowerCase();

    const isPreTax = preTaxKws.some(k => lower.includes(k));
    const isPostTax = postTaxKws.some(k => lower.includes(k));
    const isTax = !isPreTax && !isPostTax && taxKws.some(k => lower.includes(k));
    if (!isPreTax && !isPostTax && !isTax) continue;

    let amount: number | null = null;
    if (hasSpatial && line.elements && line.elements.length > 0) {
      let rightmostX = -Infinity;
      for (const el of line.elements) {
        const elLeft = el.frame?.left ?? (line.frame?.left ?? 0);
        const vals = extractValues(el.text ?? '');
        if (vals.length > 0 && elLeft >= priceXThreshold && elLeft > rightmostX) {
          rightmostX = elLeft;
          amount = vals[0];
        }
      }
    }
    if (amount === null) {
      const vals = extractValues(trimmed);
      if (vals.length > 0) amount = vals[0];
    }
    if (amount === null) continue;

    const label = extractLabel(trimmed) || trimmed.slice(0, 40);
    const parsed: ParsedAmount = { value: amount, label, isTotal: isPostTax };

    if (isPreTax && !preTax) preTax = parsed;
    else if (isPostTax && !postTax) postTax = parsed;
    else if (isTax && !tax) tax = parsed;
  }

  return { preTax, postTax, tax };
}

/** Parse pre-tax / post-tax totals from ML Kit blocks using spatial data. */
export function parseReceiptTotals(blocks: any[], country?: string): ReceiptTotals {
  const { minLeft, maxRight, minTop, maxBottom } = getReceiptBounds(blocks);
  const hasSpatial = maxRight > minLeft && blocks[0]?.lines?.[0]?.frame;
  const allLines: MlLine[] = blocks.flatMap((b: MlBlock) => b.lines ?? []);
  return extractTotalsFromLines(allLines, country, minLeft, maxRight, !!hasSpatial);
}

/** Text-only fallback when block/frame data is unavailable. */
export function parseReceiptTotalsFromText(text: string, country?: string): ReceiptTotals {
  const lines = text.split('\n').map(t => ({ text: t }));
  return extractTotalsFromLines(lines, country, 0, 1, false);
}

// ─── Tap-on-image amount overlay ─────────────────────────────────────────────

export interface AmountLine {
  id: string;
  text: string;
  label: string;
  amount: number;
  frame: { left: number; top: number; width: number; height: number };
  kind: 'total' | 'subtotal' | 'tax' | 'item';
}

/** Item line for the itemized OCR picker — includes frame data for overlay rendering. */
export interface ItemLine {
  id: string;
  text: string;
  label: string;
  amount: number;
  quantity?: number;
  frame: { left: number; top: number; width: number; height: number };
  kind: 'item' | 'total' | 'subtotal' | 'tax';
}

/** Simplified line type for the raw-lines checklist OCR review. */
export interface RawLine {
  id: string;
  label: string;
  amount: number | null;
  kind: 'item' | 'total' | 'tax' | 'header';
}

/**
 * Extract ALL lines from ML Kit blocks in natural top-to-bottom order.
 * Uses the last numeric token on each line as the price.
 * Applies orphan pairing: a label-only line followed by an amount-only line → merged.
 * Falls back to plain text splitting when no block/frame data is available.
 */
export function extractRawLines(blocks: MlBlock[]): RawLine[] {
  // Collect lines sorted by vertical position
  const allLines: Array<{ text: string; top: number }> = [];
  for (const block of blocks) {
    for (const line of (block.lines ?? [])) {
      const trimmed = line.text?.trim();
      if (!trimmed) continue;
      allLines.push({ text: trimmed, top: line.frame?.top ?? 0 });
    }
  }
  allLines.sort((a, b) => a.top - b.top);

  const raw = allLines.map(l => l.text);
  return _buildRawLines(raw);
}

/** Shared core for both spatial and text-only paths. */
function _buildRawLines(rawTexts: string[]): RawLine[] {
  const result: RawLine[] = [];
  let idx = 0;
  let i = 0;

  while (i < rawTexts.length) {
    const trimmed = rawTexts[i].trim();
    if (!trimmed) { i++; continue; }

    const lower = trimmed.toLowerCase();
    const vals = extractValues(trimmed);
    // Use the LAST extracted value as the price (rightmost number = price column)
    const amount = vals.length > 0 ? vals[vals.length - 1] : null;
    const label = extractLabel(trimmed);

    // Orphan pairing: current line has label but no amount, next has only a number
    if (amount === null && label && i + 1 < rawTexts.length) {
      const nextTrimmed = rawTexts[i + 1].trim();
      const nextLabel = extractLabel(nextTrimmed);
      const nextVals = extractValues(nextTrimmed);
      if (!nextLabel && nextVals.length > 0) {
        const pairedAmount = nextVals[nextVals.length - 1];
        const kind = _classifyKind(lower, pairedAmount);
        result.push({ id: String(idx++), label: label || trimmed.slice(0, 40), amount: pairedAmount, kind });
        i += 2;
        continue;
      }
    }

    const kind = _classifyKind(lower, amount);
    result.push({ id: String(idx++), label: label || trimmed.slice(0, 40), amount, kind });
    i++;
  }

  return result;
}

function _classifyKind(lower: string, amount: number | null): RawLine['kind'] {
  if (TOTAL_KEYWORDS.some(k => lower.includes(k))) return 'total';
  if (SKIP_KEYWORDS.some(k => lower.includes(k))) return 'tax';
  if (amount !== null) return 'item';
  return 'header';
}

/**
 * Extract item lines from ML Kit blocks with frame data for tap-on-image overlay.
 * Returns { lines, hasSpatial } — callers should fall back to classifyOcrLines when
 * hasSpatial is false or lines is empty.
 */
export function extractItemLines(
  blocks: MlBlock[],
  _country?: string,
): { lines: ItemLine[]; hasSpatial: boolean } {
  const { minLeft, maxRight, minTop, maxBottom } = getReceiptBounds(blocks);
  const receiptWidth = maxRight - minLeft;
  const receiptHeight = maxBottom - minTop;
  const hasSpatial = receiptWidth > 0 && receiptHeight > 0 && !!blocks[0]?.lines?.[0]?.frame;

  if (!hasSpatial) return { lines: [], hasSpatial: false };

  const priceXThreshold = minLeft + receiptWidth * 0.45;
  const allLines: MlLine[] = blocks.flatMap(b => b.lines ?? []);
  const result: ItemLine[] = [];
  let idx = 0;

  for (const line of allLines) {
    const trimmed = line.text?.trim();
    if (!trimmed || !line.frame) continue;

    // Filter header/footer
    const lineCenter = line.frame.top + line.frame.height / 2;
    const relY = (lineCenter - minTop) / receiptHeight;
    if (relY < 0.12 || relY > 0.92) continue;

    const lower = trimmed.toLowerCase();
    let kind: ItemLine['kind'] = 'item';
    if (TOTAL_KEYWORDS.some(k => lower.includes(k))) kind = 'total';
    else if (SKIP_KEYWORDS.some(k => lower.includes(k))) kind = 'tax';

    // Spatial label/price split
    const labelWords: string[] = [];
    let rightmostPrice: number | null = null;
    let rightmostX = -Infinity;
    for (const el of (line.elements ?? [])) {
      const elLeft = el.frame?.left ?? line.frame.left;
      const elText = el.text.trim();
      if (!elText) continue;
      const vals = extractValues(elText);
      if (elLeft >= priceXThreshold && vals.length > 0 && elLeft > rightmostX) {
        rightmostX = elLeft;
        rightmostPrice = vals[0];
      } else if (elLeft < priceXThreshold) {
        labelWords.push(elText);
      }
    }
    let label = labelWords.join(' ').trim().slice(0, 40);
    let amount = rightmostPrice;

    // Full-line fallback
    if (amount === null) {
      const vals = extractValues(trimmed);
      if (vals.length > 0) amount = vals[vals.length - 1];
      if (!label) label = extractLabel(trimmed);
    }

    if (!amount || amount <= 0) continue;
    if (!label && kind === 'item') continue;

    // Quantity from label prefix/suffix (e.g. "2x Burger" or "Burger x2")
    let quantity: number | undefined;
    const prefixMatch = label.match(/^(\d+)\s*[x×]\s*/i);
    const suffixMatch = !prefixMatch ? label.match(/\s*[x×]\s*(\d+)$/i) : null;
    if (prefixMatch && +prefixMatch[1] <= 99) {
      quantity = +prefixMatch[1];
      label = label.slice(prefixMatch[0].length).trim();
    } else if (suffixMatch && +suffixMatch[1] <= 99) {
      quantity = +suffixMatch[1];
      label = label.slice(0, label.length - suffixMatch[0].length).trim();
    }

    result.push({ id: `il-${idx++}`, text: trimmed, label, amount, quantity, frame: line.frame, kind });
  }

  result.sort((a, b) => {
    const rank = (k: string) => k === 'total' ? 0 : (k === 'subtotal' || k === 'tax') ? 1 : 2;
    if (rank(a.kind) !== rank(b.kind)) return rank(a.kind) - rank(b.kind);
    return b.amount - a.amount;
  });

  return { lines: result, hasSpatial: true };
}

/**
 * Extract every line that contains a numeric amount from ML Kit blocks.
 * No keyword filtering — returns all amounts so the user can pick.
 * Kind is used for visual styling only (border colour on overlay).
 * Sorted: totals first, then subtotals, then items by value descending.
 */
export function extractAmountLines(blocks: any[], country?: string): AmountLine[] {
  const lang = COUNTRY_LANG[country ?? ''] ?? 'en';
  const totalKws  = getKws(LANG_POSTTAX_KW, lang);
  const subKws    = getKws(LANG_PRETAX_KW,  lang);
  const taxKws    = getKws(LANG_TAX_KW,     lang);

  const { minLeft, maxRight } = getReceiptBounds(blocks);
  const hasSpatial = maxRight > minLeft;
  const priceXThreshold = minLeft + (maxRight - minLeft) * 0.45;

  const result: AmountLine[] = [];
  let idx = 0;

  for (const block of (blocks ?? [])) {
    for (const line of (block.lines ?? [])) {
      const trimmed: string = line.text?.trim();
      if (!trimmed) continue;

      const frame = line.frame as { left: number; top: number; width: number; height: number } | undefined;
      if (!frame) continue; // need frame for overlay

      const lower = trimmed.toLowerCase();

      // Extract amount: prefer rightmost element in price column
      let amount: number | null = null;
      if (hasSpatial && line.elements?.length > 0) {
        let rightmostX = -Infinity;
        for (const el of line.elements) {
          const elLeft: number = el.frame?.left ?? frame.left;
          const vals = extractValues(el.text ?? '');
          if (vals.length > 0 && elLeft >= priceXThreshold && elLeft > rightmostX) {
            rightmostX = elLeft;
            amount = vals[0];
          }
        }
      }
      if (amount === null) {
        const vals = extractValues(trimmed);
        if (vals.length > 0) amount = vals[vals.length - 1]; // last number on line = price
      }
      if (amount === null || amount <= 0) continue;

      const label = extractLabel(trimmed) || trimmed.slice(0, 40);

      let kind: AmountLine['kind'];
      if (totalKws.some(k => lower.includes(k))) kind = 'total';
      else if (subKws.some(k => lower.includes(k))) kind = 'subtotal';
      else if (taxKws.some(k => lower.includes(k))) kind = 'tax';
      else kind = 'item';

      result.push({ id: String(idx++), text: trimmed, label, amount, frame, kind });
    }
  }

  return result.sort((a, b) => {
    const kindOrder = { total: 0, subtotal: 1, tax: 2, item: 3 };
    if (kindOrder[a.kind] !== kindOrder[b.kind]) return kindOrder[a.kind] - kindOrder[b.kind];
    return b.amount - a.amount;
  });
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
