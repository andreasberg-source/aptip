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
import { ReceiptTotals, parseReceiptTotals, parseReceiptTotalsFromText } from '../utils/parseAmounts';

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
  const { currency, country } = useLocalSearchParams<{ currency?: string; country?: string }>();
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);

  const [isProcessing, setIsProcessing] = useState(false);
  const [totals, setTotals] = useState<ReceiptTotals | null>(null);
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
      const hasSpatial = result.blocks.length > 0 && result.blocks[0]?.lines?.[0]?.frame;
      const found: ReceiptTotals = hasSpatial
        ? parseReceiptTotals(result.blocks, country ?? undefined)
        : parseReceiptTotalsFromText(result.text, country ?? undefined);

      setTotals(found);
      if (!found.preTax && !found.postTax) {
        setError(t('scan.noAmount'));
      }
      setTorchOn(false);
      setMode('results');
    } catch (e: any) {
      setError(e.message ?? t('scan.error'));
      setMode('results');
    } finally {
      setIsProcessing(false);
    }
  }, [t, country]);

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

  const setPendingAmount = useScanStore(s => s.setPendingAmount);

  const handleUseAmount = useCallback((value: number) => {
    setPendingAmount(value.toFixed(2));
    router.back();
  }, [setPendingAmount]);

  const handleUseManual = useCallback(() => {
    const val = parseFloat(manualInput.replace(',', '.'));
    if (!isNaN(val) && val > 0) handleUseAmount(val);
  }, [manualInput, handleUseAmount]);

  const handleRetake = useCallback(() => {
    setMode('camera');
    setTotals(null);
    setError(null);
    setManualInput('');
  }, []);

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
  const hasResults = totals && (totals.preTax || totals.postTax);

  return (
    <View style={styles.flex}>
      <ScrollView style={styles.flex} contentContainerStyle={styles.resultsContainer}>
        <Text style={styles.resultsTitle}>{t('scan.title')}</Text>
        <Text style={styles.resultsHint}>{t('scan.selectTotal')}</Text>

        {error && !hasResults && (
          <Text style={styles.noAmountText}>{error}</Text>
        )}

        {/* Pre-tax card */}
        {totals?.preTax && (
          <TouchableOpacity
            style={styles.totalCard}
            onPress={() => handleUseAmount(totals.preTax!.value)}
            activeOpacity={0.75}
          >
            <View style={styles.totalCardLeft}>
              <Text style={styles.totalCardBadge}>{t('scan.preTax')}</Text>
              {!!totals.preTax.label && (
                <Text style={styles.totalCardLabel} numberOfLines={1}>{totals.preTax.label}</Text>
              )}
            </View>
            <View style={styles.totalCardRight}>
              <Text style={styles.totalCardAmount}>
                {totals.preTax.value.toFixed(2)}
              </Text>
              <Text style={styles.totalCardCurrency}>{currency}</Text>
            </View>
          </TouchableOpacity>
        )}

        {/* Post-tax card */}
        {totals?.postTax && (
          <TouchableOpacity
            style={[styles.totalCard, styles.totalCardHighlight]}
            onPress={() => handleUseAmount(totals.postTax!.value)}
            activeOpacity={0.75}
          >
            <View style={styles.totalCardLeft}>
              <Text style={[styles.totalCardBadge, styles.totalCardBadgeHighlight]}>
                {t('scan.postTax')}
              </Text>
              {!!totals.postTax.label && (
                <Text style={[styles.totalCardLabel, { color: Colors.white }]} numberOfLines={1}>
                  {totals.postTax.label}
                </Text>
              )}
              {totals.tax && (
                <Text style={styles.totalCardTaxLine}>
                  {t('scan.taxLine')}: {totals.tax.value.toFixed(2)} {currency}
                </Text>
              )}
            </View>
            <View style={styles.totalCardRight}>
              <Text style={[styles.totalCardAmount, { color: Colors.white }]}>
                {totals.postTax.value.toFixed(2)}
              </Text>
              <Text style={[styles.totalCardCurrency, { color: Colors.sage }]}>{currency}</Text>
            </View>
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

  // Results
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
    marginBottom: 20,
  },

  // Total cards
  totalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    borderRadius: Radius.md,
    paddingVertical: 16,
    paddingHorizontal: 18,
    marginBottom: 12,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  totalCardHighlight: {
    borderColor: Colors.rust,
    backgroundColor: 'rgba(176, 70, 50, 0.18)',
  },
  totalCardLeft: { flex: 1, gap: 4 },
  totalCardBadge: {
    fontFamily: Typography.mono,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: Colors.sage,
  },
  totalCardBadgeHighlight: { color: Colors.rust },
  totalCardLabel: {
    fontFamily: Typography.mono,
    fontSize: 12,
    color: Colors.sage,
  },
  totalCardTaxLine: {
    fontFamily: Typography.mono,
    fontSize: 11,
    color: Colors.sage,
    opacity: 0.7,
  },
  totalCardRight: { alignItems: 'flex-end', gap: 2 },
  totalCardAmount: {
    fontFamily: Typography.mono,
    fontSize: 26,
    fontWeight: '700',
    color: Colors.sage,
  },
  totalCardCurrency: {
    fontFamily: Typography.mono,
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
  },

  // Use selected button (kept for compat, unused in new flow)
  useBtnDisabled: { opacity: 0.4 },

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
