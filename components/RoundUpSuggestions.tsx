import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';

import { formatAmount } from '../utils/tipCalculations';
import { useColors } from '../hooks/useColors';
import { Typography, Radius } from '../constants/Theme';

interface Props {
  options: number[];
  currency: string;
  onSelect: (value: number) => void;
}

export default function RoundUpSuggestions({ options, currency, onSelect }: Props) {
  const { t } = useTranslation();
  const C = useColors();

  if (options.length === 0) return null;

  return (
    <View style={styles.wrap}>
      <Text style={[styles.label, { color: C.darkSlate }]}>{t('roundup.label')}</Text>
      <View style={styles.row}>
        {options.map((opt) => (
          <TouchableOpacity
            key={opt}
            style={[styles.chip, { backgroundColor: C.cream, borderColor: C.gold }]}
            onPress={() => onSelect(opt)}
            activeOpacity={0.7}
          >
            <Text style={[styles.chipText, { color: C.darkSlate }]}>
              {formatAmount(opt, opt % 1 === 0 ? 0 : 2)} {currency}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 20 },
  label: {
    fontFamily: Typography.serif,
    fontWeight: '600',
    fontSize: 14,
    marginBottom: 8,
  },
  row: { flexDirection: 'row', gap: 8 },
  chip: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderWidth: 2,
    borderRadius: Radius.sm,
    alignItems: 'center',
  },
  chipText: {
    fontFamily: Typography.mono,
    fontSize: 13,
    fontWeight: '500',
  },
});
