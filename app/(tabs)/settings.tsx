import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Switch,
  Alert,
  TextInput,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';

import { supportedLanguages, changeLanguage, LanguageCode } from '../../i18n';
import { useExchangeRates } from '../../hooks/useExchangeRates';
import { useSettingsStore } from '../../store/settingsStore';
import { useHistoryStore } from '../../store/historyStore';
import { useColors } from '../../hooks/useColors';
import { Typography, Radius } from '../../constants/Theme';
import { CURRENCY_NAMES } from '../../data/currencies';
import i18n from '../../i18n';
import { Satisfaction } from '../../utils/tipCalculations';

const SATISFACTION_OPTIONS: { key: Satisfaction | null; emoji: string }[] = [
  { key: null,        emoji: '—' },
  { key: 'poor',      emoji: '😕' },
  { key: 'ok',        emoji: '🙂' },
  { key: 'excellent', emoji: '😄' },
];

export default function SettingsScreen() {
  const { t } = useTranslation();
  const C = useColors();
  const { updateRates, isLoading, lastUpdated, error } = useExchangeRates();
  const {
    userName, homeCurrency, defaultPeople, defaultSatisfaction,
    keepScreenAwake, darkMode, patch,
  } = useSettingsStore();
  const clearAll = useHistoryStore((s) => s.clearAll);

  const currentLang = i18n.language as LanguageCode;
  const currentLangLabel = supportedLanguages.find((l) => l.code === currentLang)?.label ?? '';

  const handleUpdateRates = async () => { await updateRates(); };

  const ratesStatus = (() => {
    if (isLoading) return t('settings.ratesLoading');
    if (error) return t('settings.ratesError');
    if (lastUpdated) return t('settings.ratesUpdated', { time: lastUpdated, count: '' }).trim();
    return t('settings.ratesDefault');
  })();

  const handleClearHistory = () => {
    Alert.alert(
      t('settings.clearHistory'),
      t('settings.clearHistoryConfirm'),
      [
        { text: t('history.delete'), style: 'destructive', onPress: () => clearAll() },
        { text: 'Cancel', style: 'cancel' },
      ],
    );
  };

  const s = makeStyles(C);

  return (
    <ScrollView style={[s.flex, { backgroundColor: C.cream }]} contentContainerStyle={s.container}>
      <View style={[s.header, { borderBottomColor: C.sage }]}>
        <Text style={[s.title, { color: C.darkSlate }]}>{t('settings.title')}</Text>
      </View>

      {/* ── Profile ──────────────────────────────────────── */}
      <SectionHeader label={t('settings.profileSection')} C={C} />

      <View style={[s.section, { borderBottomColor: C.lightBorder }]}>
        <Text style={[s.label, { color: C.darkSlate }]}>{t('settings.homeCurrency')}</Text>
        <TouchableOpacity
          style={[s.valueBtn, { backgroundColor: C.white, borderColor: C.lightBorder }]}
          onPress={() => router.push('/currency-picker')}
          activeOpacity={0.7}
        >
          <Text style={[s.valueBtnCode, { color: C.rust }]}>{homeCurrency}</Text>
          <Text style={[s.valueBtnName, { color: C.darkSlate }]}>
            {CURRENCY_NAMES[homeCurrency] ?? homeCurrency}
          </Text>
          <Text style={[s.chevron, { color: C.sage }]}>›</Text>
        </TouchableOpacity>
      </View>

      {/* ── Defaults ─────────────────────────────────────── */}
      <SectionHeader label={t('settings.defaultsSection')} C={C} />

      {/* Default people — compact stepper row */}
      <View style={[s.compactRow, { borderBottomColor: C.lightBorder }]}>
        <Text style={[s.rowLabel, { color: C.darkSlate }]}>{t('settings.defaultPeople')}</Text>
        <View style={s.miniStepperRow}>
          <TouchableOpacity
            style={[s.miniStepper, { backgroundColor: C.sage }, defaultPeople <= 1 && s.stepperDisabled]}
            onPress={() => patch({ defaultPeople: Math.max(1, defaultPeople - 1) })}
            disabled={defaultPeople <= 1}
          >
            <Text style={s.miniStepperText}>−</Text>
          </TouchableOpacity>
          <Text style={[s.miniStepperValue, { color: C.darkSlate }]}>{defaultPeople}</Text>
          <TouchableOpacity
            style={[s.miniStepper, { backgroundColor: C.sage }, defaultPeople >= 20 && s.stepperDisabled]}
            onPress={() => patch({ defaultPeople: Math.min(20, defaultPeople + 1) })}
            disabled={defaultPeople >= 20}
          >
            <Text style={s.miniStepperText}>+</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Default satisfaction — single horizontal row */}
      <View style={[s.section, { borderBottomColor: C.lightBorder }]}>
        <Text style={[s.label, { color: C.darkSlate }]}>{t('settings.defaultSatisfaction')}</Text>
        <View style={s.satisfactionRow}>
          {SATISFACTION_OPTIONS.map(({ key, emoji }) => {
            const active = defaultSatisfaction === key;
            return (
              <TouchableOpacity
                key={String(key)}
                style={[
                  s.satisfactionChip,
                  { backgroundColor: C.cream },
                  active && { backgroundColor: C.rust },
                ]}
                onPress={() => patch({ defaultSatisfaction: key })}
                activeOpacity={0.7}
              >
                <Text style={[s.satisfactionChipText, { color: C.darkSlate }, active && { color: '#fff' }]}>
                  {emoji}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* ── App ──────────────────────────────────────────── */}
      <SectionHeader label={t('settings.appSection')} C={C} />

      <View style={[s.section, { borderBottomColor: C.lightBorder }]}>
        <View style={s.togglesRow}>
          <View style={s.toggleCard}>
            <Text style={[s.toggleLabel, { color: C.darkSlate }]}>{t('settings.keepScreenAwake')}</Text>
            <Switch
              value={keepScreenAwake}
              onValueChange={(v) => patch({ keepScreenAwake: v })}
              trackColor={{ false: C.lightBorder, true: C.rust }}
              thumbColor={C.white}
            />
          </View>
          <View style={[s.toggleDivider, { backgroundColor: C.lightBorder }]} />
          <View style={s.toggleCard}>
            <Text style={[s.toggleLabel, { color: C.darkSlate }]}>{t('settings.darkMode')}</Text>
            <Switch
              value={darkMode}
              onValueChange={(v) => patch({ darkMode: v })}
              trackColor={{ false: C.lightBorder, true: C.rust }}
              thumbColor={C.white}
            />
          </View>
        </View>
      </View>

      {/* ── Language ─────────────────────────────────────── */}
      <SectionHeader label={t('settings.language')} C={C} />

      <View style={[s.section, { borderBottomColor: C.lightBorder }]}>
        <View style={s.langRow}>
          {supportedLanguages.map((lang) => (
            <TouchableOpacity
              key={lang.code}
              style={[
                s.flagBtn,
                { backgroundColor: C.white, borderColor: C.lightBorder },
                currentLang === lang.code && { borderColor: C.rust, backgroundColor: C.rustTransparent },
              ]}
              onPress={() => changeLanguage(lang.code)}
              activeOpacity={0.7}
            >
              <Text style={s.flagEmoji}>{lang.flag}</Text>
            </TouchableOpacity>
          ))}
          <Text style={[s.selectedLang, { color: C.darkSlate }]}>{currentLangLabel}</Text>
        </View>
      </View>

      {/* ── Exchange rates ───────────────────────────────── */}
      <SectionHeader label={t('settings.rates')} C={C} />

      <View style={[s.section, { borderBottomColor: C.lightBorder }]}>
        <TouchableOpacity
          style={[s.updateBtn, { backgroundColor: C.sage }, isLoading && s.updateBtnDisabled]}
          onPress={handleUpdateRates}
          disabled={isLoading}
          activeOpacity={0.75}
        >
          <Text style={s.updateBtnText}>
            {isLoading ? t('settings.ratesLoading') : t('settings.rates')}
          </Text>
        </TouchableOpacity>
        <Text style={[s.ratesStatus, { color: C.sage }, !!error && { color: C.rust }]}>
          {ratesStatus}
        </Text>
      </View>

      {/* ── Your name ───────────────────────────────────── */}
      <SectionHeader label={t('settings.profileSection')} C={C} />

      <View style={[s.section, { borderBottomColor: C.lightBorder }]}>
        <Text style={[s.label, { color: C.darkSlate }]}>{t('settings.userName')}</Text>
        <TextInput
          style={[s.input, { backgroundColor: C.white, borderColor: C.lightBorder, color: C.darkSlate }]}
          value={userName}
          onChangeText={(v) => patch({ userName: v })}
          placeholder={t('settings.userNamePlaceholder')}
          placeholderTextColor={C.sage}
          autoCapitalize="words"
          returnKeyType="done"
        />
      </View>

      {/* ── Data ─────────────────────────────────────────── */}
      <SectionHeader label={t('settings.dangerSection')} C={C} />

      <View style={[s.section, { borderBottomColor: C.lightBorder }]}>
        <TouchableOpacity
          style={[s.dangerBtn, { borderColor: C.rust }]}
          onPress={handleClearHistory}
          activeOpacity={0.7}
        >
          <Text style={[s.dangerBtnText, { color: C.rust }]}>{t('settings.clearHistory')}</Text>
        </TouchableOpacity>
      </View>

      {/* ── About & Help ──────────────────────────────────── */}
      <View style={s.bottomLinks}>
        <TouchableOpacity
          style={[s.bottomLinkBtn, { backgroundColor: C.white, borderColor: C.lightBorder }]}
          onPress={() => router.push('/about')}
          activeOpacity={0.7}
        >
          <Text style={s.bottomLinkEmoji}>ℹ️</Text>
          <Text style={[s.bottomLinkText, { color: C.darkSlate }]}>{t('about.title')}</Text>
          <Text style={[s.chevron, { color: C.sage }]}>›</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.bottomLinkBtn, { backgroundColor: C.white, borderColor: C.lightBorder }]}
          onPress={() => router.push('/help')}
          activeOpacity={0.7}
        >
          <Text style={s.bottomLinkEmoji}>❓</Text>
          <Text style={[s.bottomLinkText, { color: C.darkSlate }]}>{t('help.title')}</Text>
          <Text style={[s.chevron, { color: C.sage }]}>›</Text>
        </TouchableOpacity>
      </View>

      <View style={s.bottomPad} />
    </ScrollView>
  );
}

function SectionHeader({ label, C }: { label: string; C: any }) {
  return (
    <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 4 }}>
      <Text style={{ fontFamily: Typography.mono, fontSize: 11, color: C.sage, textTransform: 'uppercase', letterSpacing: 1.5 }}>
        {label}
      </Text>
    </View>
  );
}

const makeStyles = (C: any) => StyleSheet.create({
  flex: { flex: 1 },
  container: { paddingBottom: 40 },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
    borderBottomWidth: 2,
  },
  title: {
    fontFamily: Typography.serif,
    fontSize: 22,
    fontWeight: '700',
  },
  section: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  // Compact inline row (label left, control right)
  compactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  rowLabel: {
    fontFamily: Typography.serif,
    fontSize: 15,
    flex: 1,
  },
  label: {
    fontFamily: Typography.serif,
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    borderWidth: 2,
    borderRadius: Radius.sm,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontFamily: Typography.mono,
    fontSize: 15,
  },
  valueBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderRadius: Radius.sm,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  valueBtnCode: {
    fontFamily: Typography.mono,
    fontSize: 16,
    fontWeight: '700',
    width: 44,
  },
  valueBtnName: {
    fontFamily: Typography.serif,
    fontSize: 15,
    flex: 1,
  },
  chevron: {
    fontFamily: Typography.serif,
    fontSize: 22,
  },
  // Mini stepper (inline)
  miniStepperRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  miniStepper: {
    width: 32,
    height: 32,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperDisabled: { opacity: 0.35 },
  miniStepperText: { color: '#fff', fontSize: 18, fontWeight: '600', lineHeight: 22 },
  miniStepperValue: {
    fontFamily: Typography.mono,
    fontSize: 15,
    minWidth: 24,
    textAlign: 'center',
  },
  // Side-by-side toggles
  togglesRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  toggleCard: {
    flex: 1,
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
  },
  toggleLabel: {
    fontFamily: Typography.serif,
    fontSize: 13,
    textAlign: 'center',
  },
  toggleDivider: {
    width: 1,
    height: 48,
  },
  // Satisfaction chips (single row, emoji only)
  satisfactionRow: { flexDirection: 'row', gap: 8 },
  satisfactionChip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  satisfactionChipText: {
    fontFamily: Typography.serif,
    fontSize: 18,
  },
  // Language flags
  langRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  flagBtn: {
    width: 40,
    height: 36,
    borderWidth: 2,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flagEmoji: { fontSize: 20 },
  selectedLang: {
    fontFamily: Typography.serif,
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
    flex: 1,
  },
  // Exchange rates
  updateBtn: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: Radius.sm,
    alignItems: 'center',
    marginBottom: 8,
  },
  updateBtnDisabled: { opacity: 0.5 },
  updateBtnText: {
    fontFamily: Typography.mono,
    fontSize: 13,
    color: '#fff',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  ratesStatus: { fontFamily: Typography.mono, fontSize: 12, textAlign: 'center' },
  // Danger
  dangerBtn: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderWidth: 2,
    borderRadius: Radius.sm,
    alignItems: 'center',
  },
  dangerBtnText: {
    fontFamily: Typography.mono,
    fontSize: 13,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  // Bottom links
  bottomLinks: {
    paddingHorizontal: 20,
    paddingTop: 20,
    gap: 10,
  },
  bottomLinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1.5,
    borderRadius: Radius.sm,
  },
  bottomLinkEmoji: { fontSize: 18 },
  bottomLinkText: {
    fontFamily: Typography.serif,
    fontSize: 15,
    flex: 1,
  },
  bottomPad: { height: 20 },
});
