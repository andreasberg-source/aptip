import React, { useEffect, useState } from 'react';
import { Stack, router } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { I18nextProvider } from 'react-i18next';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';

import i18n, { initI18n } from '../i18n';
import { useSettingsStore } from '../store/settingsStore';
import { useExchangeRateStore } from '../store/exchangeRateStore';
import { useTripStore } from '../store/tripStore';

export { ErrorBoundary } from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [ready, setReady] = useState(false);
  const { load: loadSettings, hasOnboarded, keepScreenAwake } = useSettingsStore();
  const { load: loadRates, updateRates, lastUpdatedISO } = useExchangeRateStore();
  const { loadTrips } = useTripStore();

  // Initialise i18n + settings + persisted rates before showing any UI
  useEffect(() => {
    async function init() {
      try {
        await Promise.all([initI18n(), loadSettings(), loadRates(), loadTrips()]);
      } catch (e) {
        console.error('[init] startup error:', e);
      } finally {
        setReady(true);
        SplashScreen.hideAsync();
      }
    }
    init();
  }, []);

  // Auto-refresh rates in the background if missing or older than 24 hours
  useEffect(() => {
    if (!ready) return;
    const stale =
      !lastUpdatedISO ||
      Date.now() - new Date(lastUpdatedISO).getTime() > 24 * 60 * 60 * 1000;
    if (stale) updateRates();
  }, [ready]);

  // Redirect to onboarding on first launch
  useEffect(() => {
    if (ready && !hasOnboarded) {
      router.replace('/onboarding');
    }
  }, [ready, hasOnboarded]);

  // Keep screen awake when the setting is enabled
  useEffect(() => {
    if (keepScreenAwake) {
      activateKeepAwakeAsync();
    } else {
      deactivateKeepAwake();
    }
  }, [keepScreenAwake]);

  if (!ready) return null;

  return (
    <SafeAreaProvider>
      <I18nextProvider i18n={i18n}>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="onboarding" options={{ headerShown: false, animation: 'none' }} />
          <Stack.Screen
            name="currency-picker"
            options={{ presentation: 'modal', headerShown: false }}
          />
          <Stack.Screen
            name="scan"
            options={{ presentation: 'fullScreenModal', headerShown: false }}
          />
          <Stack.Screen name="help"  options={{ headerShown: false }} />
          <Stack.Screen name="help-split" options={{ headerShown: false }} />
          <Stack.Screen name="about" options={{ headerShown: false }} />
          <Stack.Screen name="new-trip"          options={{ presentation: 'fullScreenModal', headerShown: false }} />
          <Stack.Screen name="add-bill"          options={{ presentation: 'fullScreenModal', headerShown: false }} />
          <Stack.Screen name="trip-detail"         options={{ headerShown: false }} />
          <Stack.Screen name="trip-settle"  options={{ headerShown: false }} />
          <Stack.Screen name="donate" options={{ presentation: 'modal', headerShown: false }} />
        </Stack>
      </I18nextProvider>
    </SafeAreaProvider>
  );
}
