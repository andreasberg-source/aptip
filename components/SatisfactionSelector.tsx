import React from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Satisfaction } from '../utils/tipCalculations';
import { useColors } from '../hooks/useColors';
import { Typography, Radius } from '../constants/Theme';

interface Props {
  selected: Satisfaction | null;
  customPercent: string;
  onSelect: (s: Satisfaction) => void;
  onCustomChange: (v: string) => void;
}

const OPTIONS: { key: Satisfaction; emoji: string }[] = [
  { key: 'poor', emoji: '😕' },
  { key: 'ok', emoji: '🙂' },
  { key: 'excellent', emoji: '😄' },
  { key: 'custom', emoji: '✏️' },
];

export default function SatisfactionSelector({
  selected,
  customPercent,
  onSelect,
  onCustomChange,
}: Props) {
  const { t } = useTranslation();
  const C = useColors();

  return (
    <View style={styles.step}>
      <Text style={[styles.label, { color: C.darkSlate }]}>{t('satisfaction.label')}</Text>
      <View style={styles.grid}>
        {OPTIONS.map(({ key, emoji }) => {
          const active = selected === key;
          return (
            <TouchableOpacity
              key={key}
              style={[
                styles.btn,
                { backgroundColor: C.cream },
                active && { backgroundColor: C.rust },
              ]}
              onPress={() => onSelect(key)}
              activeOpacity={0.7}
            >
              <Text style={styles.emoji}>{emoji}</Text>
              <Text style={[styles.btnText, { color: C.darkSlate }, active && { color: '#fff' }]}>
                {t(`satisfaction.${key}`)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {selected === 'custom' && (
        <TextInput
          style={[
            styles.customInput,
            { backgroundColor: C.cream, borderColor: C.rust, color: C.darkSlate },
          ]}
          value={customPercent}
          onChangeText={onCustomChange}
          placeholder={t('satisfaction.customPlaceholder')}
          placeholderTextColor={C.sage}
          keyboardType="decimal-pad"
          autoFocus
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  step: { marginBottom: 12 },
  label: {
    fontFamily: Typography.serif,
    fontWeight: '600',
    fontSize: 15,
    marginBottom: 6,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  btn: {
    flex: 1,
    minWidth: '22%',
    paddingVertical: 7,
    paddingHorizontal: 8,
    borderRadius: Radius.sm,
    alignItems: 'center',
    gap: 3,
  },
  emoji: { fontSize: 18 },
  btnText: {
    fontFamily: Typography.serif,
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
  customInput: {
    marginTop: 10,
    borderWidth: 2,
    borderRadius: Radius.sm,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: Typography.mono,
    fontSize: 18,
  },
});
