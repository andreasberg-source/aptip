import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { defaultExchangeRates, tippingData } from '../data/tippingData';

const RATES_KEY = 'exchange_rates';

interface ExchangeRateState {
  rates: Record<string, number>;
  lastUpdated: string | null;
  lastUpdatedISO: string | null;
  isLoading: boolean;
  error: string | null;
  load: () => Promise<void>;
  updateRates: () => Promise<number>;
  getRate: (currency: string) => number | null;
  /** Convert `amount` in `fromCurrency` to `toCurrency` using NOK as the cross-rate base.
   *  Returns null if either rate is missing. */
  getHomeAmount: (amount: number, fromCurrency: string, toCurrency: string) => number | null;
}

export const useExchangeRateStore = create<ExchangeRateState>((set, get) => ({
  rates: { ...defaultExchangeRates },
  lastUpdated: null,
  lastUpdatedISO: null,
  isLoading: false,
  error: null,

  load: async () => {
    try {
      const stored = await AsyncStorage.getItem(RATES_KEY);
      if (!stored) return;
      const { rates, lastUpdatedISO } = JSON.parse(stored) as {
        rates: Record<string, number>;
        lastUpdatedISO: string;
      };
      const display = new Date(lastUpdatedISO).toLocaleTimeString('no-NO', {
        hour: '2-digit',
        minute: '2-digit',
      });
      set({ rates, lastUpdated: display, lastUpdatedISO });
    } catch {
      // Ignore storage errors — app falls back to default rates
    }
  },

  updateRates: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch(
        'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/nok.json',
      );
      if (!response.ok) throw new Error('API request failed');
      const data = await response.json();
      if (!data.nok) throw new Error('Invalid response format');

      const needed = new Set<string>();
      Object.values(tippingData).forEach((continent) =>
        Object.values(continent).forEach((c) => needed.add(c.currency.toLowerCase())),
      );

      const updated: Record<string, number> = { ...defaultExchangeRates };
      let count = 0;

      for (const [currency, rate] of Object.entries(data.nok as Record<string, number>)) {
        if (needed.has(currency) && rate > 0) {
          updated[currency.toUpperCase()] = 1 / rate;
          count++;
        }
      }

      const now = new Date();
      const display = now.toLocaleTimeString('no-NO', { hour: '2-digit', minute: '2-digit' });
      const iso = now.toISOString();

      set({ rates: updated, lastUpdated: display, lastUpdatedISO: iso, isLoading: false, error: null });
      AsyncStorage.setItem(RATES_KEY, JSON.stringify({ rates: updated, lastUpdatedISO: iso }));
      return count;
    } catch {
      set((s) => ({ ...s, isLoading: false, error: 'update_failed' }));
      return 0;
    }
  },

  getRate: (currency: string) => get().rates[currency] ?? null,

  getHomeAmount: (amount, fromCurrency, toCurrency) => {
    if (fromCurrency === toCurrency) return null;
    const rates = get().rates;
    // NOK is the base — its rate is always 1
    const fromNOK = fromCurrency === 'NOK' ? 1 : (rates[fromCurrency] ?? null);
    const toNOK = toCurrency === 'NOK' ? 1 : (rates[toCurrency] ?? null);
    if (fromNOK === null || toNOK === null) return null;
    return amount * fromNOK / toNOK;
  },
}));
