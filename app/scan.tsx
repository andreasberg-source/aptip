import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Colors, Typography, Radius } from '../constants/Theme';
import { useScanStore } from '../store/scanStore';

// Lazy-load ML Kit to avoid crashes on Expo Go (no native module)
let TextRecognition: typeof import('@react-native-ml-kit/text-recognition').default | null = null;
try {
  TextRecognition = require('@react-native-ml-kit/text-recognition').default;
} catch {
  TextRecognition = null;
}

/** Parse OCR text and return all detected currency-like values */
function parseAmounts(text: string): number[] {
  // Match patterns like: 1234.56  12,345.67  1 234,56  etc.
  const raw = text.replace(/\s/g, '');
  const matches = raw.match(/\d{1,6}[.,]\d{2}/g) ?? [];
  return matches
    .map((m) => {
      const normalised = m.replace(',', '.');
      return parseFloat(normalised);
    })
    .filter((n) => !isNaN(n) && n >= 1)
    .sort((a, b) => b - a); // largest first
}

export default function ScanScreen() {
  const { t } = useTranslation();
  const { currency } = useLocalSearchParams<{ currency?: string }>();
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);

  const [isProcessing, setIsProcessing] = useState(false);
  const [amounts, setAmounts] = useState<number[]>([]);
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<'camera' | 'results'>('camera');

  const processImageUri = useCallback(async (uri: string) => {
    setIsProcessing(true);
    setError(null);
    try {
      if (!TextRecognition) {
        throw new Error('OCR not available in Expo Go – use a development build');
      }
      const result = await TextRecognition.recognize(uri);
      const found = parseAmounts(result.text);
      if (found.length === 0) {
        setError(t('scan.noAmount'));
      } else {
        setAmounts(found);
        setSelectedItems(new Set([0])); // pre-select the largest
        setMode('results');
      }
    } catch (e: any) {
      setError(e.message ?? t('scan.error'));
    } finally {
      setIsProcessing(false);
    }
  }, [t]);

  const handleCapture = useCallback(async () => {
    if (!cameraRef.current) return;
    const photo = await cameraRef.current.takePictureAsync({ quality: 0.8 });
    if (photo?.uri) await processImageUri(photo.uri);
  }, [processImageUri]);

  const handlePickImage = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ quality: 0.8 });
    if (!result.canceled && result.assets[0]?.uri) {
      await processImageUri(result.assets[0].uri);
    }
  }, [processImageUri]);

  const toggleItem = useCallback((idx: number) => {
    setSelectedItems((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  }, []);

  const setPendingAmount = useScanStore((s) => s.setPendingAmount);

  const handleUseAmount = useCallback((value: number) => {
    setPendingAmount(value.toFixed(2));
    router.back();
  }, [setPendingAmount]);

  const handleUseSelected = useCallback(() => {
    const sum = Array.from(selectedItems).reduce((acc, idx) => acc + (amounts[idx] ?? 0), 0);
    handleUseAmount(sum);
  }, [selectedItems, amounts, handleUseAmount]);

  const selectedSum = Array.from(selectedItems).reduce(
    (acc, idx) => acc + (amounts[idx] ?? 0),
    0,
  );

  if (!TextRecognition) {
    return (
      <View style={[styles.flex, styles.center]}>
        <Text style={styles.unavailableText}>{t('scan.unavailable')}</Text>
      </View>
    );
  }

  if (!permission) return <View style={styles.flex} />;

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

  return (
    <View style={styles.flex}>
      {mode === 'camera' ? (
        <>
          <CameraView ref={cameraRef} style={styles.camera} facing="back">
            <View style={styles.overlay}>
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
        </>
      ) : (
        <ScrollView style={styles.flex} contentContainerStyle={styles.resultsContainer}>
          <Text style={styles.resultsTitle}>{t('scan.itemized')}</Text>
          <Text style={styles.resultsHint}>{t('scan.itemizedHint')}</Text>

          {amounts.map((amt, idx) => (
            <TouchableOpacity
              key={idx}
              style={[styles.amountRow, selectedItems.has(idx) && styles.amountRowSelected]}
              onPress={() => toggleItem(idx)}
            >
              <Text style={styles.amountCheck}>{selectedItems.has(idx) ? '☑' : '☐'}</Text>
              <Text style={styles.amountText}>
                {amt.toFixed(2)} {currency}
              </Text>
            </TouchableOpacity>
          ))}

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

          <TouchableOpacity style={styles.retakeBtn} onPress={() => setMode('camera')}>
            <Text style={styles.retakeBtnText}>{t('scan.retake')}</Text>
          </TouchableOpacity>
        </ScrollView>
      )}
    </View>
  );
}


const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.darkSlate },
  center: { alignItems: 'center', justifyContent: 'center', padding: 24 },
  camera: { flex: 1 },
  overlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  frame: {
    width: 280,
    height: 180,
    borderWidth: 2,
    borderColor: Colors.gold,
    borderRadius: Radius.md,
    backgroundColor: 'transparent',
  },
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
  captureBtnText: { fontFamily: Typography.serif, fontSize: 12, color: Colors.white, fontWeight: '600' },
  secondaryBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtnText: { fontSize: 20 },
  errorText: {
    fontFamily: Typography.mono,
    fontSize: 12,
    color: Colors.rust,
    textAlign: 'center',
    padding: 12,
    backgroundColor: Colors.darkSlate,
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
  amountCheck: { fontSize: 20, color: Colors.gold },
  amountText: { fontFamily: Typography.mono, fontSize: 18, color: Colors.white },
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
  retakeBtn: {
    marginTop: 10,
    paddingVertical: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: Radius.sm,
    alignItems: 'center',
  },
  retakeBtnText: { fontFamily: Typography.mono, fontSize: 13, color: Colors.sage },
});
