export type ServiceType = 'restaurants' | 'taxis' | 'shops' | 'services';

interface ServiceRates {
  poor: number;
  ok: number;
  excellent: number;
}

export interface TippingEntry {
  currency: string;
  poor: number;     // restaurant rates (default)
  ok: number;
  excellent: number;
  taxi?: ServiceRates;     // if absent, falls back to restaurant rates
  services?: ServiceRates; // if absent, falls back to restaurant rates
  shops?: ServiceRates;    // if absent, defaults to 0/0/0
}

/** Return the poor/ok/excellent tip rates for the given service type. */
export function getTipRates(entry: TippingEntry, serviceType: ServiceType): ServiceRates {
  switch (serviceType) {
    case 'restaurants':
      return { poor: entry.poor, ok: entry.ok, excellent: entry.excellent };
    case 'taxis':
      return entry.taxi ?? { poor: entry.poor, ok: entry.ok, excellent: entry.excellent };
    case 'services':
      return entry.services ?? { poor: entry.poor, ok: entry.ok, excellent: entry.excellent };
    case 'shops':
      return entry.shops ?? { poor: 0, ok: 0, excellent: 0 };
  }
}

export type ContinentKey =
  | 'europa'
  | 'nord-amerika'
  | 'sor-amerika'
  | 'asia'
  | 'oseania'
  | 'afrika'
  | 'mellom-osten';

export const tippingData: Record<ContinentKey, Record<string, TippingEntry>> = {
  europa: {
    Norge: { currency: 'NOK', poor: 0, ok: 5, excellent: 10 },
    Sverige: { currency: 'SEK', poor: 0, ok: 5, excellent: 10 },
    Danmark: { currency: 'DKK', poor: 0, ok: 5, excellent: 10 },
    Finland: { currency: 'EUR', poor: 0, ok: 5, excellent: 10 },
    Island: { currency: 'ISK', poor: 0, ok: 5, excellent: 10 },
    Storbritannia: { currency: 'GBP', poor: 5, ok: 10, excellent: 15 },
    Irland: { currency: 'EUR', poor: 5, ok: 10, excellent: 15 },
    Frankrike: { currency: 'EUR', poor: 0, ok: 5, excellent: 10 },
    Italia: { currency: 'EUR', poor: 0, ok: 5, excellent: 10 },
    Spania: { currency: 'EUR', poor: 0, ok: 5, excellent: 10 },
    Portugal: { currency: 'EUR', poor: 0, ok: 5, excellent: 10 },
    Tyskland: { currency: 'EUR', poor: 0, ok: 5, excellent: 10 },
    Nederland: { currency: 'EUR', poor: 0, ok: 5, excellent: 10 },
    Belgia: { currency: 'EUR', poor: 0, ok: 5, excellent: 10 },
    Sveits: { currency: 'CHF', poor: 0, ok: 5, excellent: 10 },
    Østerrike: { currency: 'EUR', poor: 0, ok: 5, excellent: 10 },
    Hellas: { currency: 'EUR', poor: 5, ok: 10, excellent: 15 },
    Tyrkia: { currency: 'TRY', poor: 5, ok: 10, excellent: 15 },
    Polen: { currency: 'PLN', poor: 0, ok: 10, excellent: 15 },
    Tsjekkia: { currency: 'CZK', poor: 0, ok: 10, excellent: 15 },
    Ungarn: { currency: 'HUF', poor: 0, ok: 10, excellent: 15 },
    Kroatia: { currency: 'EUR', poor: 0, ok: 10, excellent: 15 },
    Romania: { currency: 'RON', poor: 5, ok: 10, excellent: 15 },
    Bulgaria: { currency: 'BGN', poor: 5, ok: 10, excellent: 15 },
    Russland: { currency: 'RUB', poor: 0, ok: 10, excellent: 15 },
  },
  'nord-amerika': {
    USA: { currency: 'USD', poor: 15, ok: 18, excellent: 20 },
    Canada: { currency: 'CAD', poor: 15, ok: 18, excellent: 20 },
    Mexico: { currency: 'MXN', poor: 10, ok: 15, excellent: 20 },
  },
  'sor-amerika': {
    Brasil: { currency: 'BRL', poor: 0, ok: 10, excellent: 15 },
    Argentina: { currency: 'ARS', poor: 0, ok: 10, excellent: 15 },
    Chile: { currency: 'CLP', poor: 0, ok: 10, excellent: 15 },
    Colombia: { currency: 'COP', poor: 0, ok: 10, excellent: 15 },
    Peru: { currency: 'PEN', poor: 5, ok: 10, excellent: 15 },
    Ecuador: { currency: 'USD', poor: 5, ok: 10, excellent: 15 },
    Uruguay: { currency: 'UYU', poor: 0, ok: 10, excellent: 15 },
  },
  asia: {
    Japan: { currency: 'JPY', poor: 0, ok: 0, excellent: 0 },
    Kina: { currency: 'CNY', poor: 0, ok: 0, excellent: 5 },
    'Sør-Korea': { currency: 'KRW', poor: 0, ok: 0, excellent: 5 },
    Thailand: { currency: 'THB', poor: 0, ok: 5, excellent: 10 },
    Vietnam: { currency: 'VND', poor: 0, ok: 5, excellent: 10 },
    Indonesia: { currency: 'IDR', poor: 0, ok: 5, excellent: 10 },
    Malaysia: { currency: 'MYR', poor: 0, ok: 5, excellent: 10 },
    Filippinene: { currency: 'PHP', poor: 0, ok: 5, excellent: 10 },
    Singapore: { currency: 'SGD', poor: 0, ok: 0, excellent: 10 },
    India: { currency: 'INR', poor: 0, ok: 5, excellent: 10 },
    'Sri Lanka': { currency: 'LKR', poor: 0, ok: 5, excellent: 10 },
    Nepal: { currency: 'NPR', poor: 0, ok: 5, excellent: 10 },
    Pakistan: { currency: 'PKR', poor: 0, ok: 5, excellent: 10 },
    Bangladesh: { currency: 'BDT', poor: 0, ok: 5, excellent: 10 },
    'Hong Kong': { currency: 'HKD', poor: 0, ok: 10, excellent: 15 },
    Taiwan: { currency: 'TWD', poor: 0, ok: 0, excellent: 10 },
  },
  oseania: {
    Australia: { currency: 'AUD', poor: 0, ok: 10, excellent: 15 },
    'New Zealand': { currency: 'NZD', poor: 0, ok: 10, excellent: 15 },
    Fiji: { currency: 'FJD', poor: 0, ok: 5, excellent: 10 },
  },
  afrika: {
    'Sør-Afrika': { currency: 'ZAR', poor: 10, ok: 15, excellent: 20 },
    Egypt: { currency: 'EGP', poor: 10, ok: 15, excellent: 20 },
    Marokko: { currency: 'MAD', poor: 5, ok: 10, excellent: 15 },
    Tunisia: { currency: 'TND', poor: 5, ok: 10, excellent: 15 },
    Kenya: { currency: 'KES', poor: 5, ok: 10, excellent: 15 },
    Tanzania: { currency: 'TZS', poor: 5, ok: 10, excellent: 15 },
    Ghana: { currency: 'GHS', poor: 5, ok: 10, excellent: 15 },
    Nigeria: { currency: 'NGN', poor: 5, ok: 10, excellent: 15 },
  },
  'mellom-osten': {
    'De forente arabiske emirater': { currency: 'AED', poor: 0, ok: 10, excellent: 15 },
    'Saudi-Arabia': { currency: 'SAR', poor: 0, ok: 10, excellent: 15 },
    Qatar: { currency: 'QAR', poor: 0, ok: 10, excellent: 15 },
    Kuwait: { currency: 'KWD', poor: 0, ok: 10, excellent: 15 },
    Oman: { currency: 'OMR', poor: 0, ok: 10, excellent: 15 },
    Bahrain: { currency: 'BHD', poor: 0, ok: 10, excellent: 15 },
    Israel: { currency: 'ILS', poor: 10, ok: 12, excellent: 15 },
    Libanon: { currency: 'LBP', poor: 5, ok: 10, excellent: 15 },
    Jordan: { currency: 'JOD', poor: 5, ok: 10, excellent: 15 },
  },
};

export const continentKeys: ContinentKey[] = [
  'europa',
  'nord-amerika',
  'sor-amerika',
  'asia',
  'oseania',
  'afrika',
  'mellom-osten',
];

// Default fallback NOK exchange rates (January 2026)
export const defaultExchangeRates: Record<string, number> = {
  USD: 10.8, EUR: 11.5, GBP: 13.5, SEK: 1.0, DKK: 1.55,
  CHF: 12.2, JPY: 0.073, CNY: 1.48, AUD: 6.8, CAD: 7.6,
  NZD: 6.3, HKD: 1.38, SGD: 8.0, KRW: 0.0076, THB: 0.31,
  MXN: 0.53, BRL: 1.78, INR: 0.13, ZAR: 0.58, AED: 2.94,
  TRY: 0.31, PLN: 2.65, CZK: 0.45, HUF: 0.028, RON: 2.32,
  BGN: 5.88, RUB: 0.11, ISK: 0.078, ILS: 2.95, ARS: 0.011,
  CLP: 0.011, COP: 0.0025, PEN: 2.85, UYU: 0.25, VND: 0.00043,
  IDR: 0.00067, MYR: 2.35, PHP: 0.19, LKR: 0.036, NPR: 0.081,
  PKR: 0.039, BDT: 0.090, TWD: 0.33, FJD: 4.7, EGP: 0.21,
  MAD: 1.08, TND: 3.45, KES: 0.084, TZS: 0.0041, GHS: 0.71,
  NGN: 0.0068, SAR: 2.88, QAR: 2.97, KWD: 35.2, OMR: 28.1,
  BHD: 28.6, LBP: 0.00012, JOD: 15.2,
};
