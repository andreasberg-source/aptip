import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  TextInput,
  Image,
  ScrollView,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Colors, Typography, Radius } from '../constants/Theme';
import { useScanStore } from '../store/scanStore';
import { AmountLine, extractAmountLines, parseAmountsFromText } from '../utils/parseAmounts';

// Lazy-load ML Kit — not available in Expo Go
let TextRecognition: typeof import('@react-native-ml-kit/text-recognition').default | null = null;
try {
  TextRecognition = require('@react-native-ml-kit/text-recognition').default;
} catch {
  TextRecognition = null;
}

// Lazy-load image manipulator
let manipulateAsync: ((uri: string, actions: any[], options?: any) => Promise<{ uri: string; width: number; height: number }>) | null = null;
try {
  manipulateAsync = require('expo-image-manipulator').manipulateAsync;
} catch {
  manipulateAsync = null;
}

const FRAME_W = 300;
const FRAME_H = 400;

// ─── Coordinate helpers ───────────────────────────────────────────────────────

function getContainLayout(
  cropW: number, cropH: number,
  containerW: number, containerH: number,
) {
  const imgAspect = cropW / cropH;
  const boxAspect = containerW / containerH;
  const displayW = imgAspect > boxAspect ? containerW : containerH * imgAspect;
  const displayH = imgAspect > boxAspect ? containerW / imgAspect : containerH;
  return {
    displayW,
    displayH,
    offsetX: (containerW - displayW) / 2,
    offsetY: (containerH - displayH) / 2,
  };
}

function frameToScreen(
  frame: { left: number; top: number; width: number; height: number },
  cropW: number, cropH: number,
  layout: { displayW: number; displayH: number; offsetX: number; offsetY: number },
) {
  const sx = layout.displayW / cropW;
  const sy = layout.displayH / cropH;
  return {
    left:   layout.offsetX + frame.left   * sx,
    top:    layout.offsetY + frame.top    * sy,
    width:  frame.width  * sx,
    height: frame.height * sy,
  };
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ScanScreen() {
  const { t } = useTranslation();
  const { currency, country } = useLocalSearchParams<{ currency?: string; country?: string }>();
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);

  const [isProcessing, setIsProcessing] = useState(false);
  const [mode, setMode] = useState<'camera' | 'results'>('camera');
  const [torchOn, setTorchOn] = useState(false);
  const [cameraLayout, setCameraLayout] = useState({ width: 0, height: 0 });
  const [manualInput, setManualInput] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Results state
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [cropDims, setCropDims] = useState<{ w: number; h: number } | null>(null);
  const [amountLines, setAmountLines] = useState<AmountLine[]>([]);
  const [fallbackAmounts, setFallbackAmounts] = useState<Array<{ value: number; label: string; isTotal: boolean }>>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [containerLayout, setContainerLayout] = useState<{ width: number; height: number } | null>(null);

  const setPendingAmount = useScanStore(s => s.setPendingAmount);

  const handleUseAmount = useCallback((value: number) => {
    setPendingAmount(value.toFixed(2));
    router.back();
  }, [setPendingAmount]);

  const processImageUri = useCallback(async (uri: string, dims?: { w: number; h: number }) => {
    setIsProcessing(true);
    setError(null);
    setImageUri(uri);
    setCropDims(dims ?? null);
    try {
      if (!TextRecognition) throw new Error('OCR not available in Expo Go – use a development build');
      const result = await TextRecognition.recognize(uri);

      // If no dims provided (gallery path), get them via no-op manipulate
      let finalDims = dims;
      if (!finalDims && manipulateAsync) {
        try {
          const info = await manipulateAsync(uri, []);
          finalDims = { w: info.width, h: info.height };
          setCropDims(finalDims);
        } catch { /* leave null — will use fallback list */ }
      }

      const lines = extractAmountLines(result.blocks, country ?? undefined);
      setAmountLines(lines);

      // Fallback list for when frame data is missing
      if (lines.length === 0) {
        const parsed = parseAmountsFromText(result.text);
        setFallbackAmounts(parsed);
        if (parsed.length === 0) setError(t('scan.noAmount'));
      } else {
        setFallbackAmounts([]);
        // Pre-select: first total, else first subtotal, else first item
        const preselect = lines.find(l => l.kind === 'total')
          ?? lines.find(l => l.kind === 'subtotal')
          ?? lines[0];
        setSelectedId(preselect?.id ?? null);
      }
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
    let dims: { w: number; h: number } | undefined;

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
        dims = { w: Math.round(cropW), h: Math.round(cropH) };
      } catch { /* use full image */ }
    }

    await processImageUri(uri, dims);
  }, [processImageUri, cameraLayout]);

  const handlePickImage = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ quality: 0.9 });
    if (!result.canceled && result.assets[0]?.uri) {
      await processImageUri(result.assets[0].uri);
    }
  }, [processImageUri]);

  const handleRetake = useCallback(() => {
    setMode('camera');
    setAmountLines([]);
    setFallbackAmounts([]);
    setSelectedId(null);
    setContainerLayout(null);
    setCropDims(null);
    setImageUri(null);
    setError(null);
    setManualInput('');
  }, []);

  const handleUseManual = useCallback(() => {
    const val = parseFloat(manualInput.replace(',', '.'));
    if (!isNaN(val) && val > 0) handleUseAmount(val);
  }, [manualInput, handleUseAmount]);

  const selectedLine = amountLines.find(l => l.id === selectedId) ?? null;

  // ── Not available in Expo Go ──────────────────────────────────────────────
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

  // ── Camera view ───────────────────────────────────────────────────────────
  if (mode === 'camera') {
    return (
      <View style={styles.flex}>
        <CameraView
          ref={cameraRef}
          style={styles.camera}
          facing="back"
          enableTorch={torchOn}
          onLayout={e => setCameraLayout(e.nativeEvent.layout)}
        >
          <View style={styles.overlay}>
            <TouchableOpacity
              style={[styles.torchBtn, torchOn && styles.torchBtnOn]}
              onPress={() => setTorchOn(v => !v)}
            >
              <Text style={styles.torchIcon}>🔦</Text>
            </TouchableOpacity>
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
            {isProcessing
              ? <ActivityIndicator color={Colors.white} />
              : <Text style={styles.captureBtnText}>{t('scan.capture')}</Text>}
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryBtn} onPress={() => router.back()}>
            <Text style={styles.secondaryBtnText}>✕</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── Results view ──────────────────────────────────────────────────────────
  return (
    <View style={styles.flex}>
      {/* Header */}
      <View style={styles.resultsHeader}>
        <TouchableOpacity style={styles.retakeHeaderBtn} onPress={handleRetake}>
          <Text style={styles.retakeHeaderBtnText}>↩ {t('scan.retake')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.useHeaderBtn, !selectedLine && styles.useHeaderBtnDisabled]}
          onPress={() => selectedLine && handleUseAmount(selectedLine.amount)}
          disabled={!selectedLine}
        >
          <Text style={styles.useHeaderBtnText}>
            {selectedLine
              ? `${t('scan.use')} ${selectedLine.amount.toFixed(2)} ${currency ?? ''}`
              : t('scan.use')}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Image with overlaid tappable amount boxes */}
      {imageUri && amountLines.length > 0 ? (
        <View
          style={styles.imageContainer}
          onLayout={e => setContainerLayout(e.nativeEvent.layout)}
        >
          <Image
            source={{ uri: imageUri }}
            style={StyleSheet.absoluteFill}
            resizeMode="contain"
          />
          {containerLayout && cropDims && amountLines.map(line => {
            const layout = getContainLayout(cropDims.w, cropDims.h, containerLayout.width, containerLayout.height);
            const screen = frameToScreen(line.frame, cropDims.w, cropDims.h, layout);
            const isSelected = line.id === selectedId;
            const borderColor = isSelected ? Colors.rust
              : line.kind === 'total' ? Colors.gold
              : line.kind === 'subtotal' ? Colors.sage
              : 'rgba(255,255,255,0.35)';
            return (
              <TouchableOpacity
                key={line.id}
                style={[
                  styles.amountOverlay,
                  {
                    left: screen.left,
                    top: screen.top,
                    width: Math.max(screen.width, 60),
                    height: Math.max(screen.height, 26),
                    borderColor,
                    backgroundColor: isSelected
                      ? 'rgba(176,70,50,0.45)'
                      : 'rgba(0,0,0,0.30)',
                    borderWidth: isSelected ? 2 : 1,
                  },
                ]}
                onPress={() => setSelectedId(line.id)}
                activeOpacity={0.7}
              >
                <Text style={styles.amountOverlayText} numberOfLines={1}>
                  {line.amount.toFixed(2)}
                </Text>
              </TouchableOpacity>
            );
          })}
          {/* Legend */}
          <View style={styles.legend}>
            <View style={[styles.legendDot, { backgroundColor: Colors.gold }]} />
            <Text style={styles.legendText}>Total</Text>
            <View style={[styles.legendDot, { backgroundColor: Colors.sage, marginLeft: 10 }]} />
            <Text style={styles.legendText}>Subtotal</Text>
          </View>
        </View>
      ) : imageUri && fallbackAmounts.length > 0 ? (
        /* Fallback: no frame data — show image + scrollable amount list */
        <ScrollView style={styles.flex} contentContainerStyle={styles.fallbackContent}>
          <Image source={{ uri: imageUri }} style={styles.fallbackImage} resizeMode="contain" />
          <Text style={styles.fallbackHint}>{t('scan.selectTotal')}</Text>
          {fallbackAmounts.map((item, idx) => (
            <TouchableOpacity
              key={idx}
              style={[styles.fallbackRow, item.isTotal && styles.fallbackRowTotal]}
              onPress={() => handleUseAmount(item.value)}
              activeOpacity={0.75}
            >
              <View style={styles.fallbackRowInfo}>
                {!!item.label && <Text style={styles.fallbackRowLabel} numberOfLines={1}>{item.label}</Text>}
                <Text style={styles.fallbackRowAmount}>{item.value.toFixed(2)} {currency}</Text>
              </View>
              {item.isTotal && (
                <View style={styles.totalBadge}><Text style={styles.totalBadgeText}>TOTAL</Text></View>
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      ) : (
        /* No image / nothing detected */
        <View style={styles.noResultsArea}>
          {error && <Text style={styles.noAmountText}>{error}</Text>}
        </View>
      )}

      {/* Manual entry footer */}
      <View style={styles.manualFooter}>
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
            style={[styles.manualUseBtn, !manualInput && styles.disabledBtn]}
            onPress={handleUseManual}
            disabled={!manualInput}
          >
            <Text style={styles.manualUseBtnText}>{t('scan.manualUse')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.darkSlate },
  center: { alignItems: 'center', justifyContent: 'center', padding: 24 },

  // Camera
  camera: { flex: 1 },
  overlay: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  frame: {
    width: FRAME_W, height: FRAME_H,
    borderWidth: 2, borderColor: Colors.gold,
    borderRadius: Radius.md, backgroundColor: 'transparent',
  },
  torchBtn: {
    position: 'absolute', top: 16, right: 16,
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center', justifyContent: 'center',
  },
  torchBtnOn: { backgroundColor: Colors.gold },
  torchIcon: { fontSize: 20 },
  controls: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-around', padding: 20,
    backgroundColor: Colors.darkSlate,
  },
  captureBtn: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: Colors.rust,
    alignItems: 'center', justifyContent: 'center',
    elevation: 6,
  },
  captureBtnDisabled: { opacity: 0.5 },
  captureBtnText: { fontFamily: Typography.serif, fontSize: 12, color: Colors.white, fontWeight: '600' },
  secondaryBtn: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  secondaryBtnText: { fontSize: 20 },

  // Results header
  resultsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  retakeHeaderBtn: { paddingVertical: 6, paddingHorizontal: 10 },
  retakeHeaderBtnText: { fontFamily: Typography.mono, fontSize: 13, color: Colors.sage },
  useHeaderBtn: {
    paddingVertical: 9, paddingHorizontal: 16,
    backgroundColor: Colors.rust, borderRadius: Radius.sm,
  },
  useHeaderBtnDisabled: { backgroundColor: 'rgba(176,70,50,0.3)' },
  useHeaderBtnText: { fontFamily: Typography.mono, fontSize: 13, fontWeight: '700', color: Colors.white },

  // Image container with overlays
  imageContainer: {
    flex: 1,
    backgroundColor: '#000',
    overflow: 'hidden',
  },

  // Amount overlay box
  amountOverlay: {
    position: 'absolute',
    borderRadius: 3,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  amountOverlayText: {
    fontFamily: Typography.mono,
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
    textShadowColor: 'rgba(0,0,0,0.9)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },

  // Legend
  legend: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 4,
  },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontFamily: Typography.mono, fontSize: 10, color: Colors.white },

  // Fallback list
  fallbackContent: { padding: 16, paddingBottom: 8 },
  fallbackImage: { width: '100%', height: 240, marginBottom: 16 },
  fallbackHint: {
    fontFamily: Typography.mono, fontSize: 12, color: Colors.sage,
    marginBottom: 12, textAlign: 'center',
  },
  fallbackRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 12, paddingHorizontal: 14,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: Radius.sm, marginBottom: 8,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  fallbackRowTotal: { borderColor: Colors.gold, backgroundColor: 'rgba(212,165,116,0.1)' },
  fallbackRowInfo: { flex: 1 },
  fallbackRowLabel: { fontFamily: Typography.mono, fontSize: 11, color: Colors.sage, marginBottom: 2 },
  fallbackRowAmount: { fontFamily: Typography.mono, fontSize: 18, color: Colors.white },
  totalBadge: { paddingHorizontal: 8, paddingVertical: 3, backgroundColor: Colors.sage, borderRadius: 4 },
  totalBadgeText: { fontFamily: Typography.mono, fontSize: 10, color: Colors.darkSlate, fontWeight: '700' },

  // No results
  noResultsArea: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  noAmountText: {
    fontFamily: Typography.mono, fontSize: 14, color: Colors.sage,
    textAlign: 'center', lineHeight: 20,
  },

  // Permission / unavailable
  unavailableText: { fontFamily: Typography.serif, fontSize: 16, color: Colors.white, textAlign: 'center', lineHeight: 24 },
  permText: { fontFamily: Typography.serif, fontSize: 16, color: Colors.white, textAlign: 'center', marginBottom: 16 },
  permBtn: { paddingVertical: 12, paddingHorizontal: 24, backgroundColor: Colors.rust, borderRadius: Radius.sm },
  permBtnText: { fontFamily: Typography.mono, fontSize: 14, color: Colors.white },

  // Manual entry footer
  manualFooter: {
    padding: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  manualLabel: { fontFamily: Typography.mono, fontSize: 11, color: Colors.sage, marginBottom: 8 },
  manualRow: { flexDirection: 'row', gap: 8 },
  manualInput: {
    flex: 1, height: 44,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
    borderRadius: Radius.sm,
    paddingHorizontal: 14,
    fontFamily: Typography.mono, fontSize: 18, color: Colors.white,
  },
  manualUseBtn: {
    height: 44, paddingHorizontal: 18,
    backgroundColor: Colors.rust, borderRadius: Radius.sm,
    alignItems: 'center', justifyContent: 'center',
  },
  manualUseBtnText: { fontFamily: Typography.mono, fontSize: 14, color: Colors.white, fontWeight: '500' },
  disabledBtn: { opacity: 0.35 },
});
