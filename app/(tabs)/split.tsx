import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Modal,
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

import { useTripStore } from '../../store/tripStore';
import { useSettingsStore } from '../../store/settingsStore';
import { useHistoryStore } from '../../store/historyStore';
import { useColors } from '../../hooks/useColors';
import { Typography, Radius } from '../../constants/Theme';
import { formatAmount } from '../../utils/tipCalculations';
import { parseAmountsFromText, extractItemLines, classifyOcrLinesFromBlocks, ItemLine } from '../../utils/parseAmounts';
import OcrItemReview from '../../components/OcrItemReview';
import ContinentCountryPicker from '../../components/ContinentCountryPicker';
import TripPickerDropdown from '../../components/TripPickerDropdown';
import TipBanner from '../../components/TipBanner';
import { useCountryFromLocation } from '../../hooks/useCountryFromLocation';
import { tippingData, ContinentKey } from '../../data/tippingData';

// Lazy-load ML Kit
let TextRecognition: typeof import('@react-native-ml-kit/text-recognition').default | null = null;
try {
  TextRecognition = require('@react-native-ml-kit/text-recognition').default;
} catch {
  TextRecognition = null;
}

let manipulateAsync: ((uri: string, actions: any[], options?: any) => Promise<{ uri: string; width: number; height: number }>) | null = null;
try {
  manipulateAsync = require('expo-image-manipulator').manipulateAsync;
} catch {
  manipulateAsync = null;
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
  const { userName, homeCurrency, favouriteCountries, patch, savedParticipantNames, addSavedParticipantName } = useSettingsStore();
  const { entries: historyEntries, addEntry } = useHistoryStore();
  const { prefillAmount, prefillCurrency: _prefillCurrency, prefillContinent, prefillCountry } = useLocalSearchParams<{
    prefillAmount?: string;
    prefillCurrency?: string;
    prefillContinent?: string;
    prefillCountry?: string;
  }>();
  const locationDefault = useCountryFromLocation();

  const recentCountries = useMemo(
    () => [...new Set(historyEntries.map(e => e.country))].slice(0, 3),
    [historyEntries],
  );

  // Country / currency state
  const [quickContinent, setQuickContinent] = useState<ContinentKey | ''>('');
  const [quickCountry, setQuickCountry] = useState('');

  const countryData = useMemo(() => {
    if (!quickContinent || !quickCountry) return null;
    return (tippingData[quickContinent as ContinentKey] as any)?.[quickCountry] ?? null;
  }, [quickContinent, quickCountry]);

  const quickCurrency: string = countryData?.currency ?? 'NOK';

  // Quick Split state
  const [quickAmount, setQuickAmount] = useState('');
  const [quickPeople, setQuickPeople] = useState(2);
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
  const [ocrImageUri, setOcrImageUri] = useState<string | null>(null);
  const [ocrImageDims, setOcrImageDims] = useState<{ w: number; h: number } | null>(null);
  const [ocrItems, setOcrItems] = useState<ItemLine[]>([]);
  const [showOcrReview, setShowOcrReview] = useState(false);

  // Save modal state
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
  const [savedVisible, setSavedVisible] = useState(false);

  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const nextKey = useRef(3);

  // Name autocomplete
  const [focusedNameKey, setFocusedNameKey] = useState<string | null>(null);
  const getNameSuggestions = useCallback((currentValue: string) => {
    if (!savedParticipantNames.length) return [];
    const q = currentValue.trim().toLowerCase();
    return savedParticipantNames.filter(n =>
      q === '' || n.toLowerCase().includes(q)
    ).slice(0, 5);
  }, [savedParticipantNames]);

  // Pre-fill from calculator "Splitt regning" or location
  useEffect(() => {
    if (prefillAmount) setQuickAmount(prefillAmount);
    if (prefillContinent) setQuickContinent(prefillContinent as ContinentKey);
    else if (locationDefault?.continent && !quickContinent) setQuickContinent(locationDefault.continent as ContinentKey);
    if (prefillCountry) setQuickCountry(prefillCountry);
    else if (locationDefault?.country && !quickCountry) setQuickCountry(locationDefault.country);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefillAmount, prefillContinent, prefillCountry, locationDefault?.continent, locationDefault?.country]);

  // Sync person arrays with quickPeople count
  useEffect(() => {
    setCustomPersons(prev => {
      if (quickPeople > prev.length) {
        const added = Array.from({ length: quickPeople - prev.length }, (_, i) => ({
          key: String(nextKey.current++),
          name: '',
          amount: '',
        }));
        return [...prev, ...added];
      }
      return prev.slice(0, quickPeople);
    });
    setPercPersons(prev => {
      if (quickPeople > prev.length) {
        const added = Array.from({ length: quickPeople - prev.length }, (_, i) => ({
          key: String(nextKey.current++),
          name: '',
          pct: '',
        }));
        return [...prev, ...added];
      }
      return prev.slice(0, quickPeople);
    });
  }, [quickPeople]);

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

  const handleToggleFavourite = useCallback(
    (c: string) => {
      const updated = favouriteCountries.includes(c)
        ? favouriteCountries.filter(f => f !== c)
        : [...favouriteCountries, c];
      patch({ favouriteCountries: updated });
    },
    [favouriteCountries, patch],
  );

  const processOcrUri = useCallback(async (uri: string) => {
    setScanning(true);
    setOcrImageUri(uri);
    try {
      if (!TextRecognition) throw new Error('unavailable');
      const result = await TextRecognition.recognize(uri);

      // Get image dims for overlay
      let dims: { w: number; h: number } | null = null;
      if (manipulateAsync) {
        try {
          const info = await manipulateAsync(uri, []);
          dims = { w: info.width, h: info.height };
        } catch { /* leave null */ }
      }

      const { lines, hasSpatial } = extractItemLines(result.blocks);
      if (hasSpatial && lines.length > 0) {
        setOcrItems(lines);
        setOcrImageDims(dims);
        setShowOcrReview(true);
      } else {
        // Fallback: show checklist with classified lines (no spatial data)
        const ocrLines = classifyOcrLinesFromBlocks(result.blocks);
        if (ocrLines.length > 0) {
          const fallbackItems: ItemLine[] = ocrLines
            .filter(l => l.amount != null && l.amount > 0 && l.kind !== 'skip' && l.kind !== 'header')
            .map((l, i) => ({
              id: `item-${i}`,
              text: l.label,
              label: l.label.slice(0, 40),
              amount: l.amount as number,
              frame: { left: 0, top: 0, width: 0, height: 0 },
              kind: (l.kind === 'total' ? 'total' : 'item') as ItemLine['kind'],
            }));
          if (fallbackItems.length > 0) {
            setOcrItems(fallbackItems);
            setOcrImageDims(null);
            setShowOcrReview(true);
          } else {
            Alert.alert('No amount found', 'Could not detect an amount. Enter manually.');
          }
        } else {
          Alert.alert('No amount found', 'Could not detect an amount. Enter manually.');
        }
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
    setQuickPeople(p => p + 1);
  }, []);

  const handleSave = useCallback(async () => {
    if (totalAmount <= 0) return;
    const label = saveName.trim() || `Split ${quickCurrency}`;
    await addEntry({
      continent: quickContinent || '',
      country: quickCountry || '',
      currency: quickCurrency,
      amount: totalAmount,
      tipPercent: 0,
      tipAmount: 0,
      total: totalAmount,
      perPerson: quickPeople > 0 ? totalAmount / quickPeople : totalAmount,
      people: quickPeople,
      homeTotal: null,
      homeCurrency,
      name: label,
    });
    if (selectedTripId) {
      const trip = activeTrips.find(tr => tr.id === selectedTripId);
      if (trip) {
        await addBill({
          tripId: selectedTripId,
          description: label,
          currency: quickCurrency,
          totalAmount,
          country: quickCountry || undefined,
          continent: quickContinent || undefined,
          paidBy: trip.participants[0]?.id ?? '',
          participants: trip.participants.map(p => p.id),
          splitMode: 'equal',
          splits: {},
          items: [],
        });
      }
    }
    setShowSaveModal(false);
    setSaveName('');
    setSelectedTripId(null);
    setSavedVisible(true);
    setTimeout(() => setSavedVisible(false), 2000);
  }, [totalAmount, saveName, quickCurrency, quickContinent, quickCountry, quickPeople, homeCurrency, selectedTripId, activeTrips, addEntry, addBill]);

  // Camera view
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
              <Text style={[styles.cancelText, { color: C.sage }]}>{t('cancel')}</Text>
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
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: C.sage }]}>
            <Text style={[styles.headerIcon, { color: C.rust }]}>✂️</Text>
            <Text style={[styles.title, { color: C.rust }]}>{t('splitTab.title')}</Text>
            <TouchableOpacity
              style={styles.helpBtn}
              onPress={() => router.push('/help-split')}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={[styles.helpBtnText, { color: C.rust }]}>?</Text>
            </TouchableOpacity>
          </View>

          <TipBanner tipKey="split" text={t('tip.splitTab')} />

          {/* Quick Split Card */}
          <View style={[styles.card, { backgroundColor: C.white, borderColor: C.lightBorder }]}>

            {/* Country picker */}
            <ContinentCountryPicker
              continent={quickContinent}
              country={quickCountry}
              onContinentChange={setQuickContinent}
              onCountryChange={setQuickCountry}
              favourites={favouriteCountries}
              onToggleFavourite={handleToggleFavourite}
              recentCountries={recentCountries}
              style={styles.pickerMargin}
            />

            {/* Amount + scan */}
            <Text style={[styles.label, { color: C.darkSlate }]}>{t('splitTab.amountLabel')}</Text>
            <View style={styles.amountRow}>
              <TextInput
                style={[styles.input, { backgroundColor: C.cream, borderColor: C.lightBorder, color: C.darkSlate }]}
                value={quickAmount}
                onChangeText={setQuickAmount}
                placeholder="0.00"
                placeholderTextColor={C.sage}
                keyboardType="decimal-pad"
                returnKeyType="done"
              />
              <TouchableOpacity
                style={[styles.scanIconBtn, { borderColor: C.lightBorder, backgroundColor: C.cream }]}
                onPress={async () => {
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
                  : <Text style={styles.scanIconText}>📷</Text>}
              </TouchableOpacity>
            </View>

            {/* People stepper — global */}
            <View style={[styles.stepperRow, styles.stepperMargin]}>
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

            {/* Mode toggle */}
            <View style={styles.modeRow}>
              {(['equal', 'percentage', 'custom'] as QuickMode[]).map(mode => (
                <TouchableOpacity
                  key={mode}
                  style={[
                    styles.modeBtn,
                    { borderColor: quickMode === mode ? C.rust : C.lightBorder },
                    { backgroundColor: quickMode === mode ? C.rust : C.cream },
                  ]}
                  onPress={() => setQuickMode(mode)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.modeBtnText, { color: quickMode === mode ? '#fff' : C.darkSlate }]}>
                    {t(`splitTab.mode${mode.charAt(0).toUpperCase() + mode.slice(1)}`)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Equal mode result */}
            {quickMode === 'equal' && equalResult !== null && (
              <View style={[styles.quickResult, { backgroundColor: C.cream, borderColor: C.lightBorder }]}>
                <Text style={[styles.quickResultLabel, { color: C.sage }]}>{t('splitTab.perPerson')}</Text>
                <Text style={[styles.quickResultValue, { color: C.rust }]}>
                  {formatAmount(equalResult, 2)} {quickCurrency}
                </Text>
              </View>
            )}

            {/* Percentage mode */}
            {quickMode === 'percentage' && (
              <View>
                {percPersons.map((p, idx) => {
                  const pctVal = parseFloat(p.pct) || 0;
                  const personAmt = totalAmount > 0 ? totalAmount * (pctVal / 100) : null;
                  const nameKey = `perc_${p.key}`;
                  const suggestions = focusedNameKey === nameKey ? getNameSuggestions(p.name) : [];
                  return (
                    <View key={p.key}>
                      <View style={styles.customRow}>
                        <TextInput
                          style={[styles.customNameInput, { backgroundColor: C.cream, borderColor: C.lightBorder, color: C.darkSlate }]}
                          value={p.name}
                          onChangeText={v => setPercPersons(prev => prev.map(pp => pp.key === p.key ? { ...pp, name: v } : pp))}
                          onFocus={() => setFocusedNameKey(nameKey)}
                          onBlur={() => {
                            if (p.name.trim()) addSavedParticipantName(p.name.trim());
                            setTimeout(() => setFocusedNameKey(prev => prev === nameKey ? null : prev), 150);
                          }}
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
                            onPress={() => {
                              setPercPersons(prev => prev.filter(pp => pp.key !== p.key));
                              setQuickPeople(prev => Math.max(1, prev - 1));
                            }}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          >
                            <Text style={[styles.removeText, { color: C.sage }]}>✕</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                      {suggestions.length > 0 && (
                        <View style={[styles.suggestionList, { backgroundColor: C.white, borderColor: C.lightBorder }]}>
                          {suggestions.map(name => (
                            <TouchableOpacity
                              key={name}
                              style={styles.suggestionRow}
                              onPress={() => {
                                setPercPersons(prev => prev.map(pp => pp.key === p.key ? { ...pp, name } : pp));
                                setFocusedNameKey(null);
                              }}
                            >
                              <Text style={[styles.suggestionText, { color: C.darkSlate }]}>{name}</Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      )}
                    </View>
                  );
                })}
                <TouchableOpacity
                  style={[styles.addPersonBtn, { borderColor: C.lightBorder }]}
                  onPress={() => {
                    const key = String(nextKey.current++);
                    setPercPersons(prev => [...prev, { key, name: '', pct: '' }]);
                    setQuickPeople(p => p + 1);
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
                {customPersons.map((p, idx) => {
                  const nameKey = `custom_${p.key}`;
                  const suggestions = focusedNameKey === nameKey ? getNameSuggestions(p.name) : [];
                  return (
                    <View key={p.key}>
                      <View style={styles.customRow}>
                        <TextInput
                          style={[styles.customNameInput, { backgroundColor: C.cream, borderColor: C.lightBorder, color: C.darkSlate }]}
                          value={p.name}
                          onChangeText={v => setCustomPersons(prev => prev.map(cp => cp.key === p.key ? { ...cp, name: v } : cp))}
                          onFocus={() => setFocusedNameKey(nameKey)}
                          onBlur={() => {
                            if (p.name.trim()) addSavedParticipantName(p.name.trim());
                            setTimeout(() => setFocusedNameKey(prev => prev === nameKey ? null : prev), 150);
                          }}
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
                            onPress={() => {
                              setCustomPersons(prev => prev.filter(cp => cp.key !== p.key));
                              setQuickPeople(prev => Math.max(1, prev - 1));
                            }}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          >
                            <Text style={[styles.removeText, { color: C.sage }]}>✕</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                      {suggestions.length > 0 && (
                        <View style={[styles.suggestionList, { backgroundColor: C.white, borderColor: C.lightBorder }]}>
                          {suggestions.map(name => (
                            <TouchableOpacity
                              key={name}
                              style={styles.suggestionRow}
                              onPress={() => {
                                setCustomPersons(prev => prev.map(cp => cp.key === p.key ? { ...cp, name } : cp));
                                setFocusedNameKey(null);
                              }}
                            >
                              <Text style={[styles.suggestionText, { color: C.darkSlate }]}>{name}</Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      )}
                    </View>
                  );
                })}
                <TouchableOpacity
                  style={[styles.addPersonBtn, { borderColor: C.lightBorder }]}
                  onPress={addCustomPerson}
                >
                  <Text style={[styles.addPersonBtnText, { color: C.sage }]}>+ {t('splitTab.addParticipant')}</Text>
                </TouchableOpacity>
                {totalAmount > 0 && (
                  <View style={[styles.customSummary, { borderColor: Math.abs(customRemaining) < 0.01 ? C.lightBorder : C.rust }]}>
                    <Text style={[styles.customSummaryText, { color: Math.abs(customRemaining) < 0.01 ? C.sage : C.rust }]}>
                      {t('splitTab.remaining')}: {customRemaining.toFixed(2)} {quickCurrency}
                    </Text>
                  </View>
                )}
              </View>
            )}

            {/* Save button */}
            {totalAmount > 0 && (
              <View style={[styles.saveSection, { borderTopColor: C.lightBorder }]}>
                <TouchableOpacity
                  style={[styles.saveBtn, { backgroundColor: C.rust }]}
                  onPress={() => {
                    setSaveName('');
                    setShowSaveModal(true);
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={styles.saveBtnText}>💾 {t('result.save')}</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          <TouchableOpacity
            style={[styles.archiveBtn, { borderColor: C.lightBorder }]}
            onPress={() => router.push('/(tabs)/two' as any)}
            activeOpacity={0.7}
          >
            <Text style={[styles.archiveBtnText, { color: C.sage }]}>🗃️  {t('settings.archiveLink')}</Text>
          </TouchableOpacity>

          <View style={styles.bottomPad} />
        </ScrollView>
      </KeyboardAvoidingView>

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
              placeholder={t('result.billNamePlaceholder')}
              placeholderTextColor={C.sage}
              autoCapitalize="words"
              returnKeyType="done"
              autoFocus
            />

            <TripPickerDropdown
              value={selectedTripId}
              onChange={setSelectedTripId}
              trips={activeTrips}
              label={t('result.addToTrip')}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalCancelBtn, { borderColor: C.lightBorder }]}
                onPress={() => setShowSaveModal(false)}
                activeOpacity={0.7}
              >
                <Text style={[styles.modalCancelText, { color: C.sage }]}>{t('cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSaveBtn, { backgroundColor: C.rust }]}
                onPress={handleSave}
                activeOpacity={0.8}
              >
                <Text style={styles.modalSaveText}>{t('result.saved')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Saved toast */}
      {savedVisible && (
        <View style={[styles.savedToast, { backgroundColor: C.darkSlate }]} pointerEvents="none">
          <Text style={styles.savedToastText}>✓  {t('result.saved')}</Text>
        </View>
      )}

      <OcrItemReview
        visible={showOcrReview}
        imageUri={ocrImageUri}
        imageDims={ocrImageDims}
        items={ocrItems}
        currency={quickCurrency}
        onConfirm={(selected) => {
          const total = selected.reduce((s, l) => s + l.amount, 0);
          if (total > 0) setQuickAmount(total.toFixed(2));
          setShowOcrReview(false);
        }}
        onCancel={() => setShowOcrReview(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  scrollContent: { paddingBottom: 32 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
    borderBottomWidth: 2,
    marginBottom: 16,
    gap: 8,
  },
  headerIcon: { fontSize: 22 },
  title: {
    fontFamily: Typography.serif,
    fontSize: 22,
    fontWeight: '700',
    flex: 1,
  },
  helpBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  helpBtnText: {
    fontFamily: Typography.mono,
    fontSize: 22,
    fontWeight: '700',
  },
  card: {
    marginHorizontal: 16,
    marginBottom: 20,
    borderWidth: 1.5,
    borderRadius: Radius.md,
    padding: 16,
  },
  pickerMargin: { marginBottom: 14 },
  label: {
    fontFamily: Typography.serif,
    fontWeight: '600',
    fontSize: 14,
    marginBottom: 6,
  },
  amountRow: { flexDirection: 'row', gap: 8, alignItems: 'center', marginBottom: 14 },
  input: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: Radius.sm,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontFamily: Typography.mono,
    fontSize: 18,
  },
  scanIconBtn: {
    width: 48,
    height: 48,
    borderWidth: 1.5,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanIconText: { fontSize: 20 },
  stepperMargin: { marginBottom: 14 },
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
    borderWidth: 1.5,
    borderRadius: Radius.sm,
    paddingVertical: 10,
    alignItems: 'center',
  },
  stepperCountText: { fontFamily: Typography.mono, fontSize: 14 },
  disabled: { opacity: 0.4 },
  modeRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  modeBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: Radius.sm,
    paddingVertical: 8,
    alignItems: 'center',
  },
  modeBtnText: { fontFamily: Typography.mono, fontSize: 12, fontWeight: '600' },
  quickResult: {
    borderWidth: 1.5,
    borderRadius: Radius.sm,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  quickResultLabel: { fontFamily: Typography.mono, fontSize: 12 },
  quickResultValue: { fontFamily: Typography.mono, fontSize: 22, fontWeight: '700' },
  customRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
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
  percInputGroup: { flexDirection: 'row', alignItems: 'center', width: 80, flexShrink: 0 },
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
  percAmt: { fontFamily: Typography.mono, fontSize: 13, fontWeight: '600', width: 65, flexShrink: 0, textAlign: 'right' },
  suggestionList: {
    borderWidth: 1,
    borderRadius: Radius.sm,
    marginBottom: 4,
    overflow: 'hidden',
  },
  suggestionRow: { paddingVertical: 8, paddingHorizontal: 12 },
  suggestionText: { fontFamily: Typography.mono, fontSize: 13 },
  archiveBtn: {
    borderWidth: 1.5,
    borderRadius: Radius.sm,
    paddingVertical: 10,
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 4,
  },
  archiveBtnText: { fontFamily: Typography.mono, fontSize: 13 },
  saveSection: {
    borderTopWidth: 1,
    marginTop: 14,
    paddingTop: 12,
  },
  saveBtn: {
    borderRadius: Radius.sm,
    paddingVertical: 12,
    alignItems: 'center',
  },
  saveBtnText: { fontFamily: Typography.mono, fontSize: 14, fontWeight: '600', color: '#fff', letterSpacing: 0.5 },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
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
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: Typography.mono,
    fontSize: 15,
  },
  modalButtons: { flexDirection: 'row', gap: 10, marginTop: 4 },
  modalCancelBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: Radius.sm,
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalCancelText: { fontFamily: Typography.mono, fontSize: 14 },
  modalSaveBtn: {
    flex: 1,
    borderRadius: Radius.sm,
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalSaveText: { fontFamily: Typography.mono, fontSize: 14, fontWeight: '600', color: '#fff' },
  // Toast
  savedToast: {
    position: 'absolute',
    top: 60,
    alignSelf: 'center',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 20,
  },
  savedToastText: { fontFamily: Typography.mono, fontSize: 13, color: '#fff', fontWeight: '600' },
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
  bottomPad: { height: 20 },
});
