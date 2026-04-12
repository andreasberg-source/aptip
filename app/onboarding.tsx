import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import * as Localization from 'expo-localization';

import { useSettingsStore } from '../store/settingsStore';
import { SORTED_CURRENCIES, detectCurrencyFromLocale } from '../data/currencies';
import { Colors, Typography, Radius } from '../constants/Theme';
import i18n, { changeLanguage, supportedLanguages } from '../i18n';

function getDetectedCurrency(): string {
  const locale = Localization.getLocales()[0];
  return detectCurrencyFromLocale(locale?.currencyCode);
}

export default function OnboardingScreen() {
  const { t } = useTranslation();
  const { patch } = useSettingsStore();

  const [userName, setUserName] = useState('');
  const [selectedCurrency, setSelectedCurrency] = useState(getDetectedCurrency);
  const [search, setSearch] = useState('');
  const [currentLang, setCurrentLang] = useState(i18n.language);

  const handleLanguageChange = async (code: string) => {
    await changeLanguage(code as Parameters<typeof changeLanguage>[0]);
    setCurrentLang(code);
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return SORTED_CURRENCIES;
    return SORTED_CURRENCIES.filter(
      (c) => c.code.toLowerCase().includes(q) || c.name.toLowerCase().includes(q),
    );
  }, [search]);

  const handleGetStarted = async () => {
    await patch({
      userName: userName.trim(),
      homeCurrency: selectedCurrency,
      hasOnboarded: true,
    });
    router.replace('/(tabs)/');
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={styles.header}>
          <Image
            source={require('../assets/images/logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.subtitle}>{t('onboarding.subtitle')}</Text>
        </View>

        {/* Name */}
        <View style={styles.section}>
          <Text style={styles.label}>{t('onboarding.nameLabel')}</Text>
          <TextInput
            style={styles.input}
            value={userName}
            onChangeText={setUserName}
            placeholder={t('onboarding.namePlaceholder')}
            placeholderTextColor={Colors.sage}
            autoCapitalize="words"
            returnKeyType="done"
          />
        </View>

        {/* Language */}
        <View style={styles.section}>
          <Text style={styles.label}>{t('settings.language')}</Text>
          <View style={styles.langGrid}>
            {supportedLanguages.map((lang) => (
              <TouchableOpacity
                key={lang.code}
                style={[
                  styles.langBtn,
                  currentLang === lang.code && styles.langBtnActive,
                ]}
                onPress={() => handleLanguageChange(lang.code)}
                activeOpacity={0.7}
              >
                <Text style={styles.langFlag}>{lang.flag}</Text>
                <Text style={[styles.langLabel, currentLang === lang.code && styles.langLabelActive]}>
                  {lang.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Currency */}
        <View style={[styles.section, styles.currencySection]}>
          <Text style={styles.label}>{t('onboarding.currencyLabel')}</Text>
          <Text style={styles.hint}>{t('onboarding.currencyHint')}</Text>

          <TextInput
            style={[styles.input, styles.searchInput]}
            value={search}
            onChangeText={setSearch}
            placeholder={t('onboarding.searchPlaceholder')}
            placeholderTextColor={Colors.sage}
            autoCapitalize="none"
            autoCorrect={false}
            clearButtonMode="while-editing"
          />

          <FlatList
            data={filtered}
            keyExtractor={(item) => item.code}
            style={styles.list}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => {
              const active = item.code === selectedCurrency;
              return (
                <TouchableOpacity
                  style={[styles.currencyRow, active && styles.currencyRowActive]}
                  onPress={() => setSelectedCurrency(item.code)}
                  activeOpacity={0.7}
                >
                  <View style={styles.currencyRowInner}>
                    <Text style={[styles.currencyCode, active && styles.currencyCodeActive]}>
                      {item.code}
                    </Text>
                    <Text style={[styles.currencyName, active && styles.currencyNameActive]}>
                      {item.name}
                    </Text>
                  </View>
                  {active && <Text style={styles.checkmark}>✓</Text>}
                </TouchableOpacity>
              );
            }}
          />
        </View>

        {/* CTA */}
        <View style={styles.footer}>
          <TouchableOpacity style={styles.btn} onPress={handleGetStarted} activeOpacity={0.85}>
            <Text style={styles.btnText}>{t('onboarding.getStarted')}</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.cream },
  flex: { flex: 1 },
  header: {
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 20,
    borderBottomWidth: 2,
    borderBottomColor: Colors.sage,
  },
  logo: {
    width: 220,
    height: 65,
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: Typography.mono,
    fontSize: 12,
    color: Colors.sage,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  section: {
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  currencySection: {
    flex: 1,
    paddingBottom: 0,
  },
  label: {
    fontFamily: Typography.serif,
    fontWeight: '600',
    fontSize: 15,
    color: Colors.darkSlate,
    marginBottom: 6,
  },
  hint: {
    fontFamily: Typography.mono,
    fontSize: 11,
    color: Colors.sage,
    marginBottom: 10,
  },
  input: {
    backgroundColor: Colors.white,
    borderWidth: 2,
    borderColor: Colors.lightBorder,
    borderRadius: Radius.sm,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: Typography.mono,
    fontSize: 16,
    color: Colors.darkSlate,
    marginBottom: 12,
  },
  searchInput: {
    marginBottom: 8,
  },
  list: {
    flex: 1,
    borderWidth: 2,
    borderColor: Colors.lightBorder,
    borderRadius: Radius.sm,
    backgroundColor: Colors.white,
  },
  currencyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.lightBorder,
  },
  currencyRowActive: {
    backgroundColor: Colors.rustTransparent,
  },
  currencyRowInner: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  currencyCode: {
    fontFamily: Typography.mono,
    fontSize: 14,
    fontWeight: '700',
    color: Colors.sage,
    width: 44,
  },
  currencyCodeActive: { color: Colors.rust },
  currencyName: {
    fontFamily: Typography.serif,
    fontSize: 14,
    color: Colors.darkSlate,
    flex: 1,
  },
  currencyNameActive: { color: Colors.rust, fontWeight: '600' },
  checkmark: { fontSize: 16, color: Colors.rust },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: Colors.lightBorder,
  },
  btn: {
    backgroundColor: Colors.rust,
    borderRadius: Radius.sm,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: Colors.rustShadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 4,
  },
  btnText: {
    fontFamily: Typography.mono,
    fontSize: 15,
    fontWeight: '600',
    color: Colors.white,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  langGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  langBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 2,
    borderColor: Colors.lightBorder,
    borderRadius: Radius.sm,
    backgroundColor: Colors.white,
  },
  langBtnActive: {
    borderColor: Colors.rust,
    backgroundColor: Colors.rustTransparent,
  },
  langFlag: { fontSize: 18 },
  langLabel: {
    fontFamily: Typography.mono,
    fontSize: 13,
    color: Colors.darkSlate,
  },
  langLabelActive: {
    fontWeight: '700',
    color: Colors.rust,
  },
});
