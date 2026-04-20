import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useTranslation } from 'react-i18next';

import { ServiceType } from '../data/tippingData';
import { useColors } from '../hooks/useColors';
import { Typography, Radius } from '../constants/Theme';

const OPTIONS: { key: ServiceType; emoji: string }[] = [
  { key: 'restaurants', emoji: '🍽️' },
  { key: 'taxis',       emoji: '🚕' },
  { key: 'shops',       emoji: '🛍️' },
  { key: 'services',    emoji: '💇' },
];

interface Props {
  value: ServiceType;
  onChange: (type: ServiceType) => void;
}

export default function ServiceTypeSelector({ value, onChange }: Props) {
  const { t } = useTranslation();
  const C = useColors();

  return (
    <View style={styles.container}>
      <Text style={[styles.header, { color: C.darkSlate }]}>
        {t('amount.serviceType')}
      </Text>
      <View style={[styles.pickerWrapper, { backgroundColor: C.white, borderColor: C.lightBorder }]}>
        <Picker
          selectedValue={value}
          onValueChange={(val) => onChange(val as ServiceType)}
          style={{ color: C.darkSlate, fontSize: 16, ...(Platform.OS === 'web' ? { height: 48 } : {}) }}
          dropdownIconColor={C.sage}
        >
          {OPTIONS.map(({ key, emoji }) => (
            <Picker.Item
              key={key}
              label={`${emoji}  ${t(`culture.${key}`)}`}
              value={key}
            />
          ))}
        </Picker>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  header: {
    fontFamily: Typography.serif,
    fontWeight: '600',
    fontSize: 15,
    marginBottom: 8,
  },
  pickerWrapper: {
    borderWidth: 2,
    borderRadius: Radius.sm,
    overflow: 'hidden',
    ...(Platform.OS === 'web' ? { height: 48 } : {}),
  },
});
