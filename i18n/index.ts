import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';

import no from './no.json';
import en from './en.json';
import fr from './fr.json';
import es from './es.json';
import de from './de.json';

export const LANGUAGE_KEY = 'app_language';

export const supportedLanguages = [
  { code: 'no', label: 'Norsk', flag: '🇳🇴' },
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
  { code: 'es', label: 'Español', flag: '🇪🇸' },
  { code: 'de', label: 'Deutsch', flag: '🇩🇪' },
] as const;

export type LanguageCode = (typeof supportedLanguages)[number]['code'];

function getDeviceLanguage(): LanguageCode {
  const locale = Localization.getLocales()[0]?.languageCode ?? 'no';
  const supported = supportedLanguages.map((l) => l.code);
  return (supported.includes(locale as LanguageCode) ? locale : 'en') as LanguageCode;
}

export async function initI18n() {
  const stored = await AsyncStorage.getItem(LANGUAGE_KEY);
  const lng = (stored as LanguageCode | null) ?? getDeviceLanguage();

  if (!i18n.isInitialized) {
    await i18n.use(initReactI18next).init({
      resources: { no: { translation: no }, en: { translation: en }, fr: { translation: fr }, es: { translation: es }, de: { translation: de } },
      lng,
      fallbackLng: 'en',
      interpolation: { escapeValue: false },
    });
  } else {
    await i18n.changeLanguage(lng);
  }
}

export async function changeLanguage(code: LanguageCode) {
  await i18n.changeLanguage(code);
  await AsyncStorage.setItem(LANGUAGE_KEY, code);
}

export default i18n;
