import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { requestWidgetUpdate } from 'react-native-android-widget';

import { tippingData, getTipRates, ContinentKey, ServiceType } from '../data/tippingData';
import { ISO_TO_TIPPING } from '../data/countryCodeMap';
import { calculateTip } from '../utils/tipCalculations';

export const WIDGET_STATE_KEY = 'widget_tip_state';
export const WIDGET_NAME = 'TipWidget';

export type Satisfaction = 'poor' | 'ok' | 'excellent';

export interface WidgetState {
  isoCode: string;
  country: string;
  continent: ContinentKey;
  currency: string;
  amount: number;
  satisfaction: Satisfaction;
  serviceType: ServiceType;
  tipAmount: number;
  total: number;
  locationGranted: boolean;
}

export const SATISFACTION_EMOJI: Record<Satisfaction, string> = {
  poor: '😕',
  ok: '😊',
  excellent: '🤩',
};

export const SERVICE_EMOJI: Record<ServiceType, string> = {
  restaurants: '🍽️',
  taxis: '🚕',
  shops: '🛍️',
  services: '✂️',
};

const DEFAULT_STATE: WidgetState = {
  isoCode: 'NO',
  country: 'Norge',
  continent: 'europa',
  currency: 'NOK',
  amount: 0,
  satisfaction: 'ok',
  serviceType: 'restaurants',
  tipAmount: 0,
  total: 0,
  locationGranted: false,
};

/** Converts ISO 3166-1 alpha-2 code to flag emoji, e.g. 'NO' → '🇳🇴' */
export function isoToFlag(iso: string): string {
  return [...iso.toUpperCase()]
    .map(c => String.fromCodePoint(0x1F1E6 - 65 + c.codePointAt(0)!))
    .join('');
}

/** Recompute tipAmount and total from current state. */
export function computeTip(state: WidgetState): Pick<WidgetState, 'tipAmount' | 'total'> {
  const entry = tippingData[state.continent]?.[state.country];
  if (!entry || state.amount <= 0) return { tipAmount: 0, total: state.amount };

  const rates = getTipRates(entry, state.serviceType);
  const pct = rates[state.satisfaction];
  const result = calculateTip(state.amount, pct, state.currency, 1);
  return { tipAmount: result.tipAmount, total: result.total };
}

export async function getWidgetState(): Promise<WidgetState> {
  try {
    const raw = await AsyncStorage.getItem(WIDGET_STATE_KEY);
    if (raw) return { ...DEFAULT_STATE, ...JSON.parse(raw) };
  } catch { /* fall through */ }
  return { ...DEFAULT_STATE };
}

export async function saveWidgetState(state: WidgetState): Promise<void> {
  await AsyncStorage.setItem(WIDGET_STATE_KEY, JSON.stringify(state));
}

export async function saveAndRefreshWidget(state: WidgetState): Promise<void> {
  await saveWidgetState(state);
  await requestWidgetUpdate({ widgetName: WIDGET_NAME, renderWidget: () => null });
}

export interface DetectedLocation {
  isoCode: string;
  country: string;
  continent: ContinentKey;
  currency: string;
}

/** Detect current country from GPS. Returns null if permission denied or country unknown. */
export async function detectCountry(): Promise<DetectedLocation | null> {
  try {
    const { status } = await Location.getForegroundPermissionsAsync();
    if (status !== 'granted') return null;

    const pos =
      (await Location.getLastKnownPositionAsync()) ??
      (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low }));
    if (!pos) return null;

    const [geo] = await Location.reverseGeocodeAsync(pos.coords);
    const iso = geo?.isoCountryCode ?? '';
    const match = ISO_TO_TIPPING[iso];
    if (!match) return null;

    const entry = tippingData[match.continent]?.[match.country];
    return {
      isoCode: iso,
      country: match.country,
      continent: match.continent,
      currency: entry?.currency ?? 'USD',
    };
  } catch {
    return null;
  }
}
