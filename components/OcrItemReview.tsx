import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  FlatList,
  TextInput,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useColors } from '../hooks/useColors';
import { Typography, Radius, Spacing } from '../constants/Theme';
import type { RawLine } from '../utils/parseAmounts';

interface OcrItemReviewProps {
  visible: boolean;
  items: RawLine[];
  currency?: string;
  onConfirm: (selected: RawLine[]) => void;
  onCancel: () => void;
}

export default function OcrItemReview({
  visible,
  items,
  currency,
  onConfirm,
  onCancel,
}: OcrItemReviewProps) {
  const { t } = useTranslation();
  const C = useColors();

  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const [edits, setEdits] = useState<Record<string, { label: string; amount: string }>>({});
  const [localItems, setLocalItems] = useState<RawLine[]>([]);

  useEffect(() => {
    if (visible) {
      setLocalItems(items);
      setCheckedIds(new Set(items.filter(l => l.kind === 'item' && l.amount !== null).map(l => l.id)));
      setEdits({});
    }
  }, [visible, items]);

  const toggleCheck = useCallback((id: string) => {
    setCheckedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const setEditLabel = useCallback((id: string, label: string) => {
    setEdits(prev => ({ ...prev, [id]: { ...prev[id], label } }));
  }, []);

  const setEditAmount = useCallback((id: string, amount: string) => {
    setEdits(prev => ({ ...prev, [id]: { ...prev[id], amount } }));
  }, []);

  const handleAddLine = useCallback(() => {
    const newId = `manual-${Date.now()}`;
    const newLine: RawLine = { id: newId, label: '', amount: null, kind: 'item' };
    setLocalItems(prev => [...prev, newLine]);
    setCheckedIds(prev => new Set([...prev, newId]));
  }, []);

  const handleConfirm = useCallback(() => {
    const selected: RawLine[] = localItems
      .filter(l => checkedIds.has(l.id))
      .map(l => {
        const edit = edits[l.id];
        const label = edit?.label !== undefined ? edit.label : l.label;
        const amountStr = edit?.amount !== undefined ? edit.amount : String(l.amount ?? '');
        const amount = parseFloat(amountStr.replace(',', '.')) || null;
        return { ...l, label, amount };
      })
      .filter(l => l.amount !== null && l.amount > 0);
    onConfirm(selected);
  }, [localItems, checkedIds, edits, onConfirm]);

  const checkedTotal = localItems
    .filter(l => checkedIds.has(l.id))
    .reduce((sum, l) => {
      const edit = edits[l.id];
      const amountStr = edit?.amount !== undefined ? edit.amount : String(l.amount ?? '0');
      return sum + (parseFloat(amountStr.replace(',', '.')) || 0);
    }, 0);

  const checkedCount = checkedIds.size;

  const renderItem = ({ item: line }: { item: RawLine }) => {
    const checked = checkedIds.has(line.id);
    const isActive = line.kind === 'item';
    const editLabel = edits[line.id]?.label !== undefined ? edits[line.id].label : line.label;
    const editAmount = edits[line.id]?.amount !== undefined ? edits[line.id].amount : (line.amount !== null ? String(line.amount) : '');

    return (
      <TouchableOpacity
        style={[
          styles.row,
          { borderBottomColor: C.lightBorder, backgroundColor: C.white },
          !checked && { opacity: 0.45 },
        ]}
        onPress={() => toggleCheck(line.id)}
        activeOpacity={0.7}
      >
        <View style={[
          styles.checkbox,
          {
            borderColor: checked ? C.rust : C.lightBorder,
            backgroundColor: checked ? C.rust : C.white,
          },
        ]}>
          {checked && <Text style={styles.checkmark}>✓</Text>}
        </View>

        <TextInput
          style={[styles.labelInput, { color: checked ? C.darkSlate : C.sage }]}
          value={editLabel}
          onChangeText={v => setEditLabel(line.id, v)}
          placeholder={isActive ? 'Item name' : line.kind}
          placeholderTextColor={C.sage}
          returnKeyType="done"
          onPress={(e) => e.stopPropagation?.()}
        />

        <TextInput
          style={[
            styles.amountInput,
            {
              borderColor: C.lightBorder,
              color: checked ? C.rust : C.sage,
            },
          ]}
          value={editAmount}
          onChangeText={v => setEditAmount(line.id, v)}
          placeholder="—"
          placeholderTextColor={C.sage}
          keyboardType="decimal-pad"
          returnKeyType="done"
          onPress={(e) => e.stopPropagation?.()}
        />
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onCancel}
    >
      <SafeAreaView style={[styles.safe, { backgroundColor: C.cream }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: C.lightBorder }]}>
          <TouchableOpacity onPress={onCancel} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Text style={[styles.closeBtn, { color: C.rust }]}>✕</Text>
          </TouchableOpacity>
          <Text style={[styles.title, { color: C.darkSlate }]}>Review receipt</Text>
          <TouchableOpacity
            onPress={handleAddLine}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Text style={[styles.addBtn, { color: C.rust }]}>＋ Add</Text>
          </TouchableOpacity>
        </View>

        {/* Subheader */}
        <View style={[styles.subheader, { backgroundColor: C.white, borderBottomColor: C.lightBorder }]}>
          <Text style={[styles.subheaderText, { color: C.sage }]}>
            {checkedCount} item{checkedCount !== 1 ? 's' : ''} selected — tap row to toggle
          </Text>
        </View>

        {/* List */}
        <FlatList
          data={localItems}
          keyExtractor={l => l.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
        />

        {/* Footer */}
        <View style={[styles.footer, { borderTopColor: C.lightBorder, backgroundColor: C.white }]}>
          <Text style={[styles.footerTotal, { color: C.darkSlate }]}>
            Total:{' '}
            <Text style={{ color: C.rust }}>
              {checkedTotal.toFixed(2)}{currency ? ` ${currency}` : ''}
            </Text>
          </Text>
          <TouchableOpacity
            style={[
              styles.confirmBtn,
              { backgroundColor: C.rust, opacity: checkedCount === 0 ? 0.5 : 1 },
            ]}
            onPress={handleConfirm}
            disabled={checkedCount === 0}
            activeOpacity={0.85}
          >
            <Text style={styles.confirmBtnText}>
              Add {checkedCount} item{checkedCount !== 1 ? 's' : ''}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  title: {
    fontFamily: Typography.serif,
    fontSize: 17,
    fontWeight: '700',
  },
  closeBtn: {
    fontFamily: Typography.mono,
    fontSize: 18,
    fontWeight: '600',
    width: 44,
  },
  addBtn: {
    fontFamily: Typography.mono,
    fontSize: 14,
    fontWeight: '700',
    width: 60,
    textAlign: 'right',
  },
  subheader: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  subheaderText: {
    fontFamily: Typography.mono,
    fontSize: 11,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  listContent: { paddingBottom: 16 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    gap: 10,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderWidth: 1.5,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  checkmark: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 15,
  },
  labelInput: {
    flex: 1,
    fontFamily: Typography.mono,
    fontSize: 13,
    paddingVertical: 4,
    paddingHorizontal: 0,
  },
  amountInput: {
    width: 80,
    fontFamily: Typography.mono,
    fontSize: 13,
    fontWeight: '700',
    borderWidth: 1,
    borderRadius: Radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 4,
    textAlign: 'right',
  },
  footer: {
    paddingHorizontal: Spacing.lg,
    paddingTop: 12,
    paddingBottom: 8,
    borderTopWidth: 1,
    gap: 10,
  },
  footerTotal: {
    fontFamily: Typography.mono,
    fontSize: 14,
    fontWeight: '700',
  },
  confirmBtn: {
    borderRadius: Radius.md,
    paddingVertical: 14,
    alignItems: 'center',
  },
  confirmBtnText: {
    fontFamily: Typography.mono,
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
});
