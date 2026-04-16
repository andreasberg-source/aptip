import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';

import { TipResult, formatAmount } from '../utils/tipCalculations';
import { useColors } from '../hooks/useColors';
import { Typography, Radius } from '../constants/Theme';

interface Props {
  result: TipResult;
  homeAmount: number | null;
  homeCurrency: string;
  onSave: () => void;
}

export default function ResultCard({ result, homeAmount, homeCurrency, onSave }: Props) {
  const { t } = useTranslation();
  const C = useColors();
  const { amount, tipPercent, tipAmount, total, currency } = result;

  return (
    <View style={[styles.card, { backgroundColor: C.sage }]}>
      <Row label={t('result.original')} value={`${formatAmount(amount)} ${currency}`} />
      <Row
        label={t('result.tip', { percent: +tipPercent.toFixed(1) })}
        value={`${formatAmount(tipAmount)} ${currency}`}
      />
      <Row label={t('result.total')} value={`${formatAmount(total)} ${currency}`} large />
      {homeAmount !== null && (
        <View style={styles.homeRow}>
          <Text style={styles.homeText}>
            {t('result.home', { amount: formatAmount(homeAmount, 0), currency: homeCurrency })}
          </Text>
        </View>
      )}
      <TouchableOpacity style={styles.saveBtn} onPress={onSave}>
        <Text style={styles.saveBtnText}>{t('result.save')}</Text>
      </TouchableOpacity>
    </View>
  );
}

function Row({ label, value, large }: { label: string; value: string; large?: boolean }) {
  return (
    <View style={[styles.row, large && styles.rowLarge]}>
      <Text style={[styles.rowLabel, large && styles.rowLabelLarge]}>{label}</Text>
      <Text style={[styles.rowValue, large && styles.rowValueLarge]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: 4,
    marginBottom: 6,
    padding: 14,
    borderRadius: Radius.sm,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.2)',
  },
  rowLarge: { marginTop: 8, borderBottomWidth: 0 },
  rowLabel: {
    fontFamily: Typography.serif,
    fontSize: 14,
    color: 'rgba(255,255,255,0.85)',
  },
  rowLabelLarge: { fontSize: 16, color: '#fff' },
  rowValue: {
    fontFamily: Typography.mono,
    fontSize: 16,
    color: '#fff',
    fontWeight: '500',
  },
  rowValueLarge: { fontSize: 22 },
  homeRow: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.2)',
  },
  homeText: {
    fontFamily: Typography.mono,
    fontSize: 13,
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
  },
  saveBtn: {
    marginTop: 10,
    paddingVertical: 8,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: Radius.sm,
    alignItems: 'center',
  },
  saveBtnText: {
    fontFamily: Typography.mono,
    fontSize: 13,
    color: '#fff',
    letterSpacing: 1,
  },
});
