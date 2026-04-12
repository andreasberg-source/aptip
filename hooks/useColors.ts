import { useSettingsStore } from '../store/settingsStore';
import { LightColors, DarkColors } from '../constants/Theme';

/** Returns the correct color palette based on the current dark-mode setting. */
export function useColors() {
  const darkMode = useSettingsStore((s) => s.darkMode);
  return darkMode ? DarkColors : LightColors;
}
