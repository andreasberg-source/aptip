import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Colors, Typography, Radius } from '../constants/Theme';
import { useScanStore } from '../store/scanStore';
import { ParsedAmount, parseAmountsFromText } from '../utils/parseAmounts';

// Lazy-load ML Kit — not available in Expo Go
let TextRecognition: typeof import('@react-native-ml-kit/text-recognition').default | null = null;
try {
  TextRecognition = require('@react-native-ml-kit/text-recognition').default;
} catch {
  TextRecognition = null;
}

// Lazy-load image manipulator for frame cropping
let manipulateAsync: ((uri: string, actions: any[], options?: any) => Promise<{ uri: string }>) | null = null;
try {
  manipulateAsync = require('expo-image-manipulator').manipulateAsync;
} catch {
  manipulateAsync = null;
}

// ─── Frame dimensions (visual guide + crop region) ───────────────────────────
const FRAME_W = 300;
const FRAME_H = 400;

// ─── Component ────────────────────────────────────────────────────────────────
export default function ScanScreen() {
  const { t } = useTranslation();
  const { currency } = useLocalSearchParams<{ currency?: string }>();
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);

  const [isProcessing, setIsProcessing] = useState(false);
  const [amounts, setAmounts] = useState<ParsedAmount[]>([]);
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<'camera' | 'results'>('camera');
  const [torchOn, setTorchOn] = useState(false);
  const [cameraLayout, setCameraLayout] = useState({ width: 0, height: 0 });
  const [manualInput, setManualInput] = useState('');

  const processImageUri = useCallback(async (uri: string) => {
    setIsProcessing(true);
    setError(null);
    try {
      if (!TextRecognition) {
        throw new Error('OCR not available in Expo Go – use a development build');
      }
      const result = await TextRecognition.recognize(uri);
      const found = parseAmountsFromText(result.text);
      setAmounts(found);
      if (found.length === 0) {
        setError(t('scan.noAmount'));
      } else {
        // Pre-select detected total; fall back to first (largest) item
        const totalIdx = found.findIndex(a => a.isTotal);
        setSelectedItems(new Set([totalIdx >= 0 ? totalIdx : 0]));
      }
      // Always navigate to results so manual entry is accessible
      setTorchOn(false);
      setMode('results');
    } catch (e: any) {
      setError(e.message ?? t('scan.error'));
    } finally {
      setIsProcessing(false);
    }
  }, [t]);

  const handleCapture = useCallback(async () => {
    if (!cameraRef.current) return;
    const photo = await cameraRef.current.takePictureAsync({ quality: 0.9 });
    if (!photo?.uri) return;

    let uri = photo.uri;

    // Crop the image to the frame rectangle before running OCR
    if (manipulateAsync && cameraLayout.width > 0 && cameraLayout.height > 0) {
      const scaleX = photo.width / cameraLayout.width;
      const scaleY = photo.height / cameraLayout.height;
      const originX = Math.max(0, ((cameraLayout.width - FRAME_W) / 2) * scaleX);
      const originY = Math.max(0, ((cameraLayout.height - FRAME_H) / 2) * scaleY);
      const cropW = Math.min(FRAME_W * scaleX, photo.width - originX);
      const cropH = Math.min(FRAME_H * scaleY, photo.height - originY);
      try {
        const cropped = await manipulateAsync(
          photo.uri,
          [{ crop: { originX, originY, width: cropW, height: cropH } }],
          { compress: 0.9, format: 'jpeg' },
        );
        uri = cropped.uri;
      } catch {
        // Crop failed — fall back to full image
      }
    }

    await processImageUri(uri);
  }, [processImageUri, cameraLayout]);

  const handlePickImage = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ quality: 0.9 });
    if (!result.canceled && result.assets[0]?.uri) {
      await processImageUri(result.assets[0].uri);
    }
  }, [processImageUri]);

  const toggleItem = useCallback((idx: number) => {
    setSelectedItems(prev => {
      const next = new Set(prev);
      next.has(idx) ? next.delete(idx) : next.add(idx);
      return next;
    });
  }, []);

  const setPendingAmount = useScanStore(s => s.setPendingAmount);

  const handleUseAmount = useCallback((value: number) => {
    setPendingAmount(value.toFixed(2));
    router.back();
  }, [setPendingAmount]);

  const handleUseSelected = useCallback(() => {
    const sum = Array.from(selectedItems).reduce(
      (acc, idx) => acc + (amounts[idx]?.value ?? 0), 0,
    );
    handleUseAmount(sum);
  }, [selectedItems, amounts, handleUseAmount]);

  const handleUseManual = useCallback(() => {
    const val = parseFloat(manualInput.replace(',', '.'));
    if (!isNaN(val) && val > 0) handleUseAmount(val);
  }, [manualInput, handleUseAmount]);

  const handleRetake = useCallback(() => {
    setMode('camera');
    setAmounts([]);
    setError(null);
    setManualInput('');
    setSelectedItems(new Set());
  }, []);

  const selectedSum = Array.from(selectedItems).reduce(
    (acc, idx) => acc + (amounts[idx]?.value ?? 0), 0,
  );

  // ── Not available in Expo Go ──────────────────────────────────────────────
  if (!TextRecognition) {
    return (
      <View style={[styles.flex, styles.center]}>
        <Text style={styles.unavailableText}>{t('scan.unavailable')}</Text>
      </View>
    );
  }

  if (!permission) return <View style={styles.flex} />;

  // ── Camera permission gate ────────────────────────────────────────────────
  if (!permission.granted) {
    return (
      <View style={[styles.flex, styles.center]}>
        <Text style={styles.permText}>{t('scan.permission')}</Text>
        <TouchableOpacity style={styles.permBtn} onPress={requestPermission}>
          <Text style={styles.permBtnText}>{t('scan.permissionBtn')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Camera view ───────────────────────────────────────────────────────────
  if (mode === 'camera') {
    return (
      <View style={styles.flex}>
        <CameraView
          ref={cameraRef}
          style={styles.camera}
          facing="back"
          enableTorch={torchOn}
          onLayout={e => {
            const { width, height } = e.nativeEvent.layout;
            setCameraLayout({ width, height });
          }}
        >
          <View style={styles.overlay}>
            {/* Torch toggle */}
            <TouchableOpacity
              style={[styles.torchBtn, torchOn && styles.torchBtnOn]}
              onPress={() => setTorchOn(v => !v)}
            >
              <Text style={styles.torchIcon}>🔦</Text>
            </TouchableOpacity>

            {/* Scan frame */}
            <View style={styles.frame} />
          </View>
        </CameraView>

        <View style={styles.controls}>
          <TouchableOpacity style={styles.secondaryBtn} onPress={handlePickImage}>
            <Text style={styles.secondaryBtnText}>🖼️</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.captureBtn, isProcessing && styles.captureBtnDisabled]}
            onPress={handleCapture}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <ActivityIndicator color={Colors.white} />
            ) : (
              <Text style={styles.captureBtnText}>{t('scan.capture')}</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryBtn} onPress={() => router.back()}>
            <Text style={styles.secondaryBtnText}>✕</Text>
          </TouchableOpacity>
        </View>

        {error && <Text style={styles.errorText}>{error}</Text>}
      </View>
    );
  }

  // ── Results view ──────────────────────────────────────────────────────────
  return (
    <View style={styles.flex}>
      <ScrollView style={styles.flex} contentContainerStyle={styles.resultsContainer}>
        <Text style={styles.resultsTitle}>{t('scan.itemized')}</Text>
        {amounts.length > 0 && (
          <Text style={styles.resultsHint}>{t('scan.itemizedHint')}</Text>
        )}

        {error && amounts.length === 0 && (
          <Text style={styles.noAmountText}>{error}</Text>
        )}

        {amounts.map((item, idx) => (
          <TouchableOpacity
            key={idx}
            style={[
              styles.amountRow,
              selectedItems.has(idx) && styles.amountRowSelected,
              item.isTotal && styles.amountRowTotal,
            ]}
            onPress={() => toggleItem(idx)}
          >
            <Text style={styles.amountCheck}>{selectedItems.has(idx) ? '☑' : '☐'}</Text>
            <View style={styles.amountInfo}>
              {!!item.label && (
                <Text style={styles.amountLabel} numberOfLines={1}>{item.label}</Text>
              )}
              <Text style={styles.amountText}>
                {item.value.toFixed(2)} {currency}
              </Text>
            </View>
            {item.isTotal && (
              <View style={styles.totalBadge}>
                <Text style={styles.totalBadgeText}>TOTAL</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}

        {amounts.length > 0 && (
          <TouchableOpacity
            style={[styles.useBtn, selectedItems.size === 0 && styles.useBtnDisabled]}
            onPress={handleUseSelected}
            disabled={selectedItems.size === 0}
          >
            <Text style={styles.useBtnText}>
              {t('scan.useSelected', {
                sum: `${selectedSum.toFixed(2)} ${currency ?? ''}`,
              })}
            </Text>
          </TouchableOpacity>
        )}

        {/* Manual entry fallback */}
        <View style={styles.manualSection}>
          <Text style={styles.manualLabel}>{t('scan.manualEntry')}</Text>
          <View style={styles.manualRow}>
            <TextInput
              style={styles.manualInput}
              value={manualInput}
              onChangeText={setManualInput}
              placeholder={t('scan.manualPlaceholder')}
              placeholderTextColor={Colors.sage}
              keyboardType="decimal-pad"
              returnKeyType="done"
            />
            <TouchableOpacity
              style={[styles.manualUseBtn, !manualInput && styles.useBtnDisabled]}
              onPress={handleUseManual}
              disabled={!manualInput}
            >
              <Text style={styles.manualUseBtnText}>{t('scan.manualUse')}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity style={styles.retakeBtn} onPress={handleRetake}>
          <Text style={styles.retakeBtnText}>{t('scan.retake')}</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.darkSlate },
  center: { alignItems: 'center', justifyContent: 'center', padding: 24 },

  // Camera
  camera: { flex: 1 },
  overlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  frame: {
    width: FRAME_W,
    height: FRAME_H,
    borderWidth: 2,
    borderColor: Colors.gold,
    borderRadius: Radius.md,
    backgroundColor: 'transparent',
  },
  torchBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  torchBtnOn: {
    backgroundColor: Colors.gold,
  },
  torchIcon: { fontSize: 20 },

  // Controls bar
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    padding: 20,
    backgroundColor: Colors.darkSlate,
  },
  captureBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.rust,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.rust,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  captureBtnDisabled: { opacity: 0.5 },
  captureBtnText: {
    fontFamily: Typography.serif,
    fontSize: 12,
    color: Colors.white,
    fontWeight: '600',
  },
  secondaryBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtnText: { fontSize: 20 },

  // Error / info text
  errorText: {
    fontFamily: Typography.mono,
    fontSize: 12,
    color: Colors.rust,
    textAlign: 'center',
    padding: 12,
    backgroundColor: Colors.darkSlate,
  },
  noAmountText: {
    fontFamily: Typography.mono,
    fontSize: 14,
    color: Colors.sage,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  unavailableText: {
    fontFamily: Typography.serif,
    fontSize: 16,
    color: Colors.white,
    textAlign: 'center',
    lineHeight: 24,
  },
  permText: {
    fontFamily: Typography.serif,
    fontSize: 16,
    color: Colors.white,
    textAlign: 'center',
    marginBottom: 16,
  },
  permBtn: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: Colors.rust,
    borderRadius: Radius.sm,
  },
  permBtnText: { fontFamily: Typography.mono, fontSize: 14, color: Colors.white },

  // Results list
  resultsContainer: { padding: 20, paddingBottom: 40 },
  resultsTitle: {
    fontFamily: Typography.serif,
    fontSize: 18,
    fontWeight: '700',
    color: Colors.white,
    marginBottom: 4,
  },
  resultsHint: {
    fontFamily: Typography.mono,
    fontSize: 12,
    color: Colors.sage,
    marginBottom: 16,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: Radius.sm,
    marginBottom: 8,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  amountRowSelected: {
    borderColor: Colors.gold,
    backgroundColor: 'rgba(212, 165, 116, 0.15)',
  },
  amountRowTotal: {
    borderColor: Colors.sage,
    backgroundColor: 'rgba(134, 163, 151, 0.1)',
  },
  amountCheck: { fontSize: 20, color: Colors.gold },
  amountInfo: { flex: 1 },
  amountLabel: {
    fontFamily: Typography.mono,
    fontSize: 11,
    color: Colors.sage,
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  amountText: {
    fontFamily: Typography.mono,
    fontSize: 18,
    color: Colors.white,
  },
  totalBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: Colors.sage,
    borderRadius: 4,
  },
  totalBadgeText: {
    fontFamily: Typography.mono,
    fontSize: 10,
    color: Colors.darkSlate,
    fontWeight: '700',
    letterSpacing: 0.5,
  },

  // Use selected button
  useBtn: {
    marginTop: 16,
    paddingVertical: 14,
    backgroundColor: Colors.rust,
    borderRadius: Radius.sm,
    alignItems: 'center',
  },
  useBtnDisabled: { opacity: 0.4 },
  useBtnText: {
    fontFamily: Typography.mono,
    fontSize: 14,
    color: Colors.white,
    fontWeight: '500',
  },

  // Manual entry
  manualSection: {
    marginTop: 24,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  manualLabel: {
    fontFamily: Typography.mono,
    fontSize: 12,
    color: Colors.sage,
    marginBottom: 10,
  },
  manualRow: {
    flexDirection: 'row',
    gap: 10,
  },
  manualInput: {
    flex: 1,
    height: 46,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    borderRadius: Radius.sm,
    paddingHorizontal: 14,
    fontFamily: Typography.mono,
    fontSize: 18,
    color: Colors.white,
  },
  manualUseBtn: {
    height: 46,
    paddingHorizontal: 18,
    backgroundColor: Colors.rust,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  manualUseBtnText: {
    fontFamily: Typography.mono,
    fontSize: 14,
    color: Colors.white,
    fontWeight: '500',
  },

  // Retake button
  retakeBtn: {
    marginTop: 12,
    paddingVertical: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: Radius.sm,
    alignItems: 'center',
  },
  retakeBtnText: {
    fontFamily: Typography.mono,
    fontSize: 13,
    color: Colors.sage,
  },
});
