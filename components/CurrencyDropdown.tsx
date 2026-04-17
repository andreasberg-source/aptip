import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  FlatList,
  TextInput,
  StyleSheet,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import i18n from '../i18n';

import { useColors } from '../hooks/useColors';
import { Typography, Radius } from '../constants/Theme';
import { SORTED_CURRENCIES, getLocalizedCurrencyName } from '../data/currencies';

interface Props {
  value: string;
  onChange: (code: string) => void;
  priorityCurrencies?: string[];
  label?: string;
}

export default function CurrencyDropdown({ value, onChange, priorityCurrencies, label }: Props) {
  const { t } = useTranslation();
  const C = useColors();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const locale = i18n.language;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return SORTED_CURRENCIES;
    return SORTED_CURRENCIES.filter(c => {
      const localName = getLocalizedCurrencyName(c.code, locale).toLowerCase();
      return c.code.toLowerCase().includes(q) || c.name.toLowerCase().includes(q) || localName.includes(q);
    });
  }, [search, locale]);

  const uniquePriority = priorityCurrencies?.filter(Boolean) ?? [];

  const handleSelect = (code: string) => {
    onChange(code);
    setOpen(false);
    setSearch('');
  };

  return (
    <>
      <TouchableOpacity
        style={[styles.btn, { borderColor: C.lightBorder, backgroundColor: C.white }]}
        onPress={() => setOpen(true)}
        activeOpacity={0.7}
      >
        {label ? (
          <Text style={[styles.btnLabel, { color: C.sage }]}>{label}</Text>
        ) : null}
        <Text style={[styles.btnCode, { color: C.rust }]}>{value}</Text>
        <Text style={[styles.chevron, { color: C.sage }]}>▾</Text>
      </TouchableOpacity>

      <Modal
        visible={open}
        animationType="fade"
        transparent
        onRequestClose={() => { setOpen(false); setSearch(''); }}
      >
        <View style={styles.overlay}>
          <View style={[styles.sheet, { backgroundColor: C.white }]}>
            {/* Header */}
            <View style={[styles.sheetHeader, { borderBottomColor: C.lightBorder }]}>
              <Text style={[styles.sheetTitle, { color: C.darkSlate }]}>
                {t('splitTab.currency')}
              </Text>
              <TouchableOpacity onPress={() => { setOpen(false); setSearch(''); }}>
                <Text style={[styles.closeBtn, { color: C.rust }]}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Priority chips */}
            {uniquePriority.length > 0 && (
              <View style={[styles.prioritySection, { borderBottomColor: C.lightBorder }]}>
                <View style={styles.priorityRow}>
                  {uniquePriority.map(code => (
                    <TouchableOpacity
                      key={code}
                      style={[
                        styles.priorityChip,
                        { borderColor: C.lightBorder, backgroundColor: C.cream },
                        value === code && { backgroundColor: C.rust, borderColor: C.rust },
                      ]}
                      onPress={() => handleSelect(code)}
                      activeOpacity={0.7}
                    >
                      <Text style={[
                        styles.priorityChipText,
                        { color: value === code ? '#fff' : C.darkSlate },
                      ]}>
                        {code}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* Search */}
            <View style={[styles.searchWrap, { borderBottomColor: C.lightBorder }]}>
              <TextInput
                style={[styles.searchInput, { color: C.darkSlate }]}
                value={search}
                onChangeText={setSearch}
                placeholder="Search..."
                placeholderTextColor={C.sage}
                autoCapitalize="none"
                returnKeyType="search"
              />
            </View>

            {/* List */}
            <FlatList
              data={filtered}
              keyExtractor={item => item.code}
              keyboardShouldPersistTaps="handled"
              initialNumToRender={20}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.row,
                    { borderBottomColor: C.lightBorder },
                    value === item.code && { backgroundColor: C.rustTransparent },
                  ]}
                  onPress={() => handleSelect(item.code)}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    styles.rowCode,
                    { color: value === item.code ? C.rust : C.darkSlate },
                  ]}>
                    {item.code}
                  </Text>
                  <Text style={[styles.rowName, { color: C.sage }]} numberOfLines={1}>
                    {getLocalizedCurrencyName(item.code, locale)}
                  </Text>
                  {value === item.code && (
                    <Text style={[styles.check, { color: C.rust }]}>✓</Text>
                  )}
                </TouchableOpacity>
              )}
              style={styles.list}
            />
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: Radius.sm,
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 4,
  },
  btnLabel: {
    fontFamily: Typography.mono,
    fontSize: 12,
    marginRight: 4,
  },
  btnCode: {
    fontFamily: Typography.mono,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 1,
  },
  chevron: { fontSize: 12 },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-start',
  },
  sheet: {
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    maxHeight: '80%',
    marginTop: 44,
    flex: 1,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
  },
  sheetTitle: {
    fontFamily: Typography.serif,
    fontWeight: '700',
    fontSize: 16,
  },
  closeBtn: { fontSize: 18, fontWeight: '600', paddingHorizontal: 4 },
  prioritySection: {
    padding: 12,
    borderBottomWidth: 1,
  },
  priorityRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  priorityChip: {
    borderWidth: 1.5,
    borderRadius: Radius.sm,
    paddingVertical: 6,
    paddingHorizontal: 14,
  },
  priorityChipText: { fontFamily: Typography.mono, fontSize: 14, fontWeight: '700' },
  searchWrap: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  searchInput: {
    fontFamily: Typography.mono,
    fontSize: 15,
  },
  list: { flex: 1 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderBottomWidth: 0.5,
    gap: 10,
  },
  rowCode: {
    fontFamily: Typography.mono,
    fontSize: 14,
    fontWeight: '700',
    width: 48,
  },
  rowName: {
    fontFamily: Typography.serif,
    fontSize: 14,
    flex: 1,
  },
  check: { fontSize: 16 },
});
