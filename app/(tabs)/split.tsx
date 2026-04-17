import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import * as ImagePicker from 'expo-image-picker';
import { CameraView, useCameraPermissions } from 'expo-camera';

import { useTripStore, Trip } from '../../store/tripStore';
import { useSettingsStore } from '../../store/settingsStore';
import { useColors } from '../../hooks/useColors';
import { usePremium } from '../../hooks/usePremium';
import { Typography, Radius } from '../../constants/Theme';
import { formatAmount } from '../../utils/tipCalculations';
import { parseAmountsFromText } from '../../utils/parseAmounts';
import CurrencyDropdown from '../../components/CurrencyDropdown';

// Lazy-load ML Kit
let TextRecognition: typeof import('@react-native-ml-kit/text-recognition').default | null = null;
try {
  TextRecognition = require('@react-native-ml-kit/text-recognition').default;
} catch {
  TextRecognition = null;
}

type QuickMode = 'equal' | 'percentage' | 'custom';

interface QuickPerson {
  key: string;
  name: string;
  amount: string;
}

interface PercPerson {
  key: string;
  name: string;
  pct: string;
}

export default function SplitScreen() {
  const { t } = useTranslation();
  const C = useColors();
  const { trips, addBill } = useTripStore();
  const { userName } = useSettingsStore();
  const isPremium = usePremium();
  const { prefillAmount, prefillCurrency } = useLocalSearchParams<{
    prefillAmount?: string;
    prefillCurrency?: string;
  }>();

  // Quick Split state
  const [quickAmount, setQuickAmount] = useState('');
  const [quickPeople, setQuickPeople] = useState(2);
  const [quickCurrency, setQuickCurrency] = useState('NOK');
  const [quickMode, setQuickMode] = useState<QuickMode>('equal');
  const [customPersons, setCustomPersons] = useState<QuickPerson[]>(() => [
    { key: '1', name: userName || '', amount: '' },
    { key: '2', name: '', amount: '' },
  ]);
  const [percPersons, setPercPersons] = useState<PercPerson[]>(() => [
    { key: '1', name: userName || '', pct: '' },
    { key: '2', name: '', pct: '' },
  ]);
  const [scanning, setScanning] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [selectedTripIdForSave, setSelectedTripIdForSave] = useState<string | null>(null);
  const [savedToTripVisible, setSavedToTripVisible] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const nextKey = useRef(3);

  // Pre-fill from calculator "Splitt regning" button
  useEffect(() => {
    if (prefillAmount) setQuickAmount(prefillAmount);
    if (prefillCurrency) setQuickCurrency(prefillCurrency);
  }, [prefillAmount, prefillCurrency]);

  const totalAmount = parseFloat(quickAmount.replace(',', '.')) || 0;

  const equalResult = (() => {
    if (quickMode !== 'equal') return null;
    if (totalAmount > 0 && quickPeople > 0) return totalAmount / quickPeople;
    return null;
  })();

  const customTotal = customPersons.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
  const customRemaining = totalAmount - customTotal;

  const allocatedPct = percPersons.reduce((sum, p) => sum + (parseFloat(p.pct) || 0), 0);
  const unallocatedPct = Math.max(0, 100 - allocatedPct);

  const activeTrips = trips.filter(t => !t.archived);

  // OCR for Quick Split
  const processOcrUri = useCallback(async (uri: string) => {
    setScanning(true);
    try {
      if (!TextRecognition) throw new Error('unavailable');
      const result = await TextRecognition.recognize(uri);
      const amounts = parseAmountsFromText(result.text);
      if (amounts.length > 0) {
        setQuickAmount(String(amounts[0].value));
      } else {
        Alert.alert('No amount found', 'Could not detect an amount. Enter manually.');
      }
    } catch {
      Alert.alert('Scan', 'Not available in Expo Go. Enter amount manually.');
    } finally {
      setScanning(false);
      setShowCamera(false);
    }
  }, []);

  const handlePickImage = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ quality: 0.9 });
    if (!result.canceled && result.assets[0]?.uri) {
      await processOcrUri(result.assets[0].uri);
    }
  }, [processOcrUri]);

  const handleCapture = useCallback(async () => {
    if (!cameraRef.current) return;
    const photo = await cameraRef.current.takePictureAsync({ quality: 0.9 });
    if (!photo?.uri) return;
    await processOcrUri(photo.uri);
  }, [processOcrUri]);

  const addCustomPerson = useCallback(() => {
    setCustomPersons(prev => [...prev, { key: String(nextKey.current++), name: '', amount: '' }]);
  }, []);

  const handleSaveToTrip = useCallback(async () => {
    if (!selectedTripIdForSave || totalAmount <= 0) return;
    const trip = activeTrips.find(t => t.id === selectedTripIdForSave);
    if (!trip) return;
    await addBill({
      tripId: selectedTripIdForSave,
      description: `Split ${quickCurrency}`,
      currency: quickCurrency,
      totalAmount,
      paidBy: trip.participants[0]?.id ?? '',
      participants: trip.participants.map(p => p.id),
      splitMode: 'equal',
      splits: {},
      items: [],
    });
    setSelectedTripIdForSave(null);
    setSavedToTripVisible(true);
    setTimeout(() => setSavedToTripVisible(false), 2000);
  }, [selectedTripIdForSave, totalAmount, activeTrips, quickCurrency, addBill]);

  const renderTrip = useCallback(({ item }: { item: Trip }) => {
    const totalBills = item.bills.length;
    const currencies = [...new Set(item.bills.map(b => b.currency))];
    const currencyLabel = currencies.join(', ') || item.lastCurrency;
    const isSettled = (item.settledTransfers?.length ?? 0) > 0 && item.bills.length > 0;

    return (
      <TouchableOpacity
        style={[styles.tripCard, { backgroundColor: C.white, borderColor: isSettled ? C.rust : C.lightBorder }]}
        onPress={() => router.push({ pathname: '/trip-detail', params: { id: item.id } })}
        activeOpacity={0.75}
      >
        <View style={styles.tripCardInner}>
          <View style={styles.tripNameRow}>
            <Text style={[styles.tripName, { color: C.darkSlate }]} numberOfLines={1}>
              {item.name}
            </Text>
            {isSettled && (
              <Text style={[styles.settledBadge, { color: C.rust }]}>{t('splitTab.settled')}</Text>
            )}
          </View>
          <View style={styles.tripMeta}>
            <Text style={[styles.tripMetaText, { color: C.sage }]}>
              👥 {item.participants.length}  ·  🧾 {totalBills} {t('splitTab.bills')}
            </Text>
            {currencies.length > 0 && (
              <Text style={[styles.tripCurrency, { color: C.sage }]}>{currencyLabel}</Text>
            )}
          </View>
          {/* Participant color dots */}
          <View style={styles.colorDotsRow}>
            {item.participants.slice(0, 8).map(p => (
              <View key={p.id} style={[styles.colorDot, { backgroundColor: p.color ?? C.sage }]} />
            ))}
          </View>
        </View>
        <Text style={[styles.tripChevron, { color: C.sage }]}>›</Text>
      </TouchableOpacity>
    );
  }, [C, t]);

  // Camera view for Quick Split
  if (showCamera) {
    if (!permission?.granted) {
      return (
        <SafeAreaView style={[styles.safe, { backgroundColor: C.cream }]}>
          <View style={styles.center}>
            <Text style={[styles.centerText, { color: C.darkSlate }]}>{t('scan.permission')}</Text>
            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: C.rust, marginTop: 16 }]}
              onPress={requestPermission}
            >
              <Text style={styles.primaryBtnText}>{t('scan.permissionBtn')}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowCamera(false)} style={{ marginTop: 12 }}>
              <Text style={[styles.cancelText, { color: C.sage }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      );
    }
    return (
      <View style={styles.cameraContainer}>
        <CameraView ref={cameraRef} style={styles.camera} facing="back" />
        <View style={styles.cameraControls}>
          <TouchableOpacity style={styles.cancelCameraBtn} onPress={() => setShowCamera(false)}>
            <Text style={styles.cancelCameraBtnText}>✕</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.captureBtn} onPress={handleCapture} disabled={scanning}>
            {scanning
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.captureBtnText}>{t('scan.capture')}</Text>}
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancelCameraBtn} onPress={handlePickImage}>
            <Text style={styles.cancelCameraBtnText}>🖼️</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.cream }]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <FlatList
          data={isPremium ? activeTrips : []}
          keyExtractor={item => item.id}
          renderItem={renderTrip}
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={
            <>
              {/* Header */}
              <View style={[styles.header, { borderBottomColor: C.sage }]}>
                <Text style={[styles.title, { color: C.darkSlate }]}>✂️ {t('splitTab.title')}</Text>
                <TouchableOpacity
                  style={styles.helpBtn}
                  onPress={() => router.push('/help-split')}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Text style={[styles.helpBtnText, { color: C.sage }]}>?</Text>
                </TouchableOpacity>
              </View>

              {/* Quick Split */}
              <View style={[styles.card, { backgroundColor: C.white, borderColor: C.lightBorder }]}>
                {/* Amount row with currency + scan */}
                <View style={styles.amountRow}>
                  <View style={styles.flex}>
                    <Text style={[styles.label, { color: C.darkSlate }]}>{t('splitTab.amountLabel')}</Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: C.cream, borderColor: C.lightBorder, color: C.darkSlate }]}
                      value={quickAmount}
                      onChangeText={setQuickAmount}
                      placeholder="0.00"
                      placeholderTextColor={C.sage}
                      keyboardType="decimal-pad"
                      returnKeyType="done"
                    />
                  </View>
                  <View style={styles.currencyCol}>
                    <Text style={[styles.label, { color: C.darkSlate }]}>{t('splitTab.currency')}</Text>
                    <CurrencyDropdown value={quickCurrency} onChange={setQuickCurrency} />
                  </View>
                </View>

                {/* Scan button — premium only */}
                <TouchableOpacity
                  style={[styles.scanBtn, { borderColor: C.lightBorder }]}
                  onPress={async () => {
                    if (!isPremium) {
                      Alert.alert(t('premium.title'), t('premium.upgradeMsg'));
                      return;
                    }
                    if (TextRecognition) {
                      if (!permission?.granted) {
                        const { granted } = await requestPermission();
                        if (!granted) { await handlePickImage(); return; }
                      }
                      setShowCamera(true);
                    } else {
                      await handlePickImage();
                    }
                  }}
                  disabled={scanning}
                  activeOpacity={0.7}
                >
                  {scanning
                    ? <ActivityIndicator size="small" color={C.rust} />
                    : <Text style={[styles.scanBtnText, { color: C.sage }]}>📷 {t('splitTab.scanAmount')}</Text>}
                </TouchableOpacity>

                {/* Mode toggle */}
                <View style={styles.modeRow}>
                  {(['equal', 'percentage', 'custom'] as QuickMode[]).map(mode => (
                    <TouchableOpacity
                      key={mode}
                      style={[
                        styles.modeBtn,
                        { borderColor: C.lightBorder, backgroundColor: C.cream },
                        quickMode === mode && { backgroundColor: C.rust, borderColor: C.rust },
                      ]}
                      onPress={() => setQuickMode(mode)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.modeBtnText, { color: quickMode === mode ? '#fff' : C.darkSlate }]}>
                        {mode === 'equal'
                          ? t('splitTab.splitEqual')
                          : mode === 'percentage'
                          ? t('splitTab.splitPerc')
                          : t('splitTab.splitCustom')}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Equal mode */}
                {quickMode === 'equal' && (
                  <>
                    <View style={styles.stepperRow}>
                      <TouchableOpacity
                        style={[styles.stepperBtn, { backgroundColor: C.sage }, quickPeople <= 1 && styles.disabled]}
                        onPress={() => setQuickPeople(p => Math.max(1, p - 1))}
                        disabled={quickPeople <= 1}
                      >
                        <Text style={styles.stepperBtnText}>−</Text>
                      </TouchableOpacity>
                      <View style={[styles.stepperCount, { backgroundColor: C.cream, borderColor: C.lightBorder }]}>
                        <Text style={[styles.stepperCountText, { color: C.darkSlate }]}>
                          {quickPeople === 1
                            ? t('split.onePerson')
                            : t('split.people', { n: quickPeople })}
                        </Text>
                      </View>
                      <TouchableOpacity
                        style={[styles.stepperBtn, { backgroundColor: C.sage }, quickPeople >= 20 && styles.disabled]}
                        onPress={() => setQuickPeople(p => Math.min(20, p + 1))}
                        disabled={quickPeople >= 20}
                      >
                        <Text style={styles.stepperBtnText}>+</Text>
                      </TouchableOpacity>
                    </View>

                    {equalResult !== null && (
                      <View style={[styles.quickResult, { backgroundColor: C.cream, borderColor: C.lightBorder }]}>
                        <Text style={[styles.quickResultLabel, { color: C.sage }]}>{t('splitTab.perPerson')}</Text>
                        <Text style={[styles.quickResultValue, { color: C.rust }]}>
                          {formatAmount(equalResult, 2)} {quickCurrency}
                        </Text>
                      </View>
                    )}
                  </>
                )}

                {/* Percentage mode */}
                {quickMode === 'percentage' && (
                  <View>
                    {percPersons.map((p, idx) => {
                      const pctVal = parseFloat(p.pct) || 0;
                      const personAmt = totalAmount > 0 ? totalAmount * (pctVal / 100) : null;
                      return (
                        <View key={p.key} style={styles.customRow}>
                          <TextInput
                            style={[styles.customNameInput, { backgroundColor: C.cream, borderColor: C.lightBorder, color: C.darkSlate }]}
                            value={p.name}
                            onChangeText={v => setPercPersons(prev => prev.map(pp => pp.key === p.key ? { ...pp, name: v } : pp))}
                            placeholder={`${t('splitTab.participantName')} ${idx + 1}`}
                            placeholderTextColor={C.sage}
                            autoCapitalize="words"
                          />
                          <View style={styles.percInputGroup}>
                            <TextInput
                              style={[styles.percPctInput, { backgroundColor: C.cream, borderColor: C.lightBorder, color: C.darkSlate }]}
                              value={p.pct}
                              onChangeText={v => setPercPersons(prev => prev.map(pp => pp.key === p.key ? { ...pp, pct: v } : pp))}
                              placeholder="0"
                              placeholderTextColor={C.sage}
                              keyboardType="decimal-pad"
                            />
                            <Text style={[styles.percSymbol, { color: C.sage }]}>%</Text>
                          </View>
                          {personAmt !== null && (
                            <Text style={[styles.percAmt, { color: C.rust }]}>
                              {formatAmount(personAmt, 2)}
                            </Text>
                          )}
                          {percPersons.length > 2 && (
                            <TouchableOpacity
                              onPress={() => setPercPersons(prev => prev.filter(pp => pp.key !== p.key))}
                              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            >
                              <Text style={[styles.removeText, { color: C.sage }]}>✕</Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      );
                    })}
                    <TouchableOpacity
                      style={[styles.addPersonBtn, { borderColor: C.lightBorder }]}
                      onPress={() => {
                        const key = String(nextKey.current++);
                        setPercPersons(prev => [...prev, { key, name: '', pct: '' }]);
                      }}
                    >
                      <Text style={[styles.addPersonBtnText, { color: C.sage }]}>+ {t('splitTab.addParticipant')}</Text>
                    </TouchableOpacity>
                    {unallocatedPct > 0.005 && (
                      <View style={[styles.customSummary, { borderColor: C.rust }]}>
                        <Text style={[styles.customSummaryText, { color: C.rust }]}>
                          {t('splitTab.unallocated', { pct: unallocatedPct.toFixed(1) })}
                        </Text>
                      </View>
                    )}
                    {unallocatedPct <= 0.005 && allocatedPct > 0 && (
                      <View style={[styles.customSummary, { borderColor: C.lightBorder }]}>
                        <Text style={[styles.customSummaryText, { color: C.sage }]}>
                          100% {t('splitTab.allocated')}
                        </Text>
                      </View>
                    )}
                  </View>
                )}

                {/* Custom mode */}
                {quickMode === 'custom' && (
                  <View>
                    {customPersons.map((p, idx) => (
                      <View key={p.key} style={styles.customRow}>
                        <TextInput
                          style={[styles.customNameInput, { backgroundColor: C.cream, borderColor: C.lightBorder, color: C.darkSlate }]}
                          value={p.name}
                          onChangeText={v => setCustomPersons(prev => prev.map(cp => cp.key === p.key ? { ...cp, name: v } : cp))}
                          placeholder={`${t('splitTab.participantName')} ${idx + 1}`}
                          placeholderTextColor={C.sage}
                          autoCapitalize="words"
                        />
                        <TextInput
                          style={[styles.customAmountInput, { backgroundColor: C.cream, borderColor: C.lightBorder, color: C.darkSlate }]}
                          value={p.amount}
                          onChangeText={v => setCustomPersons(prev => prev.map(cp => cp.key === p.key ? { ...cp, amount: v } : cp))}
                          placeholder="0.00"
                          placeholderTextColor={C.sage}
                          keyboardType="decimal-pad"
                        />
                        {customPersons.length > 2 && (
                          <TouchableOpacity
                            onPress={() => setCustomPersons(prev => prev.filter(cp => cp.key !== p.key))}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          >
                            <Text style={[styles.removeText, { color: C.sage }]}>✕</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    ))}
                    <TouchableOpacity
                      style={[styles.addPersonBtn, { borderColor: C.lightBorder }]}
                      onPress={addCustomPerson}
                    >
                      <Text style={[styles.addPersonBtnText, { color: C.sage }]}>+ {t('splitTab.addParticipant')}</Text>
                    </TouchableOpacity>
                    {totalAmount > 0 && (
                      <View style={[styles.customSummary, { borderColor: C.lightBorder }]}>
                        <Text style={[styles.customSummaryText, { color: Math.abs(customRemaining) < 0.01 ? C.sage : C.rust }]}>
                          {t('splitTab.remaining')}: {customRemaining.toFixed(2)} {quickCurrency}
                        </Text>
                      </View>
                    )}
                  </View>
                )}

              {/* Save to trip */}
              {isPremium && totalAmount > 0 && (
                <View style={[styles.saveTripSection, { borderTopColor: C.lightBorder }]}>
                  <Text style={[styles.saveTripLabel, { color: C.sage }]}>{t('result.addToTrip')}</Text>
                  {activeTrips.length === 0 ? (
                    <Text style={[styles.saveTripEmpty, { color: C.sage }]}>{t('result.noTrips')}</Text>
                  ) : (
                    <View style={styles.saveTripChips}>
                      {activeTrips.map(tr => {
                        const sel = selectedTripIdForSave === tr.id;
                        return (
                          <TouchableOpacity
                            key={tr.id}
                            style={[styles.saveTripChip, {
                              backgroundColor: sel ? C.sage : C.cream,
                              borderColor: sel ? C.sage : C.lightBorder,
                            }]}
                            onPress={() => setSelectedTripIdForSave(sel ? null : tr.id)}
                            activeOpacity={0.75}
                          >
                            <Text style={[styles.saveTripChipText, { color: sel ? '#fff' : C.darkSlate }]}
                              numberOfLines={1}>
                              {sel ? '✓ ' : ''}{tr.name}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  )}
                  {selectedTripIdForSave && (
                    <TouchableOpacity
                      style={[styles.saveTripBtn, { backgroundColor: C.rust }]}
                      onPress={handleSaveToTrip}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.saveTripBtnText}>{t('result.save')}</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
              </View>

              {/* My Trips header */}
              {isPremium ? (
                <View style={styles.tripsHeader}>
                  <Text style={[styles.sectionTitle, { color: C.darkSlate }]}>{t('splitTab.trips')}</Text>
                  <TouchableOpacity
                    style={[styles.newTripBtn, { backgroundColor: C.rust }]}
                    onPress={() => router.push('/new-trip')}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.newTripBtnText}>+ {t('splitTab.newTrip')}</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={[styles.premiumLock, { backgroundColor: C.white, borderColor: C.lightBorder }]}>
                  <Text style={[styles.premiumLockText, { color: C.darkSlate }]}>🔒 {t('premium.tripsLocked')}</Text>
                  <Text style={[styles.premiumLockHint, { color: C.sage }]}>{t('premium.tripsLockedHint')}</Text>
                </View>
              )}
            </>
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>🗺️</Text>
              <Text style={[styles.emptyText, { color: C.darkSlate }]}>{t('splitTab.noTrips')}</Text>
              <Text style={[styles.emptyHint, { color: C.sage }]}>{t('splitTab.noTripsHint')}</Text>
            </View>
          }
          contentContainerStyle={styles.listContent}
        />
      </KeyboardAvoidingView>

      {/* Saved-to-trip toast */}
      {savedToTripVisible && (
        <View style={[styles.savedToast, { backgroundColor: C.darkSlate }]} pointerEvents="none">
          <Text style={styles.savedToastText}>✓  {t('result.savedConfirm')}</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  listContent: { paddingBottom: 32 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
    borderBottomWidth: 2,
    marginBottom: 16,
  },
  title: {
    fontFamily: Typography.serif,
    fontSize: 22,
    fontWeight: '700',
  },
  helpBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  helpBtnText: {
    fontFamily: Typography.mono,
    fontSize: 16,
    fontWeight: '700',
  },
  card: {
    marginHorizontal: 16,
    marginBottom: 20,
    borderWidth: 1.5,
    borderRadius: Radius.md,
    padding: 16,
  },
  sectionTitle: {
    fontFamily: Typography.serif,
    fontWeight: '700',
    fontSize: 16,
    marginBottom: 4,
  },
  hint: {
    fontFamily: Typography.mono,
    fontSize: 11,
    marginBottom: 14,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  label: {
    fontFamily: Typography.serif,
    fontWeight: '600',
    fontSize: 14,
    marginBottom: 6,
  },
  amountRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', marginBottom: 10 },
  currencyCol: { width: 90 },
  input: {
    borderWidth: 1.5,
    borderRadius: Radius.sm,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontFamily: Typography.mono,
    fontSize: 18,
    marginBottom: 4,
  },
  scanBtn: {
    borderWidth: 1.5,
    borderRadius: Radius.sm,
    paddingVertical: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  scanBtnText: { fontFamily: Typography.mono, fontSize: 12 },
  modeRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  modeBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: Radius.sm,
    paddingVertical: 8,
    alignItems: 'center',
  },
  modeBtnText: { fontFamily: Typography.mono, fontSize: 12, fontWeight: '600' },
  stepperRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  stepperBtn: {
    width: 44,
    height: 44,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperBtnText: { color: '#fff', fontSize: 22, fontWeight: '600', lineHeight: 26 },
  stepperCount: {
    flex: 1,
    borderWidth: 2,
    borderRadius: Radius.sm,
    paddingVertical: 10,
    alignItems: 'center',
  },
  stepperCountText: { fontFamily: Typography.mono, fontSize: 16 },
  disabled: { opacity: 0.35 },
  quickResult: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14,
    borderWidth: 1.5,
    borderRadius: Radius.sm,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  quickResultLabel: { fontFamily: Typography.serif, fontSize: 14 },
  quickResultValue: { fontFamily: Typography.mono, fontSize: 20, fontWeight: '700' },
  customRow: { flexDirection: 'row', gap: 8, alignItems: 'center', marginBottom: 8 },
  customNameInput: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: Radius.sm,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontFamily: Typography.mono,
    fontSize: 14,
  },
  customAmountInput: {
    width: 90,
    borderWidth: 1.5,
    borderRadius: Radius.sm,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontFamily: Typography.mono,
    fontSize: 14,
    textAlign: 'right',
  },
  removeText: { fontSize: 16, width: 24, textAlign: 'center' },
  addPersonBtn: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderRadius: Radius.sm,
    paddingVertical: 9,
    alignItems: 'center',
    marginBottom: 8,
  },
  addPersonBtnText: { fontFamily: Typography.mono, fontSize: 12 },
  customSummary: {
    borderWidth: 1,
    borderRadius: Radius.sm,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  customSummaryText: { fontFamily: Typography.mono, fontSize: 12 },
  tripsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  newTripBtn: {
    borderRadius: Radius.sm,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  newTripBtnText: {
    fontFamily: Typography.mono,
    fontSize: 13,
    color: '#fff',
    fontWeight: '600',
  },
  tripCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 10,
    borderWidth: 1.5,
    borderRadius: Radius.md,
    padding: 14,
  },
  tripCardInner: { flex: 1 },
  tripNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  tripName: {
    fontFamily: Typography.serif,
    fontWeight: '700',
    fontSize: 16,
    flexShrink: 1,
  },
  settledBadge: {
    fontFamily: Typography.mono,
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  tripMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  tripMetaText: { fontFamily: Typography.mono, fontSize: 12 },
  tripCurrency: { fontFamily: Typography.mono, fontSize: 12 },
  colorDotsRow: { flexDirection: 'row', gap: 4 },
  colorDot: { width: 8, height: 8, borderRadius: 4 },
  tripChevron: { fontSize: 22, marginLeft: 8 },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 32,
  },
  emptyIcon: { fontSize: 40, marginBottom: 12 },
  emptyText: {
    fontFamily: Typography.serif,
    fontWeight: '700',
    fontSize: 16,
    marginBottom: 6,
    textAlign: 'center',
  },
  emptyHint: {
    fontFamily: Typography.mono,
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
  // Camera
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  centerText: { fontFamily: Typography.serif, fontSize: 15 },
  cameraContainer: { flex: 1, backgroundColor: '#000' },
  camera: { flex: 1 },
  cameraControls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#0d1b2a',
  },
  captureBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#c0392b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureBtnText: { fontFamily: Typography.serif, fontSize: 11, color: '#fff', fontWeight: '600' },
  cancelCameraBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelCameraBtnText: { fontSize: 18, color: '#fff' },
  primaryBtn: { borderRadius: Radius.sm, paddingVertical: 12, paddingHorizontal: 24 },
  primaryBtnText: { fontFamily: Typography.mono, fontSize: 14, color: '#fff', fontWeight: '600' },
  cancelText: { fontFamily: Typography.mono, fontSize: 13 },
  percInputGroup: { flexDirection: 'row', alignItems: 'center', width: 70 },
  percPctInput: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: Radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 8,
    fontFamily: Typography.mono,
    fontSize: 14,
    textAlign: 'right',
  },
  percSymbol: { fontFamily: Typography.mono, fontSize: 13, marginLeft: 4 },
  percAmt: { fontFamily: Typography.mono, fontSize: 13, fontWeight: '600', minWidth: 60, textAlign: 'right' },
  premiumLock: {
    marginHorizontal: 16,
    marginBottom: 10,
    borderWidth: 1.5,
    borderRadius: Radius.md,
    padding: 16,
    alignItems: 'center',
  },
  premiumLockText: { fontFamily: Typography.serif, fontWeight: '700', fontSize: 15, marginBottom: 4 },
  premiumLockHint: { fontFamily: Typography.mono, fontSize: 12, textAlign: 'center' },
  // Save to trip
  saveTripSection: {
    borderTopWidth: 1,
    marginTop: 14,
    paddingTop: 12,
  },
  saveTripLabel: {
    fontFamily: Typography.mono,
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  saveTripEmpty: { fontFamily: Typography.mono, fontSize: 13 },
  saveTripChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  saveTripChip: {
    borderWidth: 1.5,
    borderRadius: Radius.sm,
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  saveTripChipText: { fontFamily: Typography.mono, fontSize: 12, maxWidth: 120 },
  saveTripBtn: {
    borderRadius: Radius.sm,
    paddingVertical: 10,
    alignItems: 'center',
  },
  saveTripBtnText: { fontFamily: Typography.mono, fontSize: 13, fontWeight: '600', color: '#fff', letterSpacing: 0.5 },
  savedToast: {
    position: 'absolute',
    top: 60,
    alignSelf: 'center',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 20,
  },
  savedToastText: { fontFamily: Typography.mono, fontSize: 13, color: '#fff', fontWeight: '600' },
});
