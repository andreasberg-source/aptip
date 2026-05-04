// One-off script: generates LOCALIZED_COUNTRY_NAMES and LOCALIZED_CURRENCY_NAMES
// using Node.js Intl (full ICU) and prints ready-to-paste TypeScript constants.
// Run with: node scripts/generate-locale-data.js

const LOCALES = { en: 'en-US', no: 'nb', fr: 'fr-FR', es: 'es-ES', de: 'de-DE' };

const COUNTRY_ISO_CODES = {
  // Europa
  Norge: 'NO', Sverige: 'SE', Danmark: 'DK', Finland: 'FI', Island: 'IS',
  Storbritannia: 'GB', Irland: 'IE', Frankrike: 'FR', Italia: 'IT', Spania: 'ES',
  Portugal: 'PT', Tyskland: 'DE', Nederland: 'NL', Belgia: 'BE', Sveits: 'CH',
  Østerrike: 'AT', Hellas: 'GR', Tyrkia: 'TR', Polen: 'PL', Tsjekkia: 'CZ',
  Ungarn: 'HU', Kroatia: 'HR', Romania: 'RO', Bulgaria: 'BG', Russland: 'RU',
  Albania: 'AL', Andorra: 'AD', Armenia: 'AM', 'Bosnia-Hercegovina': 'BA',
  Hviterussland: 'BY', Georgia: 'GE', Kypros: 'CY', Estland: 'EE',
  Kosovo: 'XK', Latvia: 'LV', Liechtenstein: 'LI', Litauen: 'LT',
  Luxembourg: 'LU', Malta: 'MT', Moldova: 'MD', Monaco: 'MC',
  Montenegro: 'ME', 'Nord-Makedonia': 'MK', 'San Marino': 'SM',
  Serbia: 'RS', Slovakia: 'SK', Slovenia: 'SI', Ukraina: 'UA',
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
};

const CURRENCY_CODES = [
  'NOK','USD','EUR','GBP','SEK','DKK','CHF','ISK','JPY','CNY','KRW','HKD','TWD',
  'SGD','THB','VND','IDR','MYR','PHP','INR','LKR','NPR','PKR','BDT','AUD','NZD',
  'FJD','CAD','MXN','BRL','ARS','CLP','COP','PEN','UYU','ZAR','EGP','MAD','TND',
  'KES','TZS','GHS','NGN','AED','SAR','QAR','KWD','OMR','BHD','ILS','LBP','JOD',
  'TRY','PLN','CZK','HUF','RON','BGN','RUB','ALL','AMD','AZN','BAM','BND','BOB',
  'BSD','BTN','BWP','BYN','BZD','CDF','CRC','CUP','CVE','DJF','DOP','DZD','ERN',
  'ETB','GEL','GMD','GNF','GTQ','GYD','HNL','HTG','IQD','IRR','JMD','KGS','KHR',
  'KMF','KPW','KZT','LAK','LRD','LSL','LYD','MDL','MGA','MKD','MMK','MNT','MRU',
  'MUR','MVR','MWK','MZN','NAD','NIO','PGK','PYG','RSD','RWF','SBD','SCR','SDG',
  'SLE','SOS','SRD','SSP','STN','SYP','SZL','TJS','TMT','TOP','TTD','UAH','UGX',
  'UZS','VES','VUV','WST','XAF','XCD','XOF','YER','ZMW','AFN','AOA','BIF','BBD',
];

function getRegionDN(bcp47) {
  try { return new Intl.DisplayNames([bcp47], { type: 'region' }); } catch { return null; }
}
function getCurrencyDN(bcp47) {
  try { return new Intl.DisplayNames([bcp47], { type: 'currency' }); } catch { return null; }
}

// Build country table
const countryTable = {};
for (const [key, iso] of Object.entries(COUNTRY_ISO_CODES)) {
  const entry = {};
  for (const [lang, bcp47] of Object.entries(LOCALES)) {
    const dn = getRegionDN(bcp47);
    entry[lang] = (dn && dn.of(iso)) || key;
  }
  countryTable[key] = entry;
}

// Build currency table
const currencyTable = {};
for (const code of CURRENCY_CODES) {
  const entry = {};
  for (const [lang, bcp47] of Object.entries(LOCALES)) {
    const dn = getCurrencyDN(bcp47);
    entry[lang] = (dn && dn.of(code)) || code;
  }
  currencyTable[code] = entry;
}

// Output
const esc = s => s.replace(/\\/g, '\\\\').replace(/'/g, "\\'");

let out = '// AUTO-GENERATED by scripts/generate-locale-data.js — do not edit manually\n\n';

out += 'export const LOCALIZED_COUNTRY_NAMES: Record<string, Record<string, string>> = {\n';
for (const [key, entry] of Object.entries(countryTable)) {
  out += `  '${esc(key)}': { en: '${esc(entry.en)}', no: '${esc(entry.no)}', fr: '${esc(entry.fr)}', es: '${esc(entry.es)}', de: '${esc(entry.de)}' },\n`;
}
out += '};\n\n';

out += 'export const LOCALIZED_CURRENCY_NAMES: Record<string, Record<string, string>> = {\n';
for (const [code, entry] of Object.entries(currencyTable)) {
  out += `  ${code}: { en: '${esc(entry.en)}', no: '${esc(entry.no)}', fr: '${esc(entry.fr)}', es: '${esc(entry.es)}', de: '${esc(entry.de)}' },\n`;
}
out += '};\n';

require('fs').writeFileSync(require('path').join(__dirname, 'locale-data.ts'), out);
console.log('Written to scripts/locale-data.ts');
