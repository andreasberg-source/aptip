import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface HistoryEntry {
  id: string;
  date: string; // ISO string
  continent: string;
  country: string;
  currency: string;
  amount: number;
  tipPercent: number;
  tipAmount: number;
  total: number;
  perPerson: number;
  people: number;
  homeTotal: number | null;
  homeCurrency: string;
  name?: string;     // optional label (e.g. restaurant name)
  imageUri?: string; // saved receipt photo
}

interface HistoryState {
  entries: HistoryEntry[];
  addEntry: (entry: Omit<HistoryEntry, 'id' | 'date'>) => Promise<void>;
  removeEntry: (id: string) => Promise<void>;
  clearAll: () => Promise<void>;
  loadHistory: () => Promise<void>;
}

const STORAGE_KEY = 'tip_history';

export const useHistoryStore = create<HistoryState>((set, get) => ({
  entries: [],

  loadHistory: async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        // Migrate entries that were saved before homeTotal/homeCurrency existed
        type LegacyEntry = HistoryEntry & { nokTotal?: number | null };
        const entries: LegacyEntry[] = JSON.parse(raw);
        const migrated: HistoryEntry[] = entries.map((e) => ({
          ...e,
          homeTotal: e.homeTotal ?? e.nokTotal ?? null,
          homeCurrency: e.homeCurrency ?? 'NOK',
        }));
        set({ entries: migrated });
      }
    } catch {
      // ignore
    }
  },

  addEntry: async (entry) => {
    const newEntry: HistoryEntry = {
      ...entry,
      id: Date.now().toString(),
      date: new Date().toISOString(),
    };
    const updated = [newEntry, ...get().entries].slice(0, 100);
    set({ entries: updated });
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  },

  removeEntry: async (id) => {
    const updated = get().entries.filter((e) => e.id !== id);
    set({ entries: updated });
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  },

  clearAll: async () => {
    set({ entries: [] });
    await AsyncStorage.removeItem(STORAGE_KEY);
  },
}));
