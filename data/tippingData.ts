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
    Albania: { currency: 'ALL', poor: 0, ok: 5, excellent: 10 },
    Andorra: { currency: 'EUR', poor: 0, ok: 5, excellent: 10 },
    Armenia: { currency: 'AMD', poor: 5, ok: 10, excellent: 15 },
    'Bosnia-Hercegovina': { currency: 'BAM', poor: 0, ok: 5, excellent: 10 },
    Hviterussland: { currency: 'BYN', poor: 0, ok: 5, excellent: 10 },
    Georgia: { currency: 'GEL', poor: 5, ok: 10, excellent: 15 },
    Kypros: { currency: 'EUR', poor: 5, ok: 10, excellent: 15 },
    Estland: { currency: 'EUR', poor: 0, ok: 5, excellent: 10 },
    Kosovo: { currency: 'EUR', poor: 0, ok: 5, excellent: 10 },
    Latvia: { currency: 'EUR', poor: 0, ok: 5, excellent: 10 },
    Liechtenstein: { currency: 'CHF', poor: 0, ok: 5, excellent: 10 },
    Litauen: { currency: 'EUR', poor: 0, ok: 5, excellent: 10 },
    Luxembourg: { currency: 'EUR', poor: 0, ok: 5, excellent: 10 },
    Malta: { currency: 'EUR', poor: 5, ok: 10, excellent: 15 },
    Moldova: { currency: 'MDL', poor: 0, ok: 5, excellent: 10 },
    Monaco: { currency: 'EUR', poor: 0, ok: 5, excellent: 10 },
    Montenegro: { currency: 'EUR', poor: 5, ok: 10, excellent: 15 },
    'Nord-Makedonia': { currency: 'MKD', poor: 0, ok: 5, excellent: 10 },
    'San Marino': { currency: 'EUR', poor: 0, ok: 5, excellent: 10 },
    Serbia: { currency: 'RSD', poor: 0, ok: 5, excellent: 10 },
    Slovakia: { currency: 'EUR', poor: 0, ok: 5, excellent: 10 },
    Slovenia: { currency: 'EUR', poor: 0, ok: 5, excellent: 10 },
    Ukraina: { currency: 'UAH', poor: 5, ok: 10, excellent: 15 },
  },
  'nord-amerika': {
    USA: { currency: 'USD', poor: 15, ok: 18, excellent: 20 },
    Canada: { currency: 'CAD', poor: 15, ok: 18, excellent: 20 },
    Mexico: { currency: 'MXN', poor: 10, ok: 15, excellent: 20 },
    'Antigua og Barbuda': { currency: 'XCD', poor: 10, ok: 15, excellent: 20 },
    Bahamas: { currency: 'BSD', poor: 10, ok: 15, excellent: 20 },
    Barbados: { currency: 'BBD', poor: 10, ok: 15, excellent: 20 },
    Belize: { currency: 'BZD', poor: 10, ok: 15, excellent: 20 },
    'Costa Rica': { currency: 'CRC', poor: 10, ok: 15, excellent: 20 },
    Cuba: { currency: 'CUP', poor: 10, ok: 15, excellent: 20 },
    'Den dominikanske republikk': { currency: 'DOP', poor: 10, ok: 15, excellent: 20 },
    Dominica: { currency: 'XCD', poor: 10, ok: 15, excellent: 20 },
    'El Salvador': { currency: 'USD', poor: 10, ok: 15, excellent: 20 },
    Grenada: { currency: 'XCD', poor: 10, ok: 15, excellent: 20 },
    Guatemala: { currency: 'GTQ', poor: 10, ok: 15, excellent: 20 },
    Haiti: { currency: 'HTG', poor: 5, ok: 10, excellent: 15 },
    Honduras: { currency: 'HNL', poor: 10, ok: 15, excellent: 20 },
    Jamaica: { currency: 'JMD', poor: 10, ok: 15, excellent: 20 },
    Nicaragua: { currency: 'NIO', poor: 10, ok: 15, excellent: 20 },
    Panama: { currency: 'USD', poor: 10, ok: 15, excellent: 20 },
    'Saint Kitts og Nevis': { currency: 'XCD', poor: 10, ok: 15, excellent: 20 },
    'Saint Lucia': { currency: 'XCD', poor: 10, ok: 15, excellent: 20 },
    'Saint Vincent og Grenadinene': { currency: 'XCD', poor: 10, ok: 15, excellent: 20 },
    'Trinidad og Tobago': { currency: 'TTD', poor: 10, ok: 15, excellent: 20 },
  },
  'sor-amerika': {
    Brasil: { currency: 'BRL', poor: 0, ok: 10, excellent: 15 },
    Argentina: { currency: 'ARS', poor: 0, ok: 10, excellent: 15 },
    Chile: { currency: 'CLP', poor: 0, ok: 10, excellent: 15 },
    Colombia: { currency: 'COP', poor: 0, ok: 10, excellent: 15 },
    Peru: { currency: 'PEN', poor: 5, ok: 10, excellent: 15 },
    Ecuador: { currency: 'USD', poor: 5, ok: 10, excellent: 15 },
    Uruguay: { currency: 'UYU', poor: 0, ok: 10, excellent: 15 },
    Bolivia: { currency: 'BOB', poor: 5, ok: 10, excellent: 15 },
    Guyana: { currency: 'GYD', poor: 10, ok: 15, excellent: 20 },
    Paraguay: { currency: 'PYG', poor: 5, ok: 10, excellent: 15 },
    Surinam: { currency: 'SRD', poor: 5, ok: 10, excellent: 15 },
    Venezuela: { currency: 'VES', poor: 5, ok: 10, excellent: 15 },
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
    Afghanistan: { currency: 'AFN', poor: 0, ok: 5, excellent: 10 },
    Aserbajdsjan: { currency: 'AZN', poor: 5, ok: 10, excellent: 15 },
    Bhutan: { currency: 'BTN', poor: 5, ok: 10, excellent: 15 },
    Brunei: { currency: 'BND', poor: 0, ok: 5, excellent: 10 },
    Kambodsja: { currency: 'KHR', poor: 5, ok: 10, excellent: 15 },
    Kasakhstan: { currency: 'KZT', poor: 5, ok: 10, excellent: 15 },
    Kirgisistan: { currency: 'KGS', poor: 5, ok: 10, excellent: 10 },
    Laos: { currency: 'LAK', poor: 5, ok: 10, excellent: 15 },
    Maldivene: { currency: 'MVR', poor: 5, ok: 10, excellent: 15 },
    Mongolia: { currency: 'MNT', poor: 0, ok: 5, excellent: 10 },
    Myanmar: { currency: 'MMK', poor: 5, ok: 10, excellent: 15 },
    'Nord-Korea': { currency: 'KPW', poor: 0, ok: 0, excellent: 0 },
    Tadsjikistan: { currency: 'TJS', poor: 0, ok: 5, excellent: 10 },
    Turkmenistan: { currency: 'TMT', poor: 0, ok: 5, excellent: 10 },
    Usbekistan: { currency: 'UZS', poor: 5, ok: 10, excellent: 15 },
    'Øst-Timor': { currency: 'USD', poor: 5, ok: 10, excellent: 15 },
  },
  oseania: {
    Australia: { currency: 'AUD', poor: 0, ok: 10, excellent: 15 },
    'New Zealand': { currency: 'NZD', poor: 0, ok: 10, excellent: 15 },
    Fiji: { currency: 'FJD', poor: 0, ok: 5, excellent: 10 },
    Kiribati: { currency: 'AUD', poor: 0, ok: 5, excellent: 10 },
    'Marshalløyene': { currency: 'USD', poor: 5, ok: 10, excellent: 15 },
    'Mikronesiaføderasjonen': { currency: 'USD', poor: 5, ok: 10, excellent: 15 },
    Nauru: { currency: 'AUD', poor: 0, ok: 5, excellent: 10 },
    Palau: { currency: 'USD', poor: 5, ok: 10, excellent: 15 },
    'Papua Ny-Guinea': { currency: 'PGK', poor: 5, ok: 10, excellent: 15 },
    Samoa: { currency: 'WST', poor: 0, ok: 5, excellent: 10 },
    'Salomonøyene': { currency: 'SBD', poor: 0, ok: 5, excellent: 10 },
    Tonga: { currency: 'TOP', poor: 0, ok: 5, excellent: 10 },
    Tuvalu: { currency: 'AUD', poor: 0, ok: 5, excellent: 10 },
    Vanuatu: { currency: 'VUV', poor: 5, ok: 10, excellent: 15 },
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
    Algerie: { currency: 'DZD', poor: 5, ok: 10, excellent: 15 },
    Angola: { currency: 'AOA', poor: 5, ok: 10, excellent: 15 },
    Benin: { currency: 'XOF', poor: 5, ok: 10, excellent: 15 },
    Botswana: { currency: 'BWP', poor: 5, ok: 10, excellent: 15 },
    'Burkina Faso': { currency: 'XOF', poor: 5, ok: 10, excellent: 15 },
    Burundi: { currency: 'BIF', poor: 5, ok: 10, excellent: 15 },
    Kamerun: { currency: 'XAF', poor: 5, ok: 10, excellent: 15 },
    'Kapp Verde': { currency: 'CVE', poor: 5, ok: 10, excellent: 15 },
    'Den sentralafrikanske republikk': { currency: 'XAF', poor: 5, ok: 10, excellent: 15 },
    Tsjad: { currency: 'XAF', poor: 5, ok: 10, excellent: 15 },
    Komorene: { currency: 'KMF', poor: 5, ok: 10, excellent: 15 },
    'Kongo-Brazzaville': { currency: 'XAF', poor: 5, ok: 10, excellent: 15 },
    'Kongo-Kinshasa': { currency: 'CDF', poor: 5, ok: 10, excellent: 15 },
    Djibouti: { currency: 'DJF', poor: 5, ok: 10, excellent: 15 },
    'Ekvatorial-Guinea': { currency: 'XAF', poor: 5, ok: 10, excellent: 15 },
    Eritrea: { currency: 'ERN', poor: 5, ok: 10, excellent: 15 },
    Etiopia: { currency: 'ETB', poor: 5, ok: 10, excellent: 15 },
    Gabon: { currency: 'XAF', poor: 5, ok: 10, excellent: 15 },
    Gambia: { currency: 'GMD', poor: 5, ok: 10, excellent: 15 },
    Guinea: { currency: 'GNF', poor: 5, ok: 10, excellent: 15 },
    'Guinea-Bissau': { currency: 'XOF', poor: 5, ok: 10, excellent: 15 },
    Elfenbenskysten: { currency: 'XOF', poor: 5, ok: 10, excellent: 15 },
    Lesotho: { currency: 'LSL', poor: 5, ok: 10, excellent: 15 },
    Liberia: { currency: 'LRD', poor: 5, ok: 10, excellent: 15 },
    Libya: { currency: 'LYD', poor: 0, ok: 5, excellent: 10 },
    Madagaskar: { currency: 'MGA', poor: 5, ok: 10, excellent: 15 },
    Malawi: { currency: 'MWK', poor: 5, ok: 10, excellent: 15 },
    Mali: { currency: 'XOF', poor: 5, ok: 10, excellent: 15 },
    Mauritania: { currency: 'MRU', poor: 5, ok: 10, excellent: 15 },
    Mauritius: { currency: 'MUR', poor: 5, ok: 10, excellent: 15 },
    Mosambik: { currency: 'MZN', poor: 5, ok: 10, excellent: 15 },
    Namibia: { currency: 'NAD', poor: 10, ok: 15, excellent: 20 },
    Niger: { currency: 'XOF', poor: 5, ok: 10, excellent: 15 },
    Rwanda: { currency: 'RWF', poor: 5, ok: 10, excellent: 15 },
    'São Tomé og Príncipe': { currency: 'STN', poor: 5, ok: 10, excellent: 15 },
    Senegal: { currency: 'XOF', poor: 5, ok: 10, excellent: 15 },
    Seychellene: { currency: 'SCR', poor: 5, ok: 10, excellent: 15 },
    'Sierra Leone': { currency: 'SLE', poor: 5, ok: 10, excellent: 15 },
    Somalia: { currency: 'SOS', poor: 0, ok: 5, excellent: 10 },
    'Sør-Sudan': { currency: 'SSP', poor: 5, ok: 10, excellent: 15 },
    Sudan: { currency: 'SDG', poor: 5, ok: 10, excellent: 15 },
    Eswatini: { currency: 'SZL', poor: 5, ok: 10, excellent: 15 },
    Togo: { currency: 'XOF', poor: 5, ok: 10, excellent: 15 },
    Uganda: { currency: 'UGX', poor: 5, ok: 10, excellent: 15 },
    Zambia: { currency: 'ZMW', poor: 5, ok: 10, excellent: 15 },
    Zimbabwe: { currency: 'USD', poor: 5, ok: 10, excellent: 15 },
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
    Iran: { currency: 'IRR', poor: 5, ok: 10, excellent: 15 },
    Irak: { currency: 'IQD', poor: 5, ok: 10, excellent: 15 },
    Palestina: { currency: 'ILS', poor: 5, ok: 10, excellent: 15 },
    Syria: { currency: 'SYP', poor: 5, ok: 10, excellent: 15 },
    Jemen: { currency: 'YER', poor: 5, ok: 10, excellent: 15 },
  },
};

export const COUNTRY_ISO_CODES: Record<string, string> = {
  // Europa
  Norge: 'NO', Sverige: 'SE', Danmark: 'DK', Finland: 'FI', Island: 'IS',
  Storbritannia: 'GB', Irland: 'IE', Frankrike: 'FR', Italia: 'IT', Spania: 'ES',
  Portugal: 'PT', Tyskland: 'DE', Nederland: 'NL', Belgia: 'BE', Sveits: 'CH',
  Østerrike: 'AT', Hellas: 'GR', Tyrkia: 'TR', Polen: 'PL', Tsjekkia: 'CZ',
  Ungarn: 'HU', Kroatia: 'HR', Romania: 'RO', Bulgaria: 'BG', Russland: 'RU',
  // Nord-Amerika
  USA: 'US', Canada: 'CA', Mexico: 'MX',
  'Antigua og Barbuda': 'AG', Bahamas: 'BS', Barbados: 'BB', Belize: 'BZ',
  'Costa Rica': 'CR', Cuba: 'CU', 'Den dominikanske republikk': 'DO', Dominica: 'DM',
  'El Salvador': 'SV', Grenada: 'GD', Guatemala: 'GT', Haiti: 'HT', Honduras: 'HN',
  Jamaica: 'JM', Nicaragua: 'NI', Panama: 'PA', 'Saint Kitts og Nevis': 'KN',
  'Saint Lucia': 'LC', 'Saint Vincent og Grenadinene': 'VC', 'Trinidad og Tobago': 'TT',
  // Sør-Amerika
  Brasil: 'BR', Argentina: 'AR', Chile: 'CL', Colombia: 'CO', Peru: 'PE',
  Ecuador: 'EC', Uruguay: 'UY',
  Bolivia: 'BO', Guyana: 'GY', Paraguay: 'PY', Surinam: 'SR', Venezuela: 'VE',
  // Asia
  Japan: 'JP', Kina: 'CN', 'Sør-Korea': 'KR', Thailand: 'TH', Vietnam: 'VN',
  Indonesia: 'ID', Malaysia: 'MY', Filippinene: 'PH', Singapore: 'SG', India: 'IN',
  'Sri Lanka': 'LK', Nepal: 'NP', Pakistan: 'PK', Bangladesh: 'BD',
  'Hong Kong': 'HK', Taiwan: 'TW',
  Afghanistan: 'AF', Aserbajdsjan: 'AZ', Bhutan: 'BT', Brunei: 'BN',
  Kambodsja: 'KH', Kasakhstan: 'KZ', Kirgisistan: 'KG', Laos: 'LA',
  Maldivene: 'MV', Mongolia: 'MN', Myanmar: 'MM', 'Nord-Korea': 'KP',
  Tadsjikistan: 'TJ', Turkmenistan: 'TM', Usbekistan: 'UZ', 'Øst-Timor': 'TL',
  // Oseania
  Australia: 'AU', 'New Zealand': 'NZ', Fiji: 'FJ',
  Kiribati: 'KI', Marshalløyene: 'MH', Mikronesiaføderasjonen: 'FM', Nauru: 'NR',
  Palau: 'PW', 'Papua Ny-Guinea': 'PG', Samoa: 'WS', Salomonøyene: 'SB',
  Tonga: 'TO', Tuvalu: 'TV', Vanuatu: 'VU',
  // Afrika
  'Sør-Afrika': 'ZA', Egypt: 'EG', Marokko: 'MA', Tunisia: 'TN',
  Kenya: 'KE', Tanzania: 'TZ', Ghana: 'GH', Nigeria: 'NG',
  Algerie: 'DZ', Angola: 'AO', Benin: 'BJ', Botswana: 'BW',
  'Burkina Faso': 'BF', Burundi: 'BI', Kamerun: 'CM', 'Kapp Verde': 'CV',
  'Den sentralafrikanske republikk': 'CF', Tsjad: 'TD', Komorene: 'KM',
  'Kongo-Brazzaville': 'CG', 'Kongo-Kinshasa': 'CD', Djibouti: 'DJ',
  'Ekvatorial-Guinea': 'GQ', Eritrea: 'ER', Etiopia: 'ET', Gabon: 'GA',
  Gambia: 'GM', Guinea: 'GN', 'Guinea-Bissau': 'GW', Elfenbenskysten: 'CI',
  Lesotho: 'LS', Liberia: 'LR', Libya: 'LY', Madagaskar: 'MG',
  Malawi: 'MW', Mali: 'ML', Mauritania: 'MR', Mauritius: 'MU',
  Mosambik: 'MZ', Namibia: 'NA', Niger: 'NE', Rwanda: 'RW',
  'São Tomé og Príncipe': 'ST', Senegal: 'SN', Seychellene: 'SC',
  'Sierra Leone': 'SL', Somalia: 'SO', 'Sør-Sudan': 'SS', Sudan: 'SD',
  Eswatini: 'SZ', Togo: 'TG', Uganda: 'UG', Zambia: 'ZM', Zimbabwe: 'ZW',
  // Mellom-Østen
  'De forente arabiske emirater': 'AE', 'Saudi-Arabia': 'SA', Qatar: 'QA',
  Kuwait: 'KW', Oman: 'OM', Bahrain: 'BH', Israel: 'IL', Libanon: 'LB', Jordan: 'JO',
  Iran: 'IR', Irak: 'IQ', Palestina: 'PS', Syria: 'SY', Jemen: 'YE',
  // Europa (additions)
  Albania: 'AL', Andorra: 'AD', Armenia: 'AM', 'Bosnia-Hercegovina': 'BA',
  Hviterussland: 'BY', Georgia: 'GE', Kypros: 'CY', Estland: 'EE',
  Kosovo: 'XK', Latvia: 'LV', Liechtenstein: 'LI', Litauen: 'LT',
  Luxembourg: 'LU', Malta: 'MT', Moldova: 'MD', Monaco: 'MC',
  Montenegro: 'ME', 'Nord-Makedonia': 'MK', 'San Marino': 'SM',
  Serbia: 'RS', Slovakia: 'SK', Slovenia: 'SI', Ukraina: 'UA',
};

const COUNTRY_LOCALE_MAP: Record<string, string> = {
  no: 'nb', en: 'en-US', fr: 'fr-FR', es: 'es-ES', de: 'de-DE',
};

export function getLocalizedCountryName(key: string, locale: string): string {
  const iso = COUNTRY_ISO_CODES[key];
  if (!iso) return key;
  const bcp47 = COUNTRY_LOCALE_MAP[locale] ?? locale;
  try {
    const dn = new Intl.DisplayNames([bcp47], { type: 'region' });
    return dn.of(iso) ?? key;
  } catch {
    return key;
  }
}

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
  // New currencies
  ALL: 0.11, AMD: 0.028, AZN: 6.3, BAM: 5.88, BND: 8.0, BOB: 1.55,
  BSD: 10.8, BTN: 0.13, BWP: 0.78, BYN: 3.1, BZD: 5.4, CDF: 0.0037,
  CRC: 0.020, CUP: 0.45, CVE: 0.104, DJF: 0.061, DOP: 0.18, DZD: 0.080,
  ERN: 0.72, ETB: 0.083, GEL: 3.9, GMD: 0.14, GNF: 0.00125, GTQ: 1.38,
  GYD: 0.052, HNL: 0.43, HTG: 0.082, IQD: 0.0083, IRR: 0.00026,
  JMD: 0.069, KGS: 0.12, KHR: 0.0026, KMF: 0.024, KPW: 0.012,
  KZT: 0.021, LAK: 0.00052, LRD: 0.056, LSL: 0.58, LYD: 2.2,
  MDL: 0.60, MGA: 0.0024, MKD: 0.187, MMK: 0.0051, MNT: 0.0031,
  MRU: 0.27, MUR: 0.24, MVR: 0.70, MWK: 0.0063, MZN: 0.168,
  NAD: 0.58, NIO: 0.30, PGK: 2.9, PYG: 0.0014, RSD: 0.10,
  RWF: 0.0073, SBD: 1.3, SCR: 0.79, SDG: 0.018, SLE: 0.49,
  SOS: 0.019, SRD: 0.28, SSP: 0.0083, STN: 0.46, SYP: 0.00083,
  SZL: 0.58, TJS: 0.99, TMT: 3.1, TOP: 4.5, TTD: 1.6,
  UAH: 0.26, UGX: 0.0029, UZS: 0.00084, VES: 0.00029, VUV: 0.090,
  WST: 3.8, XAF: 0.018, XCD: 4.0, XOF: 0.018, YER: 0.043,
  ZMW: 0.39, AFN: 0.14, AOA: 0.012, BIF: 0.0037, BBD: 5.4,
};
