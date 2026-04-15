import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { Satisfaction } from '../utils/tipCalculations';

const SETTINGS_KEY = 'app_settings';

export interface PersistedSettings {
  userName: string;
  homeCurrency: string;
  defaultPeople: number;
  defaultSatisfaction: Satisfaction | null;
  keepScreenAwake: boolean;
  darkMode: boolean;
  hasOnboarded: boolean;
  favouriteCountries: string[];
  savedParticipantNames: string[];
}

interface SettingsState extends PersistedSettings {
  loaded: boolean;
  load: () => Promise<void>;
  patch: (updates: Partial<PersistedSettings>) => Promise<void>;
  addSavedParticipantName: (name: string) => Promise<void>;
  removeSavedParticipantName: (name: string) => Promise<void>;
}

const DEFAULTS: PersistedSettings = {
  userName: '',
  homeCurrency: 'NOK',
  defaultPeople: 1,
  defaultSatisfaction: null,
  keepScreenAwake: false,
  darkMode: false,
  hasOnboarded: false,
  favouriteCountries: [],
  savedParticipantNames: [],
};

export const useSettingsStore = create<SettingsState>((set, get) => ({
  ...DEFAULTS,
  loaded: false,

  load: async () => {
    try {
      const raw = await AsyncStorage.getItem(SETTINGS_KEY);
      if (raw) {
        const saved: Partial<PersistedSettings> = JSON.parse(raw);
        set({ ...DEFAULTS, ...saved, loaded: true });
      } else {
        set({ loaded: true });
      }
    } catch {
      set({ loaded: true });
    }
  },

  patch: async (updates) => {
    set(updates as Partial<SettingsState>);
    const { loaded, load, patch, addSavedParticipantName, removeSavedParticipantName, ...current } = get();
    await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify({ ...current, ...updates }));
  },

  addSavedParticipantName: async (name) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const existing = get().savedParticipantNames;
    if (existing.includes(trimmed)) return;
    const updated = [...existing, trimmed];
    set({ savedParticipantNames: updated });
    const { loaded, load, patch, addSavedParticipantName, removeSavedParticipantName, ...current } = get();
    await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(current));
  },

  removeSavedParticipantName: async (name) => {
    const updated = get().savedParticipantNames.filter((n) => n !== name);
    set({ savedParticipantNames: updated });
    const { loaded, load, patch, addSavedParticipantName, removeSavedParticipantName, ...current } = get();
    await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(current));
  },
}));
