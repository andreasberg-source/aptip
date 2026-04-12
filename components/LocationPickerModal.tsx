import React, { useState, useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  SectionList,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { tippingData, continentKeys, ContinentKey } from '../data/tippingData';
import { useColors } from '../hooks/useColors';
import { Typography, Radius } from '../constants/Theme';

interface CountryItem {
  name: string;
  currency: string;
  continent: ContinentKey;
}

interface Section {
  key: string;
  title: string;
  data: CountryItem[];
}

interface Props {
  visible: boolean;
  selectedCountry: string;
  favourites?: string[];
  onToggleFavourite?: (country: string) => void;
  recentCountries?: string[];
  onSelect: (continent: ContinentKey, country: string) => void;
  onClose: () => void;
}

/** Find a country by name across all continents */
function findCountry(name: string): CountryItem | null {
  for (const k of continentKeys) {
    if (tippingData[k][name]) {
      return { name, currency: tippingData[k][name].currency, continent: k };
    }
  }
  return null;
}

export default function LocationPickerModal({
  visible,
  selectedCountry,
  favourites = [],
  onToggleFavourite,
  recentCountries = [],
  onSelect,
  onClose,
}: Props) {
  const { t } = useTranslation();
  const C = useColors();
  const [search, setSearch] = useState('');

  const sections: Section[] = useMemo(() => {
    const q = search.trim().toLowerCase();

    const continentSections: Section[] = continentKeys
      .map((k) => ({
        key: k,
        title: t(`continent.${k}`),
        data: Object.entries(tippingData[k])
          .filter(([name]) => !q || name.toLowerCase().includes(q))
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([name, entry]) => ({ name, currency: entry.currency, continent: k })),
      }))
      .filter((s) => s.data.length > 0);

    // Only show pinned sections when not searching
    if (q) return continentSections;

    if (favourites.length > 0) {
      const favItems = favourites
        .map(findCountry)
        .filter((item): item is CountryItem => item !== null);
      if (favItems.length > 0) {
        return [
          { key: 'favourites', title: t('picker.favourites'), data: favItems },
          ...continentSections,
        ];
      }
    } else if (recentCountries.length > 0) {
      const recentItems = recentCountries
        .map(findCountry)
        .filter((item): item is CountryItem => item !== null);
      if (recentItems.length > 0) {
        return [
          { key: 'recent', title: t('picker.recentlyUsed'), data: recentItems },
          ...continentSections,
        ];
      }
    }

    return continentSections;
  }, [search, t, favourites, recentCountries]);

  const handleSelect = (continent: ContinentKey, country: string) => {
    onSelect(continent, country);
    setSearch('');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={[styles.safe, { backgroundColor: C.cream }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: C.lightBorder }]}>
          <Text style={[styles.title, { color: C.darkSlate }]}>{t('location.title')}</Text>
          <TouchableOpacity
            onPress={onClose}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Text style={[styles.closeBtn, { color: C.rust }]}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* Search */}
        <View style={[styles.searchWrap, { backgroundColor: C.white, borderColor: C.lightBorder }]}>
          <Text style={[styles.searchIcon, { color: C.sage }]}>🔍</Text>
          <TextInput
            style={[styles.searchInput, { color: C.darkSlate }]}
            placeholder={t('location.search')}
            placeholderTextColor={C.sage}
            value={search}
            onChangeText={setSearch}
            autoCapitalize="none"
            autoCorrect={false}
            clearButtonMode="while-editing"
          />
        </View>

        {/* Country list */}
        <SectionList
          sections={sections}
          keyExtractor={(item, index) => `${item.name}-${index}`}
          stickySectionHeadersEnabled={false}
          renderSectionHeader={({ section }) => (
            <View style={[styles.sectionHeader, { backgroundColor: C.cream }]}>
              <Text style={[styles.sectionTitle, { color: C.sage }]}>
                {section.title.toUpperCase()}
              </Text>
            </View>
          )}
          renderItem={({ item }) => {
            const active = item.name === selectedCountry;
            const isFav = favourites.includes(item.name);
            return (
              <View
                style={[
                  styles.row,
                  { backgroundColor: C.white, borderBottomColor: C.lightBorder },
                  active && { backgroundColor: C.rustTransparent },
                ]}
              >
                <TouchableOpacity
                  style={styles.rowMain}
                  onPress={() => handleSelect(item.continent, item.name)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.countryName,
                      { color: C.darkSlate },
                      active && { color: C.rust, fontWeight: '700' },
                    ]}
                  >
                    {item.name}
                  </Text>
                  <View
                    style={[
                      styles.currencyBadge,
                      { borderColor: active ? C.rust : C.lightBorder },
                    ]}
                  >
                    <Text style={[styles.currencyText, { color: active ? C.rust : C.sage }]}>
                      {item.currency}
                    </Text>
                  </View>
                </TouchableOpacity>
                {onToggleFavourite ? (
                  <TouchableOpacity
                    onPress={() => onToggleFavourite(item.name)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    style={styles.starBtn}
                  >
                    <Text style={[styles.star, { color: isFav ? C.gold : C.lightBorder }]}>
                      {isFav ? '★' : '☆'}
                    </Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            );
          }}
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
        />
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
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  title: {
    fontFamily: Typography.serif,
    fontSize: 18,
    fontWeight: '700',
  },
  closeBtn: {
    fontSize: 18,
    fontWeight: '600',
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginVertical: 12,
    borderWidth: 1.5,
    borderRadius: Radius.sm,
    paddingHorizontal: 12,
    gap: 8,
  },
  searchIcon: { fontSize: 16 },
  searchInput: {
    flex: 1,
    fontFamily: Typography.mono,
    fontSize: 15,
    paddingVertical: 10,
  },
  sectionHeader: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 6,
  },
  sectionTitle: {
    fontFamily: Typography.mono,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    paddingRight: 16,
  },
  rowMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingLeft: 16,
    paddingRight: 8,
  },
  countryName: {
    fontFamily: Typography.serif,
    fontSize: 16,
    flex: 1,
  },
  currencyBadge: {
    borderWidth: 1.5,
    borderRadius: Radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginLeft: 12,
  },
  currencyText: {
    fontFamily: Typography.mono,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  starBtn: {
    paddingLeft: 8,
  },
  star: {
    fontSize: 20,
  },
  listContent: { paddingBottom: 40 },
});
