import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  TextInput,
  Image,
  FlatList,
  ScrollView,
  Modal,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors, Typography, Radius, Spacing } from '../constants/Theme';
import { useColors } from '../hooks/useColors';
import { useReceiptStore } from '../store/receiptStore';
import { extractRawLines, RawLine } from '../utils/parseAmounts';
import type { Participant } from '../store/tripStore';

// Lazy-load ML Kit — not available in Expo Go
let TextRecognition: typeof import('@react-native-ml-kit/text-recognition').default | null = null;
try { TextRecognition = require('@react-native-ml-kit/text-recognition').default; } catch { TextRecognition = null; }

let manipulateAsync: ((uri: string, actions: any[], options?: any) => Promise<{ uri: string; width: number; height: number }>) | null = null;
try { manipulateAsync = require('expo-image-manipulator').manipulateAsync; } catch { manipulateAsync = null; }

const FRAME_W = 300;
const FRAME_H = 420;

type ScreenMode = 'camera' | 'processing' | 'review' | 'assign';

interface LocalItem {
  id: string;
  label: string;
  amount: number;
  quantity: number;
  kind: RawLine['kind'];
  checked: boolean;
  assignedTo: string[];
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ReceiptItemsScreen() {
  const { t } = useTranslation();
  const C = useColors();
  const insets = useSafeAreaInsets();
  const context = useReceiptStore(s => s.context);

  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const [torchOn, setTorchOn] = useState(false);
  const [cameraLayout, setCameraLayout] = useState({ width: 0, height: 0 });

  const [mode, setMode] = useState<ScreenMode>('camera');
  const [capturedUri, setCapturedUri] = useState<string | null>(null);
  const [items, setItems] = useState<LocalItem[]>([]);
  const [showImageModal, setShowImageModal] = useState(false);

  const participants: Participant[] = context?.participants ?? [];
  const currency = context?.currency ?? '';

  // If context already contains an imageUri, skip camera
  useEffect(() => {
    if (context?.imageUri) {
      processUri(context.imageUri);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── OCR processing ──────────────────────────────────────────────────────────

  const processUri = useCallback(async (uri: string) => {
    setMode('processing');
    setCapturedUri(uri);
    try {
      if (!TextRecognition) throw new Error(t('scan.unavailable'));

      let ocrUri = uri;
      if (manipulateAsync) {
        try {
          const resized = await manipulateAsync(uri, [{ resize: { width: 1400 } }], { compress: 0.9, format: 'jpeg' });
          ocrUri = resized.uri;
        } catch { /* use original */ }
      }

      const result = await TextRecognition.recognize(ocrUri);
      const rawLines = extractRawLines(result.blocks);

      // Fallback: if no blocks, try with original full image
      let lines = rawLines;
      if (lines.length === 0 && ocrUri !== uri) {
        const fallback = await TextRecognition.recognize(uri);
        lines = extractRawLines(fallback.blocks);
      }

      const localItems: LocalItem[] = lines.map(l => ({
        id: l.id,
        label: l.label,
        amount: l.amount ?? 0,
        quantity: l.quantity,
        kind: l.kind,
        checked: l.kind === 'item' && l.amount !== null && l.amount > 0,
        assignedTo: [],
      }));

      setItems(localItems);
      setMode('review');
    } catch (e: any) {
      Alert.alert('Error', e.message ?? t('scan.error'), [{ text: 'OK', onPress: () => setMode('camera') }]);
    }
  }, [t]);

  // ── Camera capture ──────────────────────────────────────────────────────────

  const handleCapture = useCallback(async () => {
    if (!cameraRef.current) return;
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.9 });
      if (!photo?.uri) return;

      let uri = photo.uri;
      if (manipulateAsync && cameraLayout.width > 0 && cameraLayout.height > 0) {
        const scaleX = photo.width / cameraLayout.width;
        const scaleY = photo.height / cameraLayout.height;
        const originX = Math.max(0, ((cameraLayout.width - FRAME_W) / 2) * scaleX);
        const originY = Math.max(0, ((cameraLayout.height - FRAME_H) / 2) * scaleY);
        const cropW = Math.min(FRAME_W * scaleX, photo.width - originX);
        const cropH = Math.min(FRAME_H * scaleY, photo.height - originY);
        try {
          const cropped = await manipulateAsync(photo.uri, [{ crop: { originX, originY, width: cropW, height: cropH } }], { compress: 0.9, format: 'jpeg' });
          uri = cropped.uri;
        } catch { /* use full */ }
      }
      await processUri(uri);
    } catch { /* camera error */ }
  }, [processUri, cameraLayout]);

  const handlePickImage = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ quality: 0.9 });
    if (!result.canceled && result.assets[0]?.uri) {
      await processUri(result.assets[0].uri);
    }
  }, [processUri]);

  // ── Item mutation helpers ───────────────────────────────────────────────────

  const toggleItem = useCallback((id: string) => {
    setItems(prev => prev.map(it => it.id === id ? { ...it, checked: !it.checked } : it));
  }, []);

  const updateItemLabel = useCallback((id: string, label: string) => {
    setItems(prev => prev.map(it => it.id === id ? { ...it, label } : it));
  }, []);

  const updateItemAmount = useCallback((id: string, text: string) => {
    const amount = parseFloat(text.replace(',', '.')) || 0;
    setItems(prev => prev.map(it => it.id === id ? { ...it, amount } : it));
  }, []);

  const changeQty = useCallback((id: string, delta: number) => {
    setItems(prev => prev.map(it => {
      if (it.id !== id) return it;
      const newQty = Math.max(1, it.quantity + delta);
      const unitPrice = it.quantity > 0 ? it.amount / it.quantity : it.amount;
      return { ...it, quantity: newQty, amount: Math.round(unitPrice * newQty * 100) / 100 };
    }));
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems(prev => prev.filter(it => it.id !== id));
  }, []);

  const addItem = useCallback(() => {
    const id = `manual-${Date.now()}`;
    setItems(prev => [...prev, { id, label: '', amount: 0, quantity: 1, kind: 'item', checked: true, assignedTo: [] }]);
  }, []);

  const toggleAll = useCallback(() => {
    const allChecked = items.every(it => it.checked);
    setItems(prev => prev.map(it => ({ ...it, checked: !allChecked })));
  }, [items]);

  const toggleAssignee = useCallback((itemId: string, participantId: string) => {
    setItems(prev => prev.map(it => {
      if (it.id !== itemId) return it;
      const assignedTo = it.assignedTo.includes(participantId)
        ? it.assignedTo.filter(p => p !== participantId)
        : [...it.assignedTo, participantId];
      return { ...it, assignedTo };
    }));
  }, []);

  // ── Derived values ──────────────────────────────────────────────────────────

  const checkedItems = useMemo(() => items.filter(it => it.checked), [items]);
  const checkedTotal = useMemo(() => checkedItems.reduce((s, it) => s + (it.amount || 0), 0), [checkedItems]);

  const perPersonTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    for (const p of participants) totals[p.id] = 0;
    for (const item of checkedItems) {
      if (item.assignedTo.length === 0) continue;
      const share = (item.amount || 0) / item.assignedTo.length;
      for (const pid of item.assignedTo) {
        totals[pid] = (totals[pid] ?? 0) + share;
      }
    }
    return totals;
  }, [checkedItems, participants]);

  const confirmResult = useCallback(() => {
    useReceiptStore.getState().setResult({
      items: checkedItems.map(it => ({
        id: it.id,
        label: it.label || 'Item',
        amount: it.amount,
        quantity: it.quantity,
        assignedTo: it.assignedTo,
      })),
      imageUri: capturedUri,
      currency,
    });
    router.back();
  }, [checkedItems, capturedUri, currency]);

  // ── Unavailable guard ───────────────────────────────────────────────────────

  if (!TextRecognition) {
    return (
      <View style={[s.fill, s.center, { paddingTop: insets.top }]}>
        <Text style={s.unavailText}>{t('scan.unavailable')}</Text>
        <TouchableOpacity style={[s.rustBtn, { marginTop: 20 }]} onPress={() => router.back()}>
          <Text style={s.rustBtnText}>{t('cancel')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Camera mode ─────────────────────────────────────────────────────────────

  if (mode === 'camera') {
    if (!permission) return <View style={s.fill} />;

    if (!permission.granted) {
      return (
        <View style={[s.fill, s.center, { paddingTop: insets.top }]}>
          <Text style={s.unavailText}>{t('scan.permission')}</Text>
          <TouchableOpacity style={[s.rustBtn, { marginTop: 16 }]} onPress={requestPermission}>
            <Text style={s.rustBtnText}>{t('scan.permissionBtn')}</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={s.fill}>
        <CameraView
          ref={cameraRef}
          style={s.camera}
          facing="back"
          enableTorch={torchOn}
          onLayout={e => setCameraLayout(e.nativeEvent.layout)}
        >
          <View style={[s.cameraTopBar, { paddingTop: insets.top + 8 }]}>
            <TouchableOpacity style={s.camCloseBtn} onPress={() => router.back()}>
              <Text style={s.camCloseBtnText}>✕</Text>
            </TouchableOpacity>
            <Text style={s.camTitle}>{t('scan.title')}</Text>
            <TouchableOpacity style={[s.torchBtn, torchOn && s.torchBtnOn]} onPress={() => setTorchOn(v => !v)}>
              <Text style={s.torchIcon}>🔦</Text>
            </TouchableOpacity>
          </View>
          <View style={s.cameraFrameArea}>
            <View style={s.frame} />
          </View>
        </CameraView>
        <View style={[s.cameraControls, { paddingBottom: insets.bottom + 12 }]}>
          <TouchableOpacity style={s.secondaryBtn} onPress={handlePickImage}>
            <Text style={s.secondaryBtnText}>🖼️</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.captureBtn} onPress={handleCapture}>
            <Text style={s.captureBtnText}>{t('scan.capture')}</Text>
          </TouchableOpacity>
          <View style={{ width: 48 }} />
        </View>
      </View>
    );
  }

  // ── Processing mode ─────────────────────────────────────────────────────────

  if (mode === 'processing') {
    return (
      <View style={[s.fill, s.center, { backgroundColor: C.cream, paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={C.rust} />
        <Text style={[s.processingText, { color: C.darkSlate }]}>{t('scan.processingOcr')}</Text>
      </View>
    );
  }

  // ── Review mode (Step 1) ────────────────────────────────────────────────────

  if (mode === 'review') {
    const allChecked = items.length > 0 && items.every(it => it.checked);

    return (
      <KeyboardAvoidingView style={[s.fill, { backgroundColor: C.cream }]} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        {/* Header */}
        <View style={[s.header, { paddingTop: insets.top + 8, borderBottomColor: C.lightBorder, backgroundColor: C.white }]}>
          <TouchableOpacity style={s.headerBack} onPress={() => setMode('camera')}>
            <Text style={[s.headerBackText, { color: C.rust }]}>↩</Text>
          </TouchableOpacity>
          <Text style={[s.headerTitle, { color: C.darkSlate }]}>{t('scan.reviewReceipt')}</Text>
          {participants.length > 0
            ? <Text style={[s.headerStep, { color: C.sage }]}>{t('scan.step', { n: 1, total: 2 })}</Text>
            : <View style={{ width: 56 }} />
          }
        </View>

        {/* Receipt image */}
        {capturedUri && (
          <TouchableOpacity activeOpacity={0.9} onPress={() => setShowImageModal(true)}>
            <View style={s.imageContainer}>
              <Image source={{ uri: capturedUri }} style={s.receiptImage} resizeMode="contain" />
              <View style={s.zoomHint}>
                <Text style={s.zoomHintText}>{t('scan.tapToZoom')}</Text>
              </View>
            </View>
          </TouchableOpacity>
        )}

        {/* Select-all row */}
        <TouchableOpacity style={[s.selectAllRow, { backgroundColor: C.white, borderBottomColor: C.lightBorder }]} onPress={toggleAll} activeOpacity={0.7}>
          <View style={[s.checkbox, { borderColor: allChecked ? C.rust : C.lightBorder, backgroundColor: allChecked ? C.rust : C.white }]}>
            {allChecked && <Text style={s.checkmark}>✓</Text>}
          </View>
          <Text style={[s.selectAllText, { color: C.sage }]}>
            {t('scan.itemsSelected', { n: checkedItems.length })}
          </Text>
          <Text style={[s.totalBadge, { color: C.rust }]}>
            {checkedTotal.toFixed(2)} {currency}
          </Text>
        </TouchableOpacity>

        {/* Items list */}
        <FlatList
          data={items}
          keyExtractor={it => it.id}
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: 8 }}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            <View style={s.emptyBox}>
              <Text style={[s.emptyText, { color: C.sage }]}>{t('scan.noItems')}</Text>
            </View>
          }
          renderItem={({ item }) => (
            <ReviewItemRow
              item={item}
              C={C}
              currency={currency}
              onToggle={() => toggleItem(item.id)}
              onLabelChange={v => updateItemLabel(item.id, v)}
              onAmountChange={v => updateItemAmount(item.id, v)}
              onQtyChange={delta => changeQty(item.id, delta)}
              onRemove={() => removeItem(item.id)}
            />
          )}
          ListFooterComponent={
            <TouchableOpacity style={[s.addItemRow, { borderTopColor: C.lightBorder }]} onPress={addItem} activeOpacity={0.7}>
              <Text style={[s.addItemText, { color: C.rust }]}>+ {t('scan.addItem')}</Text>
            </TouchableOpacity>
          }
        />

        {/* Footer */}
        <View style={[s.footer, { borderTopColor: C.lightBorder, backgroundColor: C.white, paddingBottom: insets.bottom + 8 }]}>
          <TouchableOpacity
            style={[s.rustBtn, checkedItems.length === 0 && s.btnDisabled]}
            onPress={() => participants.length > 0 ? setMode('assign') : confirmResult()}
            disabled={checkedItems.length === 0}
          >
            <Text style={s.rustBtnText}>
              {participants.length > 0 ? t('scan.nextAssign') : t('scan.useItems')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Full-screen image modal */}
        <Modal visible={showImageModal} transparent animationType="fade" onRequestClose={() => setShowImageModal(false)}>
          <TouchableOpacity style={s.imageModal} activeOpacity={1} onPress={() => setShowImageModal(false)}>
            <Image source={{ uri: capturedUri! }} style={s.imageModalImg} resizeMode="contain" />
          </TouchableOpacity>
        </Modal>
      </KeyboardAvoidingView>
    );
  }

  // ── Assign mode (Step 2) ────────────────────────────────────────────────────

  return (
    <View style={[s.fill, { backgroundColor: C.cream }]}>
      {/* Header */}
      <View style={[s.header, { paddingTop: insets.top + 8, borderBottomColor: C.lightBorder, backgroundColor: C.white }]}>
        <TouchableOpacity style={s.headerBack} onPress={() => setMode('review')}>
          <Text style={[s.headerBackText, { color: C.rust }]}>↩</Text>
        </TouchableOpacity>
        <Text style={[s.headerTitle, { color: C.darkSlate }]}>{t('scan.assignItems')}</Text>
        <Text style={[s.headerStep, { color: C.sage }]}>{t('scan.step', { n: 2, total: 2 })}</Text>
      </View>

      {/* Items with assignee chips */}
      <FlatList
        data={checkedItems}
        keyExtractor={it => it.id}
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: Spacing.md, gap: Spacing.sm }}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => (
          <AssignItemCard
            item={item}
            participants={participants}
            currency={currency}
            C={C}
            onToggleAssignee={pid => toggleAssignee(item.id, pid)}
          />
        )}
      />

      {/* Per-person totals */}
      <View style={[s.perPersonBar, { borderTopColor: C.lightBorder, backgroundColor: C.white }]}>
        <Text style={[s.perPersonLabel, { color: C.sage }]}>{t('scan.perPerson')}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.perPersonScroll}>
          {participants.map(p => {
            const amt = perPersonTotals[p.id] ?? 0;
            return (
              <View key={p.id} style={[s.perPersonChip, { backgroundColor: p.color }]}>
                <Text style={s.perPersonChipText}>{p.name.split(' ')[0]}  {amt.toFixed(2)}</Text>
              </View>
            );
          })}
        </ScrollView>
      </View>

      {/* Footer */}
      <View style={[s.footer, { borderTopColor: C.lightBorder, backgroundColor: C.white, paddingBottom: insets.bottom + 8 }]}>
        <TouchableOpacity style={s.rustBtn} onPress={confirmResult}>
          <Text style={s.rustBtnText}>{t('scan.saveItems')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Review item row ──────────────────────────────────────────────────────────

interface ReviewItemRowProps {
  item: LocalItem;
  C: ReturnType<typeof useColors>;
  currency: string;
  onToggle: () => void;
  onLabelChange: (v: string) => void;
  onAmountChange: (v: string) => void;
  onQtyChange: (delta: number) => void;
  onRemove: () => void;
}

function ReviewItemRow({ item, C, currency, onToggle, onLabelChange, onAmountChange, onQtyChange, onRemove }: ReviewItemRowProps) {
  const rowBg = item.checked ? C.white : C.cream;
  const textColor = item.checked ? C.darkSlate : C.sage;

  return (
    <TouchableOpacity
      style={[s.itemRow, { backgroundColor: rowBg, borderBottomColor: C.lightBorder, opacity: item.checked ? 1 : 0.55 }]}
      onPress={onToggle}
      onLongPress={onRemove}
      activeOpacity={0.75}
      delayLongPress={500}
    >
      {/* Checkbox */}
      <View style={[s.checkbox, { borderColor: item.checked ? C.rust : C.lightBorder, backgroundColor: item.checked ? C.rust : C.white }]}>
        {item.checked && <Text style={s.checkmark}>✓</Text>}
      </View>

      {/* Quantity stepper */}
      <View style={s.qtyStepper}>
        <TouchableOpacity style={[s.qtyBtn, { borderColor: C.lightBorder }]} onPress={() => onQtyChange(-1)} hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}>
          <Text style={[s.qtyBtnText, { color: C.sage }]}>−</Text>
        </TouchableOpacity>
        <Text style={[s.qtyValue, { color: textColor }]}>{item.quantity}</Text>
        <TouchableOpacity style={[s.qtyBtn, { borderColor: C.lightBorder }]} onPress={() => onQtyChange(1)} hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}>
          <Text style={[s.qtyBtnText, { color: C.rust }]}>+</Text>
        </TouchableOpacity>
      </View>

      {/* Label input */}
      <TextInput
        style={[s.labelInput, { color: textColor }]}
        value={item.label}
        onChangeText={onLabelChange}
        placeholder={item.kind === 'header' ? item.kind : 'Item'}
        placeholderTextColor={C.sage}
        returnKeyType="done"
        onTouchStart={e => e.stopPropagation?.()}
      />

      {/* Amount input */}
      <TextInput
        style={[s.amountInput, { borderColor: C.lightBorder, color: item.checked ? C.rust : C.sage }]}
        value={item.amount > 0 ? String(item.amount) : ''}
        onChangeText={onAmountChange}
        placeholder="0"
        placeholderTextColor={C.sage}
        keyboardType="decimal-pad"
        returnKeyType="done"
        onTouchStart={e => e.stopPropagation?.()}
      />
    </TouchableOpacity>
  );
}

// ─── Assign item card ─────────────────────────────────────────────────────────

interface AssignItemCardProps {
  item: LocalItem;
  participants: Participant[];
  currency: string;
  C: ReturnType<typeof useColors>;
  onToggleAssignee: (pid: string) => void;
}

function AssignItemCard({ item, participants, currency, C, onToggleAssignee }: AssignItemCardProps) {
  return (
    <View style={[s.assignCard, { backgroundColor: C.white, borderColor: C.lightBorder }]}>
      <View style={s.assignCardHeader}>
        <Text style={[s.assignItemLabel, { color: C.darkSlate }]} numberOfLines={1}>
          {item.label || 'Item'}
          {item.quantity > 1 && <Text style={{ color: C.sage }}> ×{item.quantity}</Text>}
        </Text>
        <Text style={[s.assignItemAmount, { color: C.rust }]}>
          {item.amount.toFixed(2)} {currency}
        </Text>
      </View>
      <View style={s.chipsRow}>
        {participants.map(p => {
          const assigned = item.assignedTo.includes(p.id);
          return (
            <TouchableOpacity
              key={p.id}
              style={[
                s.assignChip,
                {
                  borderColor: assigned ? p.color : C.lightBorder,
                  backgroundColor: assigned ? p.color : C.cream,
                },
              ]}
              onPress={() => onToggleAssignee(p.id)}
              activeOpacity={0.7}
            >
              {!assigned && <View style={[s.assignChipDot, { backgroundColor: p.color }]} />}
              <Text style={[s.assignChipText, { color: assigned ? '#fff' : C.darkSlate }]}>
                {p.name.split(' ')[0]}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  fill: { flex: 1, backgroundColor: Colors.darkSlate },
  center: { alignItems: 'center', justifyContent: 'center', padding: 24 },

  // Camera
  camera: { flex: 1 },
  cameraTopBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 8,
    backgroundColor: 'transparent',
  },
  camCloseBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  camCloseBtnText: { fontSize: 18, color: '#fff', fontFamily: Typography.mono, fontWeight: '600' },
  camTitle: { fontFamily: Typography.mono, fontSize: 14, color: '#fff', fontWeight: '700' },
  torchBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center' },
  torchBtnOn: { backgroundColor: Colors.gold },
  torchIcon: { fontSize: 18 },
  cameraFrameArea: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  frame: { width: FRAME_W, height: FRAME_H, borderWidth: 2, borderColor: Colors.gold, borderRadius: Radius.md, backgroundColor: 'transparent' },
  cameraControls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', padding: 20, backgroundColor: Colors.darkSlate },
  captureBtn: { width: 72, height: 72, borderRadius: 36, backgroundColor: Colors.rust, alignItems: 'center', justifyContent: 'center', elevation: 4 },
  captureBtnText: { fontFamily: Typography.serif, fontSize: 11, color: Colors.white, fontWeight: '600', textAlign: 'center' },
  secondaryBtn: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  secondaryBtnText: { fontSize: 20 },

  // Processing
  processingText: { fontFamily: Typography.mono, fontSize: 14, marginTop: 16 },

  // Header
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingBottom: 12, borderBottomWidth: 1 },
  headerBack: { width: 44, alignItems: 'flex-start' },
  headerBackText: { fontSize: 22, fontFamily: Typography.mono },
  headerTitle: { fontFamily: Typography.serif, fontSize: 17, fontWeight: '700', flex: 1, textAlign: 'center' },
  headerStep: { width: 56, textAlign: 'right', fontFamily: Typography.mono, fontSize: 11 },

  // Receipt image
  imageContainer: { height: 200, backgroundColor: '#000', overflow: 'hidden' },
  receiptImage: { width: '100%', height: '100%' },
  zoomHint: { position: 'absolute', bottom: 6, right: 8, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  zoomHintText: { fontFamily: Typography.mono, fontSize: 10, color: 'rgba(255,255,255,0.8)' },

  // Select all row
  selectAllRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, gap: 10 },
  selectAllText: { flex: 1, fontFamily: Typography.mono, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 },
  totalBadge: { fontFamily: Typography.mono, fontSize: 14, fontWeight: '700' },

  // Item row
  itemRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, gap: 8 },
  checkbox: { width: 22, height: 22, borderWidth: 1.5, borderRadius: 4, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  checkmark: { color: '#fff', fontSize: 13, fontWeight: '700', lineHeight: 15 },

  // Quantity stepper
  qtyStepper: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  qtyBtn: { width: 22, height: 22, borderWidth: 1, borderRadius: 4, alignItems: 'center', justifyContent: 'center' },
  qtyBtnText: { fontSize: 14, fontFamily: Typography.mono, fontWeight: '700', lineHeight: 16 },
  qtyValue: { fontFamily: Typography.mono, fontSize: 13, fontWeight: '700', minWidth: 18, textAlign: 'center' },

  labelInput: { flex: 1, fontFamily: Typography.mono, fontSize: 13, paddingVertical: 2 },
  amountInput: { width: 72, fontFamily: Typography.mono, fontSize: 13, fontWeight: '700', borderWidth: 1, borderRadius: Radius.sm, paddingHorizontal: 6, paddingVertical: 4, textAlign: 'right' },

  emptyBox: { padding: 32, alignItems: 'center' },
  emptyText: { fontFamily: Typography.mono, fontSize: 13 },

  addItemRow: { paddingVertical: 14, paddingHorizontal: 12, borderTopWidth: 1 },
  addItemText: { fontFamily: Typography.mono, fontSize: 13, fontWeight: '700' },

  // Assign card
  assignCard: { borderWidth: 1.5, borderRadius: Radius.md, padding: Spacing.md },
  assignCardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  assignItemLabel: { fontFamily: Typography.serif, fontSize: 15, fontWeight: '600', flex: 1, marginRight: 8 },
  assignItemAmount: { fontFamily: Typography.mono, fontSize: 15, fontWeight: '700' },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  assignChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 7, borderWidth: 1.5, borderRadius: Radius.md, gap: 6 },
  assignChipDot: { width: 8, height: 8, borderRadius: 4 },
  assignChipText: { fontFamily: Typography.mono, fontSize: 13, fontWeight: '600' },

  // Per-person bar
  perPersonBar: { borderTopWidth: 1, paddingTop: 10, paddingBottom: 6, paddingHorizontal: Spacing.lg },
  perPersonLabel: { fontFamily: Typography.mono, fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  perPersonScroll: { gap: 8, paddingBottom: 4 },
  perPersonChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: Radius.md },
  perPersonChipText: { fontFamily: Typography.mono, fontSize: 13, fontWeight: '700', color: '#fff' },

  // Footer
  footer: { borderTopWidth: 1, padding: Spacing.lg },

  // Shared buttons
  rustBtn: { backgroundColor: Colors.rust, borderRadius: Radius.md, paddingVertical: 14, alignItems: 'center' },
  rustBtnText: { fontFamily: Typography.mono, fontSize: 15, fontWeight: '700', color: '#fff' },
  btnDisabled: { opacity: 0.4 },

  // Unavailable
  unavailText: { fontFamily: Typography.serif, fontSize: 15, color: Colors.white, textAlign: 'center', lineHeight: 22, paddingHorizontal: 24 },

  // Image modal
  imageModal: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', alignItems: 'center', justifyContent: 'center' },
  imageModalImg: { width: '100%', height: '100%' },
});
