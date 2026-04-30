import { create } from 'zustand';
import type { Participant } from './tripStore';

export interface ReviewedItem {
  id: string;
  label: string;
  amount: number;       // line total (unit price × quantity)
  quantity: number;
  assignedTo: string[]; // participant IDs; empty = unassigned
}

export interface ReceiptContext {
  currency: string;
  participants: Participant[];
  imageUri?: string;
}

export interface ReceiptResult {
  items: ReviewedItem[];
  imageUri: string | null;
  currency: string;
}

interface ReceiptStore {
  context: ReceiptContext | null;
  result: ReceiptResult | null;
  setContext: (ctx: ReceiptContext) => void;
  setResult: (r: ReceiptResult) => void;
  clearResult: () => void;
  clearAll: () => void;
}

export const useReceiptStore = create<ReceiptStore>(set => ({
  context: null,
  result: null,
  setContext: ctx => set({ context: ctx }),
  setResult: r => set({ result: r }),
  clearResult: () => set({ result: null }),
  clearAll: () => set({ context: null, result: null }),
}));
