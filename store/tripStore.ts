import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { PARTICIPANT_COLORS } from '../constants/Theme';

export interface Participant {
  id: string;
  name: string;
  color: string;
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
  imageUri?: string;      // saved receipt photo
  linkedHistoryId?: string; // linked tip-calculator history entry
}

export interface SettledTransfer {
  fromId: string;
  toId: string;
}

export interface Trip {
  id: string;
  name: string;
  createdAt: string; // ISO
  participants: Participant[];
  bills: Bill[];
  lastCurrency: string;
  archived: boolean;
  settledTransfers?: SettledTransfer[];
}

interface TripState {
  trips: Trip[];
  removedBills: Bill[];
  loaded: boolean;
  loadTrips: () => Promise<void>;
  createTrip: (name: string, participants: Omit<Participant, 'id' | 'color'>[]) => Promise<Trip>;
  updateTrip: (tripId: string, updates: Partial<Pick<Trip, 'name' | 'participants' | 'archived'>>) => Promise<void>;
  deleteTrip: (tripId: string) => Promise<void>;
  addBill: (bill: Omit<Bill, 'id' | 'date'>) => Promise<void>;
  updateBill: (tripId: string, billId: string, updates: Omit<Bill, 'id' | 'date' | 'tripId'>) => Promise<void>;
  deleteBill: (tripId: string, billId: string) => Promise<void>;
  detachBill: (tripId: string, billId: string) => Promise<void>;
  markTransferSettled: (tripId: string, fromId: string, toId: string) => Promise<void>;
  unmarkTransferSettled: (tripId: string, fromId: string, toId: string) => Promise<void>;
  clearSettledTransfers: (tripId: string) => Promise<void>;
}

const STORAGE_KEY = 'trips';
const REMOVED_BILLS_KEY = 'removed_bills';

function generateId(): string {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

async function saveTrips(trips: Trip[]) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(trips));
}

async function saveRemovedBills(bills: Bill[]) {
  await AsyncStorage.setItem(REMOVED_BILLS_KEY, JSON.stringify(bills));
}

export const useTripStore = create<TripState>((set, get) => ({
  trips: [],
  removedBills: [],
  loaded: false,

  loadTrips: async () => {
    try {
      const [tripsRaw, removedRaw] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEY),
        AsyncStorage.getItem(REMOVED_BILLS_KEY),
      ]);
      const trips: Trip[] = tripsRaw ? JSON.parse(tripsRaw) : [];
      // Migrate existing participants that have no color
      const migratedTrips = trips.map(trip => ({
        ...trip,
        participants: trip.participants.map((p, idx) => ({
          ...p,
          color: p.color ?? PARTICIPANT_COLORS[idx % PARTICIPANT_COLORS.length],
        })),
      }));
      const removedBills: Bill[] = removedRaw ? JSON.parse(removedRaw) : [];
      set({ trips: migratedTrips, removedBills, loaded: true });
    } catch {
      set({ loaded: true });
    }
  },

  createTrip: async (name, participants) => {
    const trip: Trip = {
      id: generateId(),
      name,
      createdAt: new Date().toISOString(),
      participants: participants.map((p, idx) => ({
        id: generateId(),
        name: p.name,
        color: PARTICIPANT_COLORS[idx % PARTICIPANT_COLORS.length],
      })),
      bills: [],
      lastCurrency: 'USD',
      archived: false,
      settledTransfers: [],
    };
    const updated = [trip, ...get().trips];
    set({ trips: updated });
    await saveTrips(updated);
    return trip;
  },

  updateTrip: async (tripId, updates) => {
    const currentTrips = get().trips;
    // When updating participants, preserve existing colors and assign new ones
    let processedUpdates = { ...updates };
    if (updates.participants) {
      const existingTrip = currentTrips.find(t => t.id === tripId);
      const existingColorMap: Record<string, string> = {};
      existingTrip?.participants.forEach(p => { existingColorMap[p.id] = p.color; });
      const usedColors = new Set(Object.values(existingColorMap));
      const nextColorIdx = existingTrip?.participants.length ?? 0;
      processedUpdates.participants = updates.participants.map((p, idx) => ({
        ...p,
        color: p.color ?? existingColorMap[p.id] ?? PARTICIPANT_COLORS[(nextColorIdx + idx) % PARTICIPANT_COLORS.length],
      }));
    }
    const updated = currentTrips.map(t =>
      t.id === tripId ? { ...t, ...processedUpdates } : t,
    );
    set({ trips: updated });
    await saveTrips(updated);
  },

  deleteTrip: async (tripId) => {
    const updated = get().trips.filter(t => t.id !== tripId);
    set({ trips: updated });
    await saveTrips(updated);
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
    await saveTrips(updated);
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
    await saveTrips(updated);
  },

  deleteBill: async (tripId, billId) => {
    const updated = get().trips.map(t => {
      if (t.id !== tripId) return t;
      return { ...t, bills: t.bills.filter(b => b.id !== billId) };
    });
    set({ trips: updated });
    await saveTrips(updated);
  },

  detachBill: async (tripId, billId) => {
    let detachedBill: Bill | undefined;
    const updatedTrips = get().trips.map(t => {
      if (t.id !== tripId) return t;
      const bill = t.bills.find(b => b.id === billId);
      if (bill) detachedBill = bill;
      return { ...t, bills: t.bills.filter(b => b.id !== billId) };
    });
    if (!detachedBill) return;
    const updatedRemoved = [detachedBill, ...get().removedBills];
    set({ trips: updatedTrips, removedBills: updatedRemoved });
    await Promise.all([saveTrips(updatedTrips), saveRemovedBills(updatedRemoved)]);
  },

  markTransferSettled: async (tripId, fromId, toId) => {
    const updated = get().trips.map(t => {
      if (t.id !== tripId) return t;
      const settled = t.settledTransfers ?? [];
      const alreadySettled = settled.some(s => s.fromId === fromId && s.toId === toId);
      if (alreadySettled) return t;
      return { ...t, settledTransfers: [...settled, { fromId, toId }] };
    });
    set({ trips: updated });
    await saveTrips(updated);
  },

  unmarkTransferSettled: async (tripId, fromId, toId) => {
    const updated = get().trips.map(t => {
      if (t.id !== tripId) return t;
      const settled = (t.settledTransfers ?? []).filter(
        s => !(s.fromId === fromId && s.toId === toId),
      );
      return { ...t, settledTransfers: settled };
    });
    set({ trips: updated });
    await saveTrips(updated);
  },

  clearSettledTransfers: async (tripId) => {
    const updated = get().trips.map(t =>
      t.id === tripId ? { ...t, settledTransfers: [] } : t,
    );
    set({ trips: updated });
    await saveTrips(updated);
  },
}));
