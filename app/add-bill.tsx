import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
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

import { useTripStore, Bill, BillItem, Participant, SplitMode } from '../store/tripStore';
import { useSettingsStore } from '../store/settingsStore';
import { useColors } from '../hooks/useColors';
import { Typography, Radius } from '../constants/Theme';
import {
  computeEqualSplits,
  computePercentageSplits,
  computeItemizedSplits,
} from '../utils/settlement';
import { parseItemsFromText } from '../utils/parseAmounts';

// Lazy-load ML Kit
let TextRecognition: typeof import('@react-native-ml-kit/text-recognition').default | null = null;
try {
  TextRecognition = require('@react-native-ml-kit/text-recognition').default;
} catch {
  TextRecognition = null;
}

let manipulateAsync: ((uri: string, actions: any[], options?: any) => Promise<{ uri: string }>) | null = null;
try {
  manipulateAsync = require('expo-image-manipulator').manipulateAsync;
} catch {
  manipulateAsync = null;
}

const SPLIT_MODES: SplitMode[] = ['equal', 'percentage', 'custom', 'itemized'];

function generateId() {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export default function AddBillScreen() {
  const { t } = useTranslation();
  const C = useColors();
  const { tripId, billId } = useLocalSearchParams<{ tripId: string; billId?: string }>();
  const { trips, addBill, updateBill } = useTripStore();
  const { homeCurrency } = useSettingsStore();

  const trip = trips.find(tr => tr.id === tripId);
  const existingBill = billId ? trip?.bills.find(b => b.id === billId) : undefined;
  const isEdit = !!existingBill;

  // Form state
  const [description, setDescription] = useState(existingBill?.description ?? '');
  const [rawAmount, setRawAmount] = useState(existingBill ? String(existingBill.totalAmount) : '');
  const [currency, setCurrency] = useState(existingBill?.currency ?? trip?.lastCurrency ?? 'USD');
  const [paidBy, setPaidBy] = useState(existingBill?.paidBy ?? trip?.participants[0]?.id ?? '');
  const [splitMode, setSplitMode] = useState<SplitMode>(existingBill?.splitMode ?? 'equal');
  const [includedIds, setIncludedIds] = useState<string[]>(
    existingBill?.participants ?? trip?.participants.map(p => p.id) ?? [],
  );

  // Percentage splits state (participantId → string percentage)
  const [percentages, setPercentages] = useState<Record<string, string>>(() => {
    if (existingBill?.splitMode === 'percentage') {
      const total = existingBill.totalAmount;
      const result: Record<string, string> = {};
      for (const [pid, amt] of Object.entries(existingBill.splits)) {
        result[pid] = total > 0 ? ((amt / total) * 100).toFixed(1) : '0';
      }
      return result;
    }
    return {};
  });

  // Custom splits state (participantId → string amount)
  const [customAmounts, setCustomAmounts] = useState<Record<string, string>>(() => {
    if (existingBill?.splitMode === 'custom') {
      const result: Record<string, string> = {};
      for (const [pid, amt] of Object.entries(existingBill.splits)) {
        result[pid] = String(amt);
      }
      return result;
    }
    return {};
  });

  // Itemized bill items
  const [items, setItems] = useState<BillItem[]>(existingBill?.items ?? []);

  // OCR state
  const [scanning, setScanning] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const [cameraLayout, setCameraLayout] = useState({ width: 0, height: 0 });

  const participants = trip?.participants ?? [];
  const includedParticipants = participants.filter(p => includedIds.includes(p.id));

  // Keep includedIds in sync when participants change
  useEffect(() => {
    if (!existingBill) {
      setIncludedIds(participants.map(p => p.id));
    }
  }, [participants.length]);

  const totalAmount = parseFloat(rawAmount.replace(',', '.')) || 0;

  // Equal split preview
  const equalSplitAmount = includedParticipants.length > 0 && totalAmount > 0
    ? totalAmount / includedParticipants.length
    : null;

  // Percentage validation
  const percentageTotal = includedParticipants.reduce((sum, p) => {
    const v = parseFloat(percentages[p.id] ?? '0');
    return sum + (isNaN(v) ? 0 : v);
  }, 0);
  const percentageValid = Math.abs(percentageTotal - 100) < 0.5;

  // Custom amount remaining
  const customAllocated = includedParticipants.reduce((sum, p) => {
    const v = parseFloat(customAmounts[p.id] ?? '0');
    return sum + (isNaN(v) ? 0 : v);
  }, 0);
  const customRemaining = totalAmount - customAllocated;

  // Itemized total
  const itemsTotal = items.reduce((sum, item) => sum + item.amount, 0);

  const canSave = (() => {
    if (!tripId || totalAmount <= 0 || !paidBy || includedParticipants.length === 0) return false;
    if (splitMode === 'percentage' && !percentageValid) return false;
    if (splitMode === 'itemized' && items.length === 0) return false;
    return true;
  })();

  const computeSplits = (): Record<string, number> => {
    const ids = includedParticipants.map(p => p.id);
    switch (splitMode) {
      case 'equal':
        return computeEqualSplits(totalAmount, ids);
      case 'percentage': {
        const pcts: Record<string, number> = {};
        for (const p of includedParticipants) {
          pcts[p.id] = parseFloat(percentages[p.id] ?? '0') || 0;
        }
        return computePercentageSplits(totalAmount, pcts);
      }
      case 'custom': {
        const splits: Record<string, number> = {};
        for (const p of includedParticipants) {
          splits[p.id] = parseFloat(customAmounts[p.id] ?? '0') || 0;
        }
        return splits;
      }
      case 'itemized':
        return computeItemizedSplits(items, ids);
    }
  };

  const handleSave = useCallback(async () => {
    if (!canSave || !tripId) return;
    const splits = computeSplits();
    const billData = {
      tripId,
      description,
      currency,
      totalAmount,
      paidBy,
      splitMode,
      participants: includedIds,
      items,
      splits,
    };
    if (isEdit && billId) {
      await updateBill(tripId, billId, billData);
    } else {
      await addBill(billData);
    }
    router.back();
  }, [canSave, tripId, billId, isEdit, description, currency, totalAmount, paidBy, splitMode, includedIds, items, addBill, updateBill]);

  // ── OCR ───────────────────────────────────────────────────────────────────
  const processOcrUri = useCallback(async (uri: string) => {
    setScanning(true);
    try {
      if (!TextRecognition) throw new Error('OCR not available');
      const result = await TextRecognition.recognize(uri);
      const parsed = parseItemsFromText(result.text);
      if (parsed.length > 0) {
        const newItems: BillItem[] = parsed.map(item => ({
          id: generateId(),
          label: item.label,
          amount: item.value,
          assignedTo: [],
        }));
        setItems(prev => [...prev, ...newItems]);
      } else {
        Alert.alert('No items found', 'Could not detect line items. Add them manually.');
      }
    } catch (e: any) {
      Alert.alert('Scan error', e.message ?? 'Could not process image');
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
    let uri = photo.uri;
    if (manipulateAsync && cameraLayout.width > 0) {
      const scaleX = photo.width / cameraLayout.width;
      const scaleY = photo.height / cameraLayout.height;
      try {
        const cropped = await manipulateAsync(
          photo.uri,
          [{ crop: { originX: 0, originY: 0, width: photo.width * 0.9, height: photo.height * 0.9 } }],
          { compress: 0.9, format: 'jpeg' as any },
        );
        uri = cropped.uri;
      } catch { /* use full image */ }
    }
    await processOcrUri(uri);
  }, [processOcrUri, cameraLayout]);

  const toggleIncluded = (pid: string) => {
    setIncludedIds(prev =>
      prev.includes(pid) ? prev.filter(id => id !== pid) : [...prev, pid],
    );
  };

  const addItem = () => {
    setItems(prev => [...prev, { id: generateId(), label: '', amount: 0, assignedTo: [] }]);
  };

  const updateItem = (id: string, updates: Partial<BillItem>) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, ...updates } : item));
  };

  const removeItem = (id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
  };

  const toggleItemAssignee = (itemId: string, pid: string) => {
    setItems(prev => prev.map(item => {
      if (item.id !== itemId) return item;
      const assigned = item.assignedTo.includes(pid)
        ? item.assignedTo.filter(id => id !== pid)
        : [...item.assignedTo, pid];
      return { ...item, assignedTo: assigned };
    }));
  };

  if (!trip) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: C.cream }]}>
        <View style={styles.center}>
          <Text style={[styles.emptyText, { color: C.sage }]}>Trip not found.</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ── Camera view ──────────────────────────────────────────────────────────
  if (showCamera) {
    if (!permission?.granted) {
      return (
        <SafeAreaView style={[styles.safe, { backgroundColor: C.cream }]}>
          <View style={styles.center}>
            <Text style={[styles.emptyText, { color: C.darkSlate }]}>{t('scan.permission')}</Text>
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
        <CameraView
          ref={cameraRef}
          style={styles.camera}
          facing="back"
          onLayout={e => setCameraLayout(e.nativeEvent.layout)}
        />
        <View style={styles.cameraControls}>
          <TouchableOpacity style={styles.cancelCameraBtn} onPress={() => setShowCamera(false)}>
            <Text style={styles.cancelCameraBtnText}>✕</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.captureBtn}
            onPress={handleCapture}
            disabled={scanning}
          >
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
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: C.lightBorder, backgroundColor: C.white }]}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.back()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={[styles.backBtnText, { color: C.rust }]}>✕</Text>
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: C.darkSlate }]}>
            {isEdit ? description || t('splitTab.billDescription') : t('splitTab.addBill')}
          </Text>
          <TouchableOpacity
            style={[styles.saveHeaderBtn, { backgroundColor: canSave ? C.rust : C.lightBorder }]}
            onPress={handleSave}
            disabled={!canSave}
          >
            <Text style={styles.saveHeaderBtnText}>{t('splitTab.save')}</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.flex} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

          {/* Description */}
          <Text style={[styles.label, { color: C.darkSlate }]}>{t('splitTab.billDescription')}</Text>
          <TextInput
            style={[styles.input, { backgroundColor: C.white, borderColor: C.lightBorder, color: C.darkSlate }]}
            value={description}
            onChangeText={setDescription}
            placeholder={t('splitTab.billDescriptionPlaceholder')}
            placeholderTextColor={C.sage}
            autoCapitalize="sentences"
            returnKeyType="done"
          />

          {/* Amount + Currency */}
          <View style={styles.row}>
            <View style={styles.flex}>
              <Text style={[styles.label, { color: C.darkSlate }]}>{t('splitTab.amountLabel')}</Text>
              <TextInput
                style={[styles.input, { backgroundColor: C.white, borderColor: C.lightBorder, color: C.darkSlate }]}
                value={rawAmount}
                onChangeText={setRawAmount}
                placeholder="0.00"
                placeholderTextColor={C.sage}
                keyboardType="decimal-pad"
                returnKeyType="done"
              />
            </View>
            <View style={styles.currencyCol}>
              <Text style={[styles.label, { color: C.darkSlate }]}>{t('splitTab.currency')}</Text>
              <TextInput
                style={[styles.input, styles.currencyInput, { backgroundColor: C.white, borderColor: C.lightBorder, color: C.darkSlate }]}
                value={currency}
                onChangeText={v => setCurrency(v.toUpperCase().slice(0, 3))}
                placeholder="USD"
                placeholderTextColor={C.sage}
                autoCapitalize="characters"
                returnKeyType="done"
                maxLength={3}
              />
            </View>
          </View>

          {/* Paid by */}
          <Text style={[styles.label, { color: C.darkSlate }]}>{t('splitTab.paidBy')}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll}>
            <View style={styles.chipsRow}>
              {participants.map(p => (
                <TouchableOpacity
                  key={p.id}
                  style={[
                    styles.chip,
                    { borderColor: C.lightBorder, backgroundColor: C.white },
                    paidBy === p.id && { backgroundColor: C.rust, borderColor: C.rust },
                  ]}
                  onPress={() => setPaidBy(p.id)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.chipText, { color: paidBy === p.id ? '#fff' : C.darkSlate }]}>
                    {p.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          {/* Who's included */}
          <Text style={[styles.label, { color: C.darkSlate }]}>{t('splitTab.included')}</Text>
          <View style={styles.chipsRow}>
            {participants.map(p => (
              <TouchableOpacity
                key={p.id}
                style={[
                  styles.chip,
                  { borderColor: C.lightBorder, backgroundColor: C.white },
                  includedIds.includes(p.id) && { backgroundColor: C.rust, borderColor: C.rust },
                ]}
                onPress={() => toggleIncluded(p.id)}
                activeOpacity={0.7}
              >
                <Text style={[styles.chipText, { color: includedIds.includes(p.id) ? '#fff' : C.darkSlate }]}>
                  {p.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Split mode */}
          <Text style={[styles.label, { color: C.darkSlate }]}>{t('splitTab.splitMode')}</Text>
          <View style={styles.splitModeRow}>
            {SPLIT_MODES.map(mode => (
              <TouchableOpacity
                key={mode}
                style={[
                  styles.splitModeBtn,
                  { borderColor: C.lightBorder, backgroundColor: C.white },
                  splitMode === mode && { backgroundColor: C.rust, borderColor: C.rust },
                ]}
                onPress={() => setSplitMode(mode)}
                activeOpacity={0.7}
              >
                <Text style={[styles.splitModeBtnText, { color: splitMode === mode ? '#fff' : C.darkSlate }]}>
                  {t(`splitTab.split${mode.charAt(0).toUpperCase()}${mode.slice(1)}`)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* ── Equal split preview ── */}
          {splitMode === 'equal' && equalSplitAmount !== null && (
            <View style={[styles.previewRow, { backgroundColor: C.white, borderColor: C.lightBorder }]}>
              <Text style={[styles.previewLabel, { color: C.sage }]}>{t('splitTab.perPerson')}</Text>
              <Text style={[styles.previewValue, { color: C.rust }]}>
                {equalSplitAmount.toFixed(2)} {currency}
              </Text>
            </View>
          )}

          {/* ── Percentage split ── */}
          {splitMode === 'percentage' && (
            <View style={[styles.splitSection, { backgroundColor: C.white, borderColor: C.lightBorder }]}>
              {includedParticipants.map(p => (
                <View key={p.id} style={styles.splitRow}>
                  <Text style={[styles.splitName, { color: C.darkSlate }]}>{p.name}</Text>
                  <View style={styles.splitInputWrap}>
                    <TextInput
                      style={[styles.splitInput, { borderColor: C.lightBorder, color: C.darkSlate }]}
                      value={percentages[p.id] ?? ''}
                      onChangeText={v => setPercentages(prev => ({ ...prev, [p.id]: v }))}
                      keyboardType="decimal-pad"
                      returnKeyType="done"
                      placeholder="0"
                      placeholderTextColor={C.sage}
                    />
                    <Text style={[styles.splitUnit, { color: C.sage }]}>%</Text>
                  </View>
                </View>
              ))}
              <View style={[styles.splitTotal, { borderTopColor: C.lightBorder }]}>
                <Text style={[styles.splitTotalLabel, { color: percentageValid ? C.sage : C.rust }]}>
                  {percentageTotal.toFixed(1)}% {!percentageValid && `— ${t('splitTab.percentageSum')}`}
                </Text>
              </View>
            </View>
          )}

          {/* ── Custom amount split ── */}
          {splitMode === 'custom' && (
            <View style={[styles.splitSection, { backgroundColor: C.white, borderColor: C.lightBorder }]}>
              {includedParticipants.map(p => (
                <View key={p.id} style={styles.splitRow}>
                  <Text style={[styles.splitName, { color: C.darkSlate }]}>{p.name}</Text>
                  <View style={styles.splitInputWrap}>
                    <TextInput
                      style={[styles.splitInput, { borderColor: C.lightBorder, color: C.darkSlate }]}
                      value={customAmounts[p.id] ?? ''}
                      onChangeText={v => setCustomAmounts(prev => ({ ...prev, [p.id]: v }))}
                      keyboardType="decimal-pad"
                      returnKeyType="done"
                      placeholder="0.00"
                      placeholderTextColor={C.sage}
                    />
                    <Text style={[styles.splitUnit, { color: C.sage }]}>{currency}</Text>
                  </View>
                </View>
              ))}
              <View style={[styles.splitTotal, { borderTopColor: C.lightBorder }]}>
                <Text style={[styles.splitTotalLabel, { color: Math.abs(customRemaining) < 0.01 ? C.sage : C.rust }]}>
                  {t('splitTab.remaining')}: {customRemaining.toFixed(2)} {currency}
                </Text>
              </View>
            </View>
          )}

          {/* ── Itemized split ── */}
          {splitMode === 'itemized' && (
            <View>
              <View style={styles.itemizedToolbar}>
                <TouchableOpacity
                  style={[styles.scanItemsBtn, { borderColor: C.gold, backgroundColor: C.white }]}
                  onPress={async () => {
                    if (TextRecognition) {
                      if (!permission?.granted) {
                        const { granted } = await requestPermission();
                        if (!granted) {
                          await handlePickImage();
                          return;
                        }
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
                    : <Text style={[styles.scanItemsBtnText, { color: C.darkSlate }]}>📷 {t('splitTab.scanItems')}</Text>}
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.addItemBtn, { backgroundColor: C.rust }]}
                  onPress={addItem}
                  activeOpacity={0.8}
                >
                  <Text style={styles.addItemBtnText}>+ {t('splitTab.addItem')}</Text>
                </TouchableOpacity>
              </View>

              {items.map(item => (
                <View key={item.id} style={[styles.itemCard, { backgroundColor: C.white, borderColor: C.lightBorder }]}>
                  <View style={styles.itemRow}>
                    <TextInput
                      style={[styles.itemLabelInput, { borderColor: C.lightBorder, color: C.darkSlate }]}
                      value={item.label}
                      onChangeText={v => updateItem(item.id, { label: v })}
                      placeholder={t('splitTab.itemLabel')}
                      placeholderTextColor={C.sage}
                      returnKeyType="done"
                    />
                    <TextInput
                      style={[styles.itemAmountInput, { borderColor: C.lightBorder, color: C.darkSlate }]}
                      value={item.amount > 0 ? String(item.amount) : ''}
                      onChangeText={v => updateItem(item.id, { amount: parseFloat(v.replace(',', '.')) || 0 })}
                      keyboardType="decimal-pad"
                      returnKeyType="done"
                      placeholder="0.00"
                      placeholderTextColor={C.sage}
                    />
                    <TouchableOpacity onPress={() => removeItem(item.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                      <Text style={[styles.removeItemText, { color: C.sage }]}>✕</Text>
                    </TouchableOpacity>
                  </View>
                  {/* Assignee chips */}
                  <View style={styles.itemAssignees}>
                    <Text style={[styles.itemAssignLabel, { color: C.sage }]}>
                      {item.assignedTo.length === 0 ? 'All' : ''}
                    </Text>
                    {participants.map(p => {
                      const assigned = item.assignedTo.includes(p.id);
                      return (
                        <TouchableOpacity
                          key={p.id}
                          style={[
                            styles.assigneeChip,
                            { borderColor: C.lightBorder, backgroundColor: C.cream },
                            assigned && { backgroundColor: C.rust, borderColor: C.rust },
                          ]}
                          onPress={() => toggleItemAssignee(item.id, p.id)}
                          activeOpacity={0.7}
                        >
                          <Text style={[styles.assigneeChipText, { color: assigned ? '#fff' : C.sage }]}>
                            {p.name.split(' ')[0]}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              ))}

              {items.length > 0 && (
                <View style={[styles.previewRow, { backgroundColor: C.white, borderColor: C.lightBorder }]}>
                  <Text style={[styles.previewLabel, { color: C.sage }]}>Items total</Text>
                  <Text style={[styles.previewValue, { color: Math.abs(itemsTotal - totalAmount) < 0.01 ? C.rust : C.darkSlate }]}>
                    {itemsTotal.toFixed(2)} {currency}
                  </Text>
                </View>
              )}
            </View>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: 8,
  },
  backBtn: { width: 36, alignItems: 'center' },
  backBtnText: { fontSize: 18, fontWeight: '600' },
  headerTitle: {
    flex: 1,
    fontFamily: Typography.serif,
    fontWeight: '700',
    fontSize: 16,
  },
  saveHeaderBtn: {
    borderRadius: Radius.sm,
    paddingVertical: 7,
    paddingHorizontal: 14,
  },
  saveHeaderBtnText: {
    fontFamily: Typography.mono,
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
  content: { padding: 16, paddingBottom: 16 },
  label: {
    fontFamily: Typography.serif,
    fontWeight: '600',
    fontSize: 14,
    marginBottom: 7,
    marginTop: 12,
  },
  input: {
    borderWidth: 2,
    borderRadius: Radius.sm,
    paddingHorizontal: 13,
    paddingVertical: 10,
    fontFamily: Typography.mono,
    fontSize: 16,
    marginBottom: 4,
  },
  row: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  currencyCol: { width: 80 },
  currencyInput: { textAlign: 'center', letterSpacing: 2 },
  chipsScroll: { marginBottom: 4 },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  chip: {
    borderWidth: 1.5,
    borderRadius: Radius.sm,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  chipText: { fontFamily: Typography.mono, fontSize: 13 },
  splitModeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
  splitModeBtn: {
    borderWidth: 1.5,
    borderRadius: Radius.sm,
    paddingVertical: 7,
    paddingHorizontal: 12,
  },
  splitModeBtnText: { fontFamily: Typography.mono, fontSize: 12, fontWeight: '600' },
  previewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: Radius.sm,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 12,
  },
  previewLabel: { fontFamily: Typography.serif, fontSize: 14 },
  previewValue: { fontFamily: Typography.mono, fontSize: 17, fontWeight: '700' },
  splitSection: {
    borderWidth: 1.5,
    borderRadius: Radius.md,
    padding: 12,
    marginBottom: 12,
  },
  splitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  splitName: { fontFamily: Typography.serif, fontWeight: '600', fontSize: 14, flex: 1 },
  splitInputWrap: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  splitInput: {
    width: 80,
    borderWidth: 1.5,
    borderRadius: Radius.sm,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontFamily: Typography.mono,
    fontSize: 15,
    textAlign: 'right',
  },
  splitUnit: { fontFamily: Typography.mono, fontSize: 13, width: 36 },
  splitTotal: {
    borderTopWidth: 1,
    marginTop: 4,
    paddingTop: 8,
  },
  splitTotalLabel: { fontFamily: Typography.mono, fontSize: 12 },
  itemizedToolbar: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
    alignItems: 'center',
  },
  scanItemsBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: Radius.sm,
    paddingVertical: 9,
    alignItems: 'center',
  },
  scanItemsBtnText: { fontFamily: Typography.mono, fontSize: 13 },
  addItemBtn: {
    borderRadius: Radius.sm,
    paddingVertical: 9,
    paddingHorizontal: 14,
  },
  addItemBtnText: {
    fontFamily: Typography.mono,
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
  itemCard: {
    borderWidth: 1.5,
    borderRadius: Radius.md,
    padding: 10,
    marginBottom: 8,
  },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  itemLabelInput: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: Radius.sm,
    paddingHorizontal: 10,
    paddingVertical: 7,
    fontFamily: Typography.mono,
    fontSize: 13,
  },
  itemAmountInput: {
    width: 80,
    borderWidth: 1.5,
    borderRadius: Radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 7,
    fontFamily: Typography.mono,
    fontSize: 14,
    textAlign: 'right',
  },
  removeItemText: { fontSize: 16, width: 24, textAlign: 'center' },
  itemAssignees: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
    alignItems: 'center',
  },
  itemAssignLabel: { fontFamily: Typography.mono, fontSize: 11 },
  assigneeChip: {
    borderWidth: 1,
    borderRadius: Radius.sm,
    paddingVertical: 3,
    paddingHorizontal: 8,
  },
  assigneeChipText: { fontFamily: Typography.mono, fontSize: 11 },
  // Camera
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
  emptyText: { fontFamily: Typography.serif, fontSize: 15 },
});
