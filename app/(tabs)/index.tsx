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
  Modal,
} from 'react-native';
import TippingCultureModal from '../../components/TippingCultureModal';
import { useTranslation } from 'react-i18next';
import { router, useFocusEffect } from 'expo-router';

import { tippingData, ContinentKey, ServiceType, getTipRates } from '../../data/tippingData';
import { calculateTip, formatAmount, Satisfaction } from '../../utils/tipCalculations';

import { useHistoryStore } from '../../store/historyStore';
import { useScanStore } from '../../store/scanStore';
import { useSettingsStore } from '../../store/settingsStore';
import { useTripStore } from '../../store/tripStore';
import { useExchangeRateStore } from '../../store/exchangeRateStore';
import { Typography, Radius } from '../../constants/Theme';
import { useColors } from '../../hooks/useColors';
import { usePremium } from '../../hooks/usePremium';
import { useCountryFromLocation } from '../../hooks/useCountryFromLocation';
import ContinentCountryPicker from '../../components/ContinentCountryPicker';
import ServiceTypeSelector from '../../components/ServiceTypeSelector';
import SatisfactionSelector from '../../components/SatisfactionSelector';
import ResultCard from '../../components/ResultCard';

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
  const { homeCurrency, defaultSatisfaction, favouriteCountries, userName, patch } =
    useSettingsStore();
  const getHomeAmount = useExchangeRateStore((s) => s.getHomeAmount);
  const isPremium = usePremium();
  const { trips, addBill } = useTripStore();

  const [continent, setContinent] = useState<ContinentKey | ''>('');
  const [country, setCountry] = useState('');
  const [rawAmount, setRawAmount] = useState('');
  const [satisfaction, setSatisfaction] = useState<Satisfaction | null>(defaultSatisfaction);
  const [customPercent, setCustomPercent] = useState('');
  const [roundUpPercent, setRoundUpPercent] = useState<number | null>(null);
  const [cultureVisible, setCultureVisible] = useState(false);
  const [serviceType, setServiceType] = useState<ServiceType>('restaurants');

  // Save modal state
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [savedVisible, setSavedVisible] = useState(false);
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);

  // Pre-fill country from GPS on first load
  const locationDefault = useCountryFromLocation();
  useEffect(() => {
    if (locationDefault && !continent && !country) {
      setContinent(locationDefault.continent);
      setCountry(locationDefault.country);
    }
  }, [locationDefault]);

  // Keep satisfaction in sync if settings change while on this screen
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
    if (roundUpPercent !== null) return roundUpPercent;
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
      ? calculateTip(amount, effectiveTipPercent, countryData.currency, 1)
      : null;

  const homeAmount =
    result && countryData
      ? getHomeAmount(result.total, countryData.currency, homeCurrency)
      : null;

  const cappedRoundUpOption = useMemo(() => {
    if (!result) return null;
    const opt = result.roundUpOption;
    if (!opt || !tipRates || !satisfaction || satisfaction === 'custom' || satisfaction === 'excellent')
      return opt ?? null;
    const nextPct = satisfaction === 'poor' ? tipRates.ok : tipRates.excellent;
    const maxTotal = result.amount * (1 + nextPct / 100);
    return opt < maxTotal ? opt : null;
  }, [result, tipRates, satisfaction]);

  const handleSatisfaction = useCallback((s: Satisfaction) => {
    setSatisfaction(s);
    setRoundUpPercent(null);
  }, []);

  const handleCustomChange = useCallback((v: string) => {
    setCustomPercent(v);
    setRoundUpPercent(null);
  }, []);

  const handleRoundUp = useCallback(
    (value: number) => {
      if (!amount || isNaN(amount) || amount <= 0) return;
      setRoundUpPercent(((value - amount) / amount) * 100);
    },
    [amount],
  );

  const handleSave = useCallback(() => {
    if (!result || !countryData) return;
    setSaveName('');
    setSelectedTripId(null);
    setShowSaveModal(true);
  }, [result, countryData]);

  const performSave = useCallback(async () => {
    if (!result || !countryData || !continent || !country) return;
    const descriptionName = saveName.trim() || undefined;
    await addEntry({
      continent,
      country,
      currency: countryData.currency,
      amount: result.amount,
      tipPercent: result.tipPercent,
      tipAmount: result.tipAmount,
      total: result.total,
      perPerson: result.perPerson,
      people: 1,
      homeTotal: homeAmount,
      homeCurrency,
      name: descriptionName,
    });
    if (isPremium && selectedTripId) {
      addBill({
        tripId: selectedTripId,
        description: descriptionName || country,
        totalAmount: result.total,
        currency: countryData.currency,
        paidBy: userName || '',
        participants: [],
        splitMode: 'equal',
        splits: {},
        items: [],
      });
    }
    setShowSaveModal(false);
    setSavedVisible(true);
    setTimeout(() => setSavedVisible(false), 2000);
  }, [result, countryData, continent, country, homeAmount, homeCurrency, saveName, addEntry, isPremium, selectedTripId, addBill, userName]);

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
            {(() => {
              const cultureText = t(`culture.countries.${country}.${serviceType}`, { defaultValue: '' });
              if (!cultureText) return null;
              return (
                <Text style={[styles.tipRateHint, { color: C.sage }]}>{cultureText}</Text>
              );
            })()}
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
              onChangeText={(v) => { setRawAmount(v); setRoundUpPercent(null); }}
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
          tipRates={tipRates}
          onSelect={handleSatisfaction}
          onCustomChange={handleCustomChange}
        />

        {/* Result */}
        {result && (
          <>
            <ResultCard
              result={result}
              homeAmount={homeAmount}
              homeCurrency={homeCurrency}
              onSave={handleSave}
              roundUpOption={cappedRoundUpOption}
              onRoundUp={handleRoundUp}
            />
            {/* Splitt regning */}
            {countryData && (
              <TouchableOpacity
                style={[styles.splitBtn, { backgroundColor: C.white, borderColor: C.lightBorder }]}
                onPress={() =>
                  router.push({
                    pathname: '/(tabs)/split',
                    params: {
                      prefillAmount: result.total.toFixed(2),
                      prefillCurrency: countryData.currency,
                    },
                  })
                }
                activeOpacity={0.8}
              >
                <Text style={[styles.splitBtnText, { color: C.darkSlate }]}>
                  ✂️ {t('result.splitBill')}
                </Text>
              </TouchableOpacity>
            )}
          </>
        )}

        <View style={styles.bottomPad} />
      </ScrollView>

      {/* Save modal */}
      <Modal
        visible={showSaveModal}
        animationType="fade"
        transparent
        onRequestClose={() => setShowSaveModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: C.white }]}>
            <Text style={[styles.modalTitle, { color: C.darkSlate }]}>{t('result.saveModalTitle')}</Text>

            <TextInput
              style={[styles.modalInput, { backgroundColor: C.cream, borderColor: C.lightBorder, color: C.darkSlate }]}
              value={saveName}
              onChangeText={setSaveName}
              placeholder={t('result.saveNamePlaceholder')}
              placeholderTextColor={C.sage}
              autoCapitalize="words"
              returnKeyType="done"
              autoFocus
            />

            {/* Add to trip — active for premium, locked for free */}
            {isPremium ? (
              <View style={[styles.modalTripSection, { borderColor: C.lightBorder }]}>
                <Text style={[styles.modalTripLabel, { color: C.sage }]}>
                  {t('result.addToTrip')}
                </Text>
                {trips.filter(tr => !tr.archived).length === 0 ? (
                  <Text style={[styles.modalTripEmpty, { color: C.sage }]}>
                    {t('result.noTrips')}
                  </Text>
                ) : (
                  <View style={styles.modalTripChips}>
                    {trips.filter(tr => !tr.archived).map(tr => {
                      const selected = selectedTripId === tr.id;
                      return (
                        <TouchableOpacity
                          key={tr.id}
                          style={[
                            styles.modalTripChip,
                            {
                              backgroundColor: selected ? C.sage : C.cream,
                              borderColor: selected ? C.sage : C.lightBorder,
                            },
                          ]}
                          onPress={() => setSelectedTripId(selected ? null : tr.id)}
                          activeOpacity={0.75}
                        >
                          <Text
                            style={[
                              styles.modalTripChipText,
                              { color: selected ? '#fff' : C.darkSlate },
                            ]}
                            numberOfLines={1}
                          >
                            {selected ? '✓ ' : ''}{tr.name}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}
              </View>
            ) : (
              <View style={[styles.modalPremiumRow, { borderColor: C.lightBorder, opacity: 0.35 }]}>
                <Text style={[styles.modalPremiumText, { color: C.darkSlate }]}>🔒  {t('result.addToTrip')}</Text>
                <Text style={[styles.modalPremiumBadge, { backgroundColor: C.gold, color: '#fff' }]}>{t('result.premiumLabel')}</Text>
              </View>
            )}

            <View style={styles.modalBtns}>
              <TouchableOpacity
                style={[styles.modalCancelBtn, { borderColor: C.lightBorder }]}
                onPress={() => setShowSaveModal(false)}
                activeOpacity={0.7}
              >
                <Text style={[styles.modalCancelText, { color: C.sage }]}>{t('cancel') || 'Cancel'}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSaveBtn, { backgroundColor: C.rust }]}
                onPress={performSave}
                activeOpacity={0.8}
              >
                <Text style={styles.modalSaveBtnText}>{t('result.save')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Saved confirmation toast */}
      {savedVisible && (
        <View style={[styles.savedToast, { backgroundColor: C.darkSlate }]} pointerEvents="none">
          <Text style={styles.savedToastText}>✓  {t('result.savedConfirm')}</Text>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { flex: 1 },
  container: { padding: 16, paddingBottom: 16 },
  header: {
    alignItems: 'center',
    marginBottom: 10,
    paddingBottom: 10,
    borderBottomWidth: 2,
  },
  logo: {
    width: 200,
    height: 48,
    marginBottom: 4,
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
    marginBottom: 10,
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
  step: { marginBottom: 10 },
  label: {
    fontFamily: Typography.serif,
    fontWeight: '600',
    fontSize: 15,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1.5,
    borderRadius: Radius.sm,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontFamily: Typography.serif,
    fontSize: 16,
  },
  amountRow: { flexDirection: 'row', gap: 10 },
  amountInput: { flex: 1, fontFamily: Typography.mono, fontSize: 18 },
  scanBtn: {
    borderWidth: 1.5,
    borderRadius: Radius.sm,
    width: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanBtnIcon: { fontSize: 22 },
  bottomPad: { height: 20 },
  tipRateHint: {
    fontFamily: Typography.mono,
    fontSize: 12,
    marginTop: -4,
    marginBottom: 8,
    lineHeight: 18,
    paddingHorizontal: 4,
  },
  splitBtn: {
    borderWidth: 1.5,
    borderRadius: Radius.sm,
    paddingVertical: 10,
    alignItems: 'center',
    marginBottom: 8,
  },
  splitBtnText: {
    fontFamily: Typography.mono,
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  // Trip section in save modal
  modalTripSection: {
    borderWidth: 1,
    borderRadius: Radius.sm,
    padding: 10,
  },
  modalTripLabel: {
    fontFamily: Typography.mono,
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  modalTripEmpty: { fontFamily: Typography.mono, fontSize: 13 },
  modalTripChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  modalTripChip: {
    borderWidth: 1.5,
    borderRadius: Radius.sm,
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  modalTripChipText: { fontFamily: Typography.mono, fontSize: 12, maxWidth: 120 },
  // Save modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    borderRadius: Radius.md,
    padding: 20,
    gap: 14,
  },
  modalTitle: {
    fontFamily: Typography.serif,
    fontWeight: '700',
    fontSize: 17,
  },
  modalInput: {
    borderWidth: 1.5,
    borderRadius: Radius.sm,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontFamily: Typography.mono,
    fontSize: 15,
  },
  modalPremiumRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: Radius.sm,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  modalPremiumText: {
    fontFamily: Typography.serif,
    fontSize: 14,
    flex: 1,
  },
  modalPremiumBadge: {
    fontFamily: Typography.mono,
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    borderRadius: Radius.sm,
    paddingVertical: 3,
    paddingHorizontal: 7,
  },
  modalBtns: {
    flexDirection: 'row',
    gap: 10,
  },
  modalCancelBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: Radius.sm,
    paddingVertical: 11,
    alignItems: 'center',
  },
  modalCancelText: { fontFamily: Typography.mono, fontSize: 13, fontWeight: '600' },
  modalSaveBtn: {
    flex: 1,
    borderRadius: Radius.sm,
    paddingVertical: 11,
    alignItems: 'center',
  },
  modalSaveBtnText: { fontFamily: Typography.mono, fontSize: 13, fontWeight: '600', color: '#fff', letterSpacing: 0.5 },
  // Saved toast
  savedToast: {
    position: 'absolute',
    top: 60,
    alignSelf: 'center',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 20,
  },
  savedToastText: { fontFamily: Typography.mono, fontSize: 13, color: '#fff', fontWeight: '600' },
  helpBtn: {
    position: 'absolute',
    right: 0,
    top: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  helpBtnText: {
    fontSize: 22,
    fontWeight: '700',
    lineHeight: 26,
  },
});
