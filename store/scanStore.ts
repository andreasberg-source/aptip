import { create } from 'zustand';

interface ScanState {
  pendingAmount: string;
  setPendingAmount: (v: string) => void;
  clearPendingAmount: () => void;
}

export const useScanStore = create<ScanState>((set) => ({
  pendingAmount: '',
  setPendingAmount: (v) => set({ pendingAmount: v }),
  clearPendingAmount: () => set({ pendingAmount: '' }),
}));
