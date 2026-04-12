import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Platform,
  KeyboardAvoidingView,
  Image,
} from 'react-native';
import TippingCultureModal from '../../components/TippingCultureModal';
import { useTranslation } from 'react-i18next';
import { router, useFocusEffect } from 'expo-router';

import { tippingData, ContinentKey, ServiceType, getTipRates } from '../../data/tippingData';
import { calculateTip, formatAmount, Satisfaction } from '../../utils/tipCalculations';

import { useHistoryStore } from '../../store/historyStore';
import { useScanStore } from '../../store/scanStore';
import { useSettingsStore } from '../../store/settingsStore';
import { useExchangeRateStore } from '../../store/exchangeRateStore';
import { Typography, Radius } from '../../constants/Theme';
import { useColors } from '../../hooks/useColors';
import { useCountryFromLocation } from '../../hooks/useCountryFromLocation';
import ContinentCountryPicker from '../../components/ContinentCountryPicker';
import ServiceTypeSelector from '../../components/ServiceTypeSelector';
import SatisfactionSelector from '../../components/SatisfactionSelector';
import BillSplitter from '../../components/BillSplitter';
import ResultCard from '../../components/ResultCard';
import RoundUpSuggestions from '../../components/RoundUpSuggestions';

export default function CalculatorScreen() {
  const { t } = useTranslation();
  const C = useColors();
  const addEntry = useHistoryStore((s) => s.addEntry);
  const historyEntries = useHistoryStore((s) => s.entries);
  const recentCountries = useMemo(
    () => [...new Set(historyEntries.map((e) => e.country))].slice(0, 3),
    [historyEntries],
  );
  const { pendingAmount, clearPendingAmount } = useScanStore();
  const { homeCurrency, defaultPeople, defaultSatisfaction, favouriteCountries, patch } =
    useSettingsStore();
  const getHomeAmount = useExchangeRateStore((s) => s.getHomeAmount);

  const [continent, setContinent] = useState<ContinentKey | ''>('');
  const [country, setCountry] = useState('');
  const [rawAmount, setRawAmount] = useState('');
  const [satisfaction, setSatisfaction] = useState<Satisfaction | null>(defaultSatisfaction);
  const [customPercent, setCustomPercent] = useState('');
  const [people, setPeople] = useState(defaultPeople);
  const [cultureVisible, setCultureVisible] = useState(false);
  const [serviceType, setServiceType] = useState<ServiceType>('restaurants');

  // Pre-fill country from GPS on first load
  const locationDefault = useCountryFromLocation();
  useEffect(() => {
    if (locationDefault && !continent && !country) {
      setContinent(locationDefault.continent);
      setCountry(locationDefault.country);
    }
  }, [locationDefault]);

  // Keep people/satisfaction in sync if settings change while on this screen
  useEffect(() => {
    setPeople(defaultPeople);
  }, [defaultPeople]);

  useEffect(() => {
    setSatisfaction(defaultSatisfaction);
  }, [defaultSatisfaction]);

  // Pick up scanned amount when returning from scan screen
  useFocusEffect(
    useCallback(() => {
      if (pendingAmount) {
        setRawAmount(pendingAmount);
        clearPendingAmount();
      }
    }, [pendingAmount, clearPendingAmount]),
  );

  const handleToggleFavourite = useCallback(
    (c: string) => {
      const updated = favouriteCountries.includes(c)
        ? favouriteCountries.filter((f) => f !== c)
        : [...favouriteCountries, c];
      patch({ favouriteCountries: updated });
    },
    [favouriteCountries, patch],
  );

  const countryData = continent && country ? tippingData[continent]?.[country] : null;
  const tipRates = countryData ? getTipRates(countryData, serviceType) : null;

  const effectiveTipPercent = (() => {
    if (!satisfaction) return null;
    if (satisfaction === 'custom') {
      const p = parseFloat(customPercent);
      return isNaN(p) ? null : Math.max(0, Math.min(100, p));
    }
    return tipRates ? tipRates[satisfaction] : null;
  })();

  const amount = parseFloat(rawAmount);
  const result =
    countryData && effectiveTipPercent !== null && !isNaN(amount) && amount > 0
      ? calculateTip(amount, effectiveTipPercent, countryData.currency, people)
      : null;

  const homeAmount =
    result && countryData
      ? getHomeAmount(result.total, countryData.currency, homeCurrency)
      : null;

  const handleSatisfaction = useCallback((s: Satisfaction) => {
    setSatisfaction(s);
  }, []);

  const handleRoundUp = useCallback(
    (value: number) => {
      if (!countryData || !result) return;
      const newTip = value - amount;
      const pct = (newTip / amount) * 100;
      setCustomPercent(pct.toFixed(1));
      setSatisfaction('custom');
    },
    [countryData, result, amount],
  );

  const handleSave = useCallback(async () => {
    if (!result || !countryData || !continent || !country) return;
    await addEntry({
      continent,
      country,
      currency: countryData.currency,
      amount: result.amount,
      tipPercent: result.tipPercent,
      tipAmount: result.tipAmount,
      total: result.total,
      perPerson: result.perPerson,
      people,
      homeTotal: homeAmount,
      homeCurrency,
    });
  }, [result, countryData, continent, country, people, homeAmount, homeCurrency, addEntry]);

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: C.cream }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: C.sage }]}>
          <Image
            source={require('../../assets/images/logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={[styles.subtitle, { color: C.sage }]}>{t('app.subtitle')}</Text>
          <TouchableOpacity
            style={styles.helpBtn}
            onPress={() => router.push('/help')}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={[styles.helpBtnText, { color: C.rust }]}>?</Text>
          </TouchableOpacity>
        </View>

        {/* Location row: picker + culture icon on same line */}
        <View style={styles.locationRow}>
          <ContinentCountryPicker
            continent={continent}
            country={country}
            style={styles.pickerFlex}
            favourites={favouriteCountries}
            onToggleFavourite={handleToggleFavourite}
            recentCountries={recentCountries}
            onContinentChange={(c) => {
              setContinent(c);
              setCountry('');
              setSatisfaction(defaultSatisfaction);
              setRawAmount('');
              setPeople(defaultPeople);
            }}
            onCountryChange={setCountry}
          />
          {country ? (
            <TouchableOpacity
              style={[styles.cultureIcon, { backgroundColor: C.white, borderColor: C.gold }]}
              onPress={() => setCultureVisible(true)}
              activeOpacity={0.75}
            >
              <Text style={styles.cultureIconEmoji}>📖</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Culture modal + service type (only when country selected) */}
        {country ? (
          <>
            <TippingCultureModal
              visible={cultureVisible}
              country={country}
              initialSection={serviceType}
              onClose={() => setCultureVisible(false)}
            />
            <ServiceTypeSelector value={serviceType} onChange={setServiceType} />
          </>
        ) : null}

        {/* Amount */}
        <View style={styles.step}>
          <Text style={[styles.label, { color: C.darkSlate }]}>
            {t('amount.label')}{countryData ? ` (${countryData.currency})` : ''}
          </Text>
          <View style={styles.amountRow}>
            <TextInput
              style={[
                styles.input,
                styles.amountInput,
                { backgroundColor: C.cream, borderColor: C.lightBorder, color: C.darkSlate },
              ]}
              value={rawAmount}
              onChangeText={setRawAmount}
              placeholder={t('amount.placeholder')}
              placeholderTextColor={C.sage}
              keyboardType="decimal-pad"
            />
            <TouchableOpacity
              style={[styles.scanBtn, { backgroundColor: C.cream, borderColor: C.lightBorder }]}
              onPress={() =>
                router.push({
                  pathname: '/scan',
                  params: { currency: countryData?.currency ?? '' },
                })
              }
              accessibilityLabel={t('amount.scan')}
            >
              <Text style={styles.scanBtnIcon}>📷</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Satisfaction */}
        <SatisfactionSelector
          selected={satisfaction}
          customPercent={customPercent}
          onSelect={handleSatisfaction}
          onCustomChange={setCustomPercent}
        />

        {/* Result */}
        {result && (
          <>
            <ResultCard
              result={result}
              homeAmount={homeAmount}
              homeCurrency={homeCurrency}
              onSave={handleSave}
            />
            <RoundUpSuggestions
              options={result.roundUpOptions}
              currency={result.currency}
              onSelect={handleRoundUp}
            />
          </>
        )}

        {/* Bill splitter — bottom */}
        <BillSplitter people={people} onChange={setPeople} />

        {/* Per-person — only when split */}
        {result && people > 1 && (
          <View
            style={[
              styles.perPersonRow,
              { backgroundColor: C.white, borderColor: C.lightBorder },
            ]}
          >
            <Text style={[styles.perPersonLabel, { color: C.sage }]}>
              {t('result.perPerson')}
            </Text>
            <Text style={[styles.perPersonValue, { color: C.darkSlate }]}>
              {formatAmount(result.perPerson, 2)} {result.currency}
            </Text>
          </View>
        )}

        <View style={styles.bottomPad} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { flex: 1 },
  container: { padding: 20, paddingBottom: 40 },
  header: {
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 2,
  },
  logo: {
    width: 200,
    height: 60,
    marginBottom: 6,
  },
  subtitle: {
    fontFamily: Typography.mono,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 8,
    marginBottom: 16,
  },
  pickerFlex: { flex: 1, marginBottom: 0 },
  cultureIcon: {
    width: 52,
    borderWidth: 1.5,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cultureIconEmoji: { fontSize: 20 },
  step: { marginBottom: 16 },
  label: {
    fontFamily: Typography.serif,
    fontWeight: '600',
    fontSize: 15,
    marginBottom: 8,
  },
  input: {
    borderWidth: 2,
    borderRadius: Radius.sm,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: Typography.serif,
    fontSize: 16,
  },
  amountRow: { flexDirection: 'row', gap: 10 },
  amountInput: { flex: 1, fontFamily: Typography.mono, fontSize: 18 },
  scanBtn: {
    borderWidth: 2,
    borderRadius: Radius.sm,
    width: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanBtnIcon: { fontSize: 22 },
  perPersonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: Radius.sm,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginTop: 8,
  },
  perPersonLabel: {
    fontFamily: Typography.serif,
    fontSize: 14,
  },
  perPersonValue: {
    fontFamily: Typography.mono,
    fontSize: 15,
    fontWeight: '600',
  },
  bottomPad: { height: 20 },
  helpBtn: {
    position: 'absolute',
    right: 0,
    top: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  helpBtnText: {
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 22,
  },
});
