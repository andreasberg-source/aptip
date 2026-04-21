import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  Modal,
  TouchableOpacity,
  FlatList,
  TextInput,
  StyleSheet,
  LayoutChangeEvent,
} from 'react-native';
import { Colors, Typography, Radius } from '../constants/Theme';
import { ItemLine } from '../utils/parseAmounts';

// ─── Coordinate helpers (same math as scan.tsx — inlined to avoid importing a route file) ────

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
    width:  Math.max(frame.width  * sx, 60),
    height: Math.max(frame.height * sy, 26),
  };
}

// ─────────────────────────────────────────────────────────────────────────────

interface OcrItemReviewProps {
  visible: boolean;
  imageUri: string | null;
  imageDims: { w: number; h: number } | null;
  items: ItemLine[];
  onConfirm: (selected: ItemLine[]) => void;
  onCancel: () => void;
  currency?: string;
}

export default function OcrItemReview({
  visible,
  imageUri,
  imageDims,
  items,
  onConfirm,
  onCancel,
  currency,
}: OcrItemReviewProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [containerLayout, setContainerLayout] = useState<{ width: number; height: number } | null>(null);
  const [fallbackEdits, setFallbackEdits] = useState<Record<string, { label: string; amount: string }>>({});

  // Pre-select all item-kind lines when the modal opens
  useEffect(() => {
    if (visible && items.length > 0) {
      setSelectedIds(new Set(items.filter(l => l.kind === 'item').map(l => l.id)));
      setFallbackEdits({});
    }
  }, [visible, items]);

  const selectedCount = items.filter(l => l.kind === 'item' && selectedIds.has(l.id)).length;

  const handleToggle = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleConfirm = () => {
    if (imageDims) {
      onConfirm(items.filter(l => l.kind === 'item' && selectedIds.has(l.id)));
    } else {
      // Checklist fallback — use edited values
      const selected: ItemLine[] = items
        .filter(l => l.kind === 'item' && selectedIds.has(l.id))
        .map(l => {
          const edit = fallbackEdits[l.id];
          return {
            ...l,
            label: edit?.label ?? l.label,
            amount: parseFloat((edit?.amount ?? String(l.amount)).replace(',', '.')) || l.amount,
          };
        });
      onConfirm(selected);
    }
  };

  const handleContainerLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setContainerLayout({ width, height });
  };

  // ── Overlay mode (spatial frame data available) ───────────────────────────

  if (imageDims) {
    const layout = containerLayout
      ? getContainLayout(imageDims.w, imageDims.h, containerLayout.width, containerLayout.height)
      : null;

    return (
      <Modal visible={visible} animationType="slide" onRequestClose={onCancel}>
        <View style={styles.overlayRoot}>
          {/* Header */}
          <View style={styles.overlayHeader}>
            <Text style={styles.overlayHeaderCount}>
              {selectedCount} item{selectedCount !== 1 ? 's' : ''} selected
            </Text>
            <TouchableOpacity onPress={onCancel} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Text style={styles.overlayClose}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Image + overlays */}
          <View style={styles.overlayImageContainer} onLayout={handleContainerLayout}>
            {imageUri && (
              <Image
                source={{ uri: imageUri }}
                style={StyleSheet.absoluteFill}
                resizeMode="contain"
              />
            )}
            {layout && containerLayout && items.map(item => {
              const rect = frameToScreen(item.frame, imageDims.w, imageDims.h, layout);
              const isItem = item.kind === 'item';
              const isSelected = isItem && selectedIds.has(item.id);
              const boxLabel = (item.quantity ? `${item.quantity}× ` : '') + item.label;

              if (!isItem) {
                return (
                  <View
                    key={item.id}
                    style={[styles.overlayBox, styles.overlayBoxInfo, {
                      left: rect.left, top: rect.top,
                      width: rect.width, height: rect.height,
                    }]}
                    pointerEvents="none"
                  >
                    <Text style={styles.overlayBoxLabel} numberOfLines={1}>{item.label}</Text>
                    <Text style={styles.overlayBoxAmount}>{item.amount.toFixed(2)}</Text>
                  </View>
                );
              }

              return (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.overlayBox, isSelected ? styles.overlayBoxSelected : styles.overlayBoxUnselected, {
                    left: rect.left, top: rect.top,
                    width: rect.width, height: rect.height,
                  }]}
                  onPress={() => handleToggle(item.id)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.overlayBoxLabel} numberOfLines={1}>{boxLabel}</Text>
                  <Text style={styles.overlayBoxAmount}>{item.amount.toFixed(2)}{currency ? ` ${currency}` : ''}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Footer */}
          <View style={styles.overlayFooter}>
            <TouchableOpacity
              style={[styles.overlayConfirmBtn, { opacity: selectedCount === 0 ? 0.5 : 1 }]}
              onPress={handleConfirm}
              disabled={selectedCount === 0}
              activeOpacity={0.85}
            >
              <Text style={styles.overlayConfirmBtnText}>
                Add {selectedCount} item{selectedCount !== 1 ? 's' : ''}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }

  // ── Checklist fallback mode (no spatial data) ─────────────────────────────

  const itemLines = items.filter(l => l.kind === 'item');

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onCancel}>
      <View style={styles.checklistOverlay}>
        <View style={styles.checklistSheet}>
          {/* Header */}
          <View style={styles.checklistHeader}>
            <TouchableOpacity onPress={onCancel}>
              <Text style={styles.checklistClose}>✕</Text>
            </TouchableOpacity>
            <Text style={styles.checklistTitle}>Review scan</Text>
            <View style={{ width: 28 }} />
          </View>

          {/* Receipt image */}
          {imageUri && (
            <Image
              source={{ uri: imageUri }}
              style={styles.checklistImage}
              resizeMode="contain"
            />
          )}

          <Text style={styles.checklistSectionLabel}>
            Select items to add ({selectedCount} selected)
          </Text>

          <FlatList
            data={itemLines}
            keyExtractor={l => l.id}
            style={{ flex: 1 }}
            renderItem={({ item: line }) => {
              const checked = selectedIds.has(line.id);
              const editLabel = fallbackEdits[line.id]?.label ?? line.label;
              const editAmount = fallbackEdits[line.id]?.amount ?? String(line.amount);
              return (
                <TouchableOpacity
                  style={styles.checklistRow}
                  onPress={() => handleToggle(line.id)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.checklistCheckbox, {
                    borderColor: checked ? Colors.rust : Colors.lightBorder,
                    backgroundColor: checked ? Colors.rust : Colors.white,
                  }]}>
                    {checked && <Text style={styles.checklistCheckMark}>✓</Text>}
                  </View>
                  <View style={styles.checklistRowContent}>
                    <TextInput
                      style={styles.checklistLabelInput}
                      value={editLabel}
                      onChangeText={v => setFallbackEdits(prev => ({
                        ...prev,
                        [line.id]: { label: v, amount: prev[line.id]?.amount ?? editAmount },
                      }))}
                      returnKeyType="done"
                    />
                    <TextInput
                      style={styles.checklistAmountInput}
                      value={editAmount}
                      onChangeText={v => setFallbackEdits(prev => ({
                        ...prev,
                        [line.id]: { label: prev[line.id]?.label ?? editLabel, amount: v },
                      }))}
                      keyboardType="decimal-pad"
                      returnKeyType="done"
                    />
                  </View>
                </TouchableOpacity>
              );
            }}
          />

          <View style={styles.checklistFooter}>
            <TouchableOpacity
              style={[styles.checklistConfirmBtn, { opacity: selectedCount === 0 ? 0.5 : 1 }]}
              onPress={handleConfirm}
              disabled={selectedCount === 0}
              activeOpacity={0.85}
            >
              <Text style={styles.checklistConfirmBtnText}>
                Add {selectedCount} item{selectedCount !== 1 ? 's' : ''}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  // ── Overlay mode ──────────────────────────────────────────────────────────
  overlayRoot: {
    flex: 1,
    backgroundColor: '#000',
  },
  overlayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  overlayHeaderCount: {
    fontFamily: Typography.mono,
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
  },
  overlayClose: {
    fontFamily: Typography.mono,
    fontSize: 18,
    color: 'rgba(255,255,255,0.7)',
  },
  overlayImageContainer: {
    flex: 1,
    backgroundColor: '#111',
    overflow: 'hidden',
  },
  overlayBox: {
    position: 'absolute',
    borderRadius: 4,
    padding: 3,
    justifyContent: 'center',
  },
  overlayBoxSelected: {
    backgroundColor: 'rgba(176,70,50,0.55)',
    borderColor: Colors.rust,
    borderWidth: 2,
  },
  overlayBoxUnselected: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderColor: 'rgba(255,255,255,0.5)',
    borderWidth: 1,
  },
  overlayBoxInfo: {
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderColor: Colors.gold,
    borderWidth: 1,
    opacity: 0.5,
  },
  overlayBoxLabel: {
    fontFamily: Typography.mono,
    fontSize: 9,
    color: '#fff',
    lineHeight: 12,
  },
  overlayBoxAmount: {
    fontFamily: Typography.mono,
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
  },
  overlayFooter: {
    padding: 14,
    backgroundColor: '#000',
  },
  overlayConfirmBtn: {
    backgroundColor: Colors.rust,
    borderRadius: Radius.md,
    paddingVertical: 14,
    alignItems: 'center',
  },
  overlayConfirmBtnText: {
    fontFamily: Typography.mono,
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },

  // ── Checklist fallback ────────────────────────────────────────────────────
  checklistOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  checklistSheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: Radius.md,
    borderTopRightRadius: Radius.md,
    maxHeight: '90%',
    paddingBottom: 20,
  },
  checklistHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.lightBorder,
  },
  checklistClose: {
    fontFamily: Typography.mono,
    fontSize: 18,
    color: Colors.sage,
    width: 28,
    textAlign: 'center',
  },
  checklistTitle: {
    fontFamily: Typography.serif,
    fontSize: 16,
    fontWeight: '700',
    color: Colors.darkSlate,
  },
  checklistImage: {
    width: '100%',
    height: 200,
    backgroundColor: '#f0f0f0',
  },
  checklistSectionLabel: {
    fontFamily: Typography.mono,
    fontSize: 11,
    color: Colors.sage,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.lightBorder,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  checklistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.lightBorder,
    gap: 10,
  },
  checklistCheckbox: {
    width: 22,
    height: 22,
    borderWidth: 1.5,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  checklistCheckMark: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 15,
  },
  checklistRowContent: {
    flex: 1,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  checklistLabelInput: {
    flex: 1,
    fontFamily: Typography.mono,
    fontSize: 13,
    color: Colors.darkSlate,
    borderWidth: 1,
    borderColor: Colors.lightBorder,
    borderRadius: Radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  checklistAmountInput: {
    width: 72,
    fontFamily: Typography.mono,
    fontSize: 13,
    color: Colors.rust,
    borderWidth: 1,
    borderColor: Colors.lightBorder,
    borderRadius: Radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 4,
    textAlign: 'right',
  },
  checklistFooter: {
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.lightBorder,
  },
  checklistConfirmBtn: {
    backgroundColor: Colors.rust,
    borderRadius: Radius.md,
    paddingVertical: 13,
    alignItems: 'center',
  },
  checklistConfirmBtnText: {
    fontFamily: Typography.mono,
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
});
