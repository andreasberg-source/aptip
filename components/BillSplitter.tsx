import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';

import { useColors } from '../hooks/useColors';
import { Typography, Radius } from '../constants/Theme';

interface Props {
  people: number;
  onChange: (n: number) => void;
}

export default function BillSplitter({ people, onChange }: Props) {
  const { t } = useTranslation();
  const C = useColors();

  return (
    <View style={styles.step}>
      <Text style={[styles.label, { color: C.darkSlate }]}>{t('split.label')}</Text>
      <View style={styles.row}>
        <TouchableOpacity
          style={[styles.stepper, { backgroundColor: C.sage }, people <= 1 && styles.stepperDisabled]}
          onPress={() => onChange(Math.max(1, people - 1))}
          disabled={people <= 1}
        >
          <Text style={styles.stepperText}>−</Text>
        </TouchableOpacity>

        <View style={[styles.countWrap, { backgroundColor: C.cream, borderColor: C.lightBorder }]}>
          <Text style={[styles.countText, { color: C.darkSlate }]}>
            {people === 1 ? t('split.onePerson') : t('split.people', { n: people })}
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.stepper, { backgroundColor: C.sage }, people >= 20 && styles.stepperDisabled]}
          onPress={() => onChange(Math.min(20, people + 1))}
          disabled={people >= 20}
        >
          <Text style={styles.stepperText}>+</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  step: { marginBottom: 20 },
  label: {
    fontFamily: Typography.serif,
    fontWeight: '600',
    fontSize: 15,
    marginBottom: 10,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stepper: {
    width: 44,
    height: 44,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperDisabled: { opacity: 0.35 },
  stepperText: { color: '#fff', fontSize: 22, fontWeight: '600', lineHeight: 26 },
  countWrap: {
    flex: 1,
    borderWidth: 2,
    borderRadius: Radius.sm,
    paddingVertical: 10,
    alignItems: 'center',
  },
  countText: {
    fontFamily: Typography.mono,
    fontSize: 16,
  },
});
