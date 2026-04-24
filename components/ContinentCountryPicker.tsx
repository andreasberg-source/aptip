import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import { useTranslation } from 'react-i18next';

import { tippingData, ContinentKey, getLocalizedCountryName } from '../data/tippingData';
import i18n from '../i18n';
import { useColors } from '../hooks/useColors';
import { Typography, Radius } from '../constants/Theme';
import LocationPickerModal from './LocationPickerModal';

interface Props {
  continent: ContinentKey | '';
  country: string;
  onContinentChange: (c: ContinentKey | '') => void;
  onCountryChange: (country: string) => void;
  style?: ViewStyle;
  favourites?: string[];
  onToggleFavourite?: (country: string) => void;
  recentCountries?: string[];
}

export default function ContinentCountryPicker({
  continent,
  country,
  onContinentChange,
  onCountryChange,
  style,
  favourites = [],
  onToggleFavourite,
  recentCountries = [],
}: Props) {
  const { t } = useTranslation();
  const C = useColors();
  const [modalVisible, setModalVisible] = useState(false);

  const currency =
    continent && country ? tippingData[continent]?.[country]?.currency ?? '' : '';
  const hasSelection = !!country;

  return (
    <View style={[styles.wrap, style]}>
      <TouchableOpacity
        style={[
          styles.btn,
          {
            backgroundColor: C.white,
            borderColor: hasSelection ? C.rust : C.lightBorder,
          },
        ]}
        onPress={() => setModalVisible(true)}
        activeOpacity={0.75}
      >
        <Text style={styles.pin}>📍</Text>
        <Text
          style={[
            styles.btnText,
            { color: hasSelection ? C.darkSlate : C.sage },
          ]}
          numberOfLines={1}
        >
          {hasSelection ? getLocalizedCountryName(country, i18n.language) : t('location.button')}
        </Text>
        {hasSelection && currency ? (
          <View style={[styles.currencyBadge, { borderColor: C.rust }]}>
            <Text style={[styles.currencyText, { color: C.rust }]}>{currency}</Text>
          </View>
        ) : null}
        <Text style={[styles.chevron, { color: C.sage }]}>›</Text>
      </TouchableOpacity>

      <LocationPickerModal
        visible={modalVisible}
        selectedCountry={country}
        favourites={favourites}
        onToggleFavourite={onToggleFavourite}
        recentCountries={recentCountries}
        onSelect={(c, cn) => {
          onContinentChange(c);
          onCountryChange(cn);
        }}
        onClose={() => setModalVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 0 },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 2,
    borderRadius: Radius.sm,
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  pin: { fontSize: 20 },
  btnText: {
    fontFamily: Typography.serif,
    fontSize: 16,
    flex: 1,
  },
  currencyBadge: {
    borderWidth: 1.5,
    borderRadius: Radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  currencyText: {
    fontFamily: Typography.mono,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  chevron: {
    fontSize: 22,
    fontWeight: '300',
    lineHeight: 24,
  },
});
