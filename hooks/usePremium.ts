import { useSettingsStore } from '../store/settingsStore';

export function usePremium(): boolean {
  return useSettingsStore((s) => s.isPremium);
}
