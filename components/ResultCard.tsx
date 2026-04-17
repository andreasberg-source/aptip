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
  roundUpOption?: number | null;
  onRoundUp?: (value: number) => void;
}

export default function ResultCard({ result, homeAmount, homeCurrency, onSave, roundUpOption, onRoundUp }: Props) {
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
      <View style={styles.actionRow}>
        {roundUpOption != null && onRoundUp && (
          <TouchableOpacity
            style={[styles.roundUpBtn, { borderColor: C.gold, backgroundColor: 'rgba(255,255,255,0.12)' }]}
            onPress={() => onRoundUp(roundUpOption)}
            activeOpacity={0.75}
          >
            <Text style={[styles.roundUpText, { color: '#fff' }]}>
              ↑ {formatAmount(roundUpOption, roundUpOption % 1 === 0 ? 0 : 2)}
            </Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={[styles.saveBtn, { flex: 1 }]} onPress={onSave}>
          <Text style={styles.saveBtnText}>{t('result.save')}</Text>
        </TouchableOpacity>
      </View>
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
    marginBottom: 8,
    padding: 16,
    borderRadius: Radius.md,
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
  actionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  roundUpBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1.5,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roundUpText: {
    fontFamily: Typography.mono,
    fontSize: 12,
    fontWeight: '600',
  },
  saveBtn: {
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
