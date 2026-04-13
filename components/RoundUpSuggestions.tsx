import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';

import { formatAmount } from '../utils/tipCalculations';
import { useColors } from '../hooks/useColors';
import { Typography, Radius } from '../constants/Theme';

interface Props {
  option: number | null;
  billAmount: number;
  currency: string;
  onSelect: (value: number) => void;
}

export default function RoundUpSuggestions({ option, billAmount, currency, onSelect }: Props) {
  const { t } = useTranslation();
  const C = useColors();

  if (!option || billAmount <= 0) return null;

  const impliedPct = ((option - billAmount) / billAmount) * 100;

  return (
    <View style={styles.wrap}>
      <Text style={[styles.label, { color: C.darkSlate }]}>{t('roundup.label')}</Text>
      <TouchableOpacity
        style={[styles.chip, { backgroundColor: C.cream, borderColor: C.gold }]}
        onPress={() => onSelect(option)}
        activeOpacity={0.7}
      >
        <Text style={[styles.amount, { color: C.darkSlate }]}>
          {formatAmount(option, option % 1 === 0 ? 0 : 2)} {currency}
        </Text>
        <Text style={[styles.pct, { color: C.sage }]}>
          {impliedPct.toFixed(1)}%
        </Text>
      </TouchableOpacity>
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
  chip: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderWidth: 2,
    borderRadius: Radius.sm,
  },
  amount: {
    fontFamily: Typography.mono,
    fontSize: 15,
    fontWeight: '600',
  },
  pct: {
    fontFamily: Typography.mono,
    fontSize: 13,
  },
});
