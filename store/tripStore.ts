import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface Participant {
  id: string;
  name: string;
}

export type SplitMode = 'equal' | 'percentage' | 'custom' | 'itemized';

export interface BillItem {
  id: string;
  label: string;
  amount: number;
  assignedTo: string[]; // participant IDs; empty = all participants
}

export interface Bill {
  id: string;
  tripId: string;
  date: string;           // ISO
  description: string;
  currency: string;
  totalAmount: number;
  paidBy: string;         // participant ID
  splitMode: SplitMode;
  participants: string[]; // participant IDs included in this bill
  items: BillItem[];      // used when splitMode === 'itemized'
  splits: Record<string, number>; // participantId → amount owed (pre-computed on save)
}

export interface Trip {
  id: string;
  name: string;
  createdAt: string; // ISO
  participants: Participant[];
  bills: Bill[];
  lastCurrency: string; // most recently used currency — settlement default
  archived: boolean;
}

interface TripState {
  trips: Trip[];
  loaded: boolean;
  loadTrips: () => Promise<void>;
  createTrip: (name: string, participants: Omit<Participant, 'id'>[]) => Promise<Trip>;
  updateTrip: (tripId: string, updates: Partial<Pick<Trip, 'name' | 'participants' | 'archived'>>) => Promise<void>;
  deleteTrip: (tripId: string) => Promise<void>;
  addBill: (bill: Omit<Bill, 'id' | 'date'>) => Promise<void>;
  updateBill: (tripId: string, billId: string, updates: Omit<Bill, 'id' | 'date' | 'tripId'>) => Promise<void>;
  deleteBill: (tripId: string, billId: string) => Promise<void>;
}

const STORAGE_KEY = 'trips';

function generateId(): string {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export const useTripStore = create<TripState>((set, get) => ({
  trips: [],
  loaded: false,

  loadTrips: async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        const trips: Trip[] = JSON.parse(raw);
        set({ trips, loaded: true });
      } else {
        set({ loaded: true });
      }
    } catch {
      set({ loaded: true });
    }
  },

  createTrip: async (name, participants) => {
    const trip: Trip = {
      id: generateId(),
      name,
      createdAt: new Date().toISOString(),
      participants: participants.map(p => ({ id: generateId(), name: p.name })),
      bills: [],
      lastCurrency: 'USD',
      archived: false,
    };
    const updated = [trip, ...get().trips];
    set({ trips: updated });
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return trip;
  },

  updateTrip: async (tripId, updates) => {
    const updated = get().trips.map(t =>
      t.id === tripId ? { ...t, ...updates } : t,
    );
    set({ trips: updated });
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  },

  deleteTrip: async (tripId) => {
    const updated = get().trips.filter(t => t.id !== tripId);
    set({ trips: updated });
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  },

  addBill: async (bill) => {
    const newBill: Bill = {
      ...bill,
      id: generateId(),
      date: new Date().toISOString(),
    };
    const updated = get().trips.map(t => {
      if (t.id !== bill.tripId) return t;
      return {
        ...t,
        bills: [...t.bills, newBill],
        lastCurrency: bill.currency,
      };
    });
    set({ trips: updated });
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  },

  updateBill: async (tripId, billId, updates) => {
    const updated = get().trips.map(t => {
      if (t.id !== tripId) return t;
      return {
        ...t,
        bills: t.bills.map(b =>
          b.id === billId ? { ...b, ...updates, id: billId, tripId, date: b.date } : b,
        ),
        lastCurrency: updates.currency,
      };
    });
    set({ trips: updated });
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  },

  deleteBill: async (tripId, billId) => {
    const updated = get().trips.map(t => {
      if (t.id !== tripId) return t;
      return { ...t, bills: t.bills.filter(b => b.id !== billId) };
    });
    set({ trips: updated });
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  },
}));
