import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { useSettingsStore } from '../store/settingsStore';
import { SORTED_CURRENCIES } from '../data/currencies';
import { useColors } from '../hooks/useColors';
import { Typography, Radius } from '../constants/Theme';

export default function CurrencyPickerScreen() {
  const { t } = useTranslation();
  const C = useColors();
  const { homeCurrency, patch } = useSettingsStore();
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return SORTED_CURRENCIES;
    return SORTED_CURRENCIES.filter(
      (c) => c.code.toLowerCase().includes(q) || c.name.toLowerCase().includes(q),
    );
  }, [search]);

  const handleSelect = async (code: string) => {
    await patch({ homeCurrency: code });
    router.back();
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.cream }]}>
      <View style={[styles.header, { borderBottomColor: C.sage }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={[styles.backText, { color: C.rust }]}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: C.darkSlate }]}>{t('settings.homeCurrency')}</Text>
      </View>

      <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 }}>
        <TextInput
          style={[styles.search, { backgroundColor: C.white, borderColor: C.lightBorder, color: C.darkSlate }]}
          value={search}
          onChangeText={setSearch}
          placeholder={t('onboarding.searchPlaceholder')}
          placeholderTextColor={C.sage}
          autoCapitalize="none"
          autoCorrect={false}
          autoFocus
          clearButtonMode="while-editing"
        />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.code}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => {
          const active = item.code === homeCurrency;
          return (
            <TouchableOpacity
              style={[
                styles.row,
                { borderBottomColor: C.lightBorder },
                active && { backgroundColor: C.rustTransparent },
              ]}
              onPress={() => handleSelect(item.code)}
              activeOpacity={0.7}
            >
              <Text style={[styles.code, { color: active ? C.rust : C.sage }]}>{item.code}</Text>
              <Text style={[styles.name, { color: active ? C.rust : C.darkSlate }, active && styles.nameActive]}>
                {item.name}
              </Text>
              {active && <Text style={[styles.check, { color: C.rust }]}>✓</Text>}
            </TouchableOpacity>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backBtn: { paddingRight: 8 },
  backText: { fontFamily: Typography.serif, fontSize: 18 },
  title: { fontFamily: Typography.serif, fontSize: 18, fontWeight: '700' },
  search: {
    borderWidth: 2,
    borderRadius: Radius.sm,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontFamily: Typography.mono,
    fontSize: 15,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    gap: 10,
  },
  code: { fontFamily: Typography.mono, fontSize: 14, fontWeight: '700', width: 44 },
  name: { fontFamily: Typography.serif, fontSize: 14, flex: 1 },
  nameActive: { fontWeight: '600' },
  check: { fontSize: 16 },
});
