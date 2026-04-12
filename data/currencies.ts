/** Human-readable names for all currencies supported by the app. */
export const CURRENCY_NAMES: Record<string, string> = {
  NOK: 'Norwegian Krone',
  USD: 'US Dollar',
  EUR: 'Euro',
  GBP: 'British Pound',
  SEK: 'Swedish Krona',
  DKK: 'Danish Krone',
  CHF: 'Swiss Franc',
  ISK: 'Icelandic Króna',
  JPY: 'Japanese Yen',
  CNY: 'Chinese Yuan',
  KRW: 'South Korean Won',
  HKD: 'Hong Kong Dollar',
  TWD: 'New Taiwan Dollar',
  SGD: 'Singapore Dollar',
  THB: 'Thai Baht',
  VND: 'Vietnamese Dong',
  IDR: 'Indonesian Rupiah',
  MYR: 'Malaysian Ringgit',
  PHP: 'Philippine Peso',
  INR: 'Indian Rupee',
  LKR: 'Sri Lankan Rupee',
  NPR: 'Nepalese Rupee',
  PKR: 'Pakistani Rupee',
  BDT: 'Bangladeshi Taka',
  AUD: 'Australian Dollar',
  NZD: 'New Zealand Dollar',
  FJD: 'Fijian Dollar',
  CAD: 'Canadian Dollar',
  MXN: 'Mexican Peso',
  BRL: 'Brazilian Real',
  ARS: 'Argentine Peso',
  CLP: 'Chilean Peso',
  COP: 'Colombian Peso',
  PEN: 'Peruvian Sol',
  UYU: 'Uruguayan Peso',
  ZAR: 'South African Rand',
  EGP: 'Egyptian Pound',
  MAD: 'Moroccan Dirham',
  TND: 'Tunisian Dinar',
  KES: 'Kenyan Shilling',
  TZS: 'Tanzanian Shilling',
  GHS: 'Ghanaian Cedi',
  NGN: 'Nigerian Naira',
  AED: 'UAE Dirham',
  SAR: 'Saudi Riyal',
  QAR: 'Qatari Riyal',
  KWD: 'Kuwaiti Dinar',
  OMR: 'Omani Rial',
  BHD: 'Bahraini Dinar',
  ILS: 'Israeli New Shekel',
  LBP: 'Lebanese Pound',
  JOD: 'Jordanian Dinar',
  TRY: 'Turkish Lira',
  PLN: 'Polish Złoty',
  CZK: 'Czech Koruna',
  HUF: 'Hungarian Forint',
  RON: 'Romanian Leu',
  BGN: 'Bulgarian Lev',
  RUB: 'Russian Ruble',
};

/** Sorted list of [code, name] pairs for display in pickers. */
export const SORTED_CURRENCIES: { code: string; name: string }[] = Object.entries(CURRENCY_NAMES)
  .map(([code, name]) => ({ code, name }))
  .sort((a, b) => a.name.localeCompare(b.name));

/** Infer a likely home currency from the device locale's currency code. Falls back to USD. */
export function detectCurrencyFromLocale(currencyCode: string | null | undefined): string {
  if (!currencyCode) return 'USD';
  const upper = currencyCode.toUpperCase();
  return upper in CURRENCY_NAMES ? upper : 'USD';
}
