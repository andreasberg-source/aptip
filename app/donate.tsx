import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { useSettingsStore } from '../store/settingsStore';
import { useExchangeRateStore } from '../store/exchangeRateStore';
import { useColors } from '../hooks/useColors';
import { Typography, Radius, Spacing } from '../constants/Theme';

type DonationLevel = 'poor' | 'ok' | 'excellent' | 'custom';

const AMOUNTS: Record<Exclude<DonationLevel, 'custom'>, number> = {
  poor: 0,
  ok: 5.99,
  excellent: 9.99,
};

const OPTIONS: Array<{ key: DonationLevel; emoji: string; labelKey: string }> = [
  { key: 'poor',      emoji: '😕', labelKey: 'donate.notReally' },
  { key: 'ok',        emoji: '🙂', labelKey: 'donate.likeIt' },
  { key: 'excellent', emoji: '😄', labelKey: 'donate.loveIt' },
  { key: 'custom',    emoji: '✏️', labelKey: 'donate.custom' },
];

export default function DonateScreen() {
  const { t } = useTranslation();
  const C = useColors();
  const { homeCurrency, patch } = useSettingsStore();
  const getHomeAmount = useExchangeRateStore(s => s.getHomeAmount);

  const [level, setLevel] = useState<DonationLevel>('ok');
  const [customInput, setCustomInput] = useState('');
  const [donated, setDonated] = useState(false);

  const amount = level === 'custom'
    ? (parseFloat(customInput.replace(',', '.')) || 0)
    : AMOUNTS[level];

  const isCustomValid = level !== 'custom' || amount >= 5.99;
  const canDonate = level !== 'poor' && isCustomValid && amount > 0;

  const homeAmount = amount > 0 ? getHomeAmount(amount, 'USD', homeCurrency) : null;
  const showHome = homeAmount !== null && homeCurrency !== 'USD';

  const handleDonate = async () => {
    // TODO: Integrate payment processor here (Stripe / RevenueCat / in-app purchase)
    // e.g. await Purchases.purchaseProduct('remove_ads');
    // For now: mark as donated directly
    await patch({ hasDonated: true });
    setDonated(true);
    setTimeout(() => router.back(), 1400);
  };

  if (donated) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: C.cream }]}>
        <View style={styles.thankYouContainer}>
          <Text style={[styles.thankYouEmoji]}>🎉</Text>
          <Text style={[styles.thankYouText, { color: C.darkSlate }]}>{t('donate.thankYou')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.cream }]}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>

        {/* Header */}
        <View style={[styles.header, { borderBottomColor: C.lightBorder, backgroundColor: C.white }]}>
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={() => router.back()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={[styles.closeBtnText, { color: C.rust }]}>✕</Text>
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: C.darkSlate }]}>{t('donate.title')}</Text>
          <View style={styles.closeBtnPlaceholder} />
        </View>

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {/* Subtitle */}
          <Text style={[styles.subtitle, { color: C.sage }]}>{t('donate.subtitle')}</Text>

          {/* Satisfaction selector */}
          <View style={styles.optionsGrid}>
            {OPTIONS.map(opt => {
              const isSelected = level === opt.key;
              const optAmount = opt.key === 'custom' ? null : AMOUNTS[opt.key as Exclude<DonationLevel,'custom'>];
              return (
                <TouchableOpacity
                  key={opt.key}
                  style={[
                    styles.optionBtn,
                    { borderColor: C.lightBorder, backgroundColor: C.cream },
                    isSelected && { backgroundColor: C.rust, borderColor: C.rust },
                  ]}
                  onPress={() => setLevel(opt.key)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.optionEmoji}>{opt.emoji}</Text>
                  <Text style={[styles.optionLabel, { color: isSelected ? '#fff' : C.darkSlate }]}>
                    {t(opt.labelKey)}
                  </Text>
                  {optAmount !== undefined && optAmount !== null && optAmount > 0 && (
                    <Text style={[styles.optionAmount, { color: isSelected ? 'rgba(255,255,255,0.8)' : C.sage }]}>
                      ${optAmount.toFixed(2)}
                    </Text>
                  )}
                  {opt.key === 'poor' && (
                    <Text style={[styles.optionAmount, { color: isSelected ? 'rgba(255,255,255,0.8)' : C.sage }]}>
                      {t('donate.keepAds')}
                    </Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Custom amount input */}
          {level === 'custom' && (
            <View style={styles.customInputWrap}>
              <Text style={[styles.customDollar, { color: C.rust }]}>$</Text>
              <TextInput
                style={[styles.customInput, { borderColor: amount >= 5.99 || !customInput ? C.lightBorder : C.rust, color: C.darkSlate }]}
                value={customInput}
                onChangeText={setCustomInput}
                placeholder="5.99"
                placeholderTextColor={C.sage}
                keyboardType="decimal-pad"
                returnKeyType="done"
                autoFocus
              />
              {!!customInput && amount < 5.99 && (
                <Text style={[styles.minimumNote, { color: C.rust }]}>{t('donate.minimumNote')}</Text>
              )}
            </View>
          )}

          {/* Amount card */}
          <View style={[styles.amountCard, { backgroundColor: C.white, borderColor: C.lightBorder }]}>
            {level === 'poor' ? (
              <>
                <Text style={[styles.amountCardLabel, { color: C.sage }]}>{t('donate.keepAds')}</Text>
                <Text style={[styles.amountCardZero, { color: C.sage }]}>$0</Text>
              </>
            ) : (
              <>
                <Text style={[styles.amountCardLabel, { color: C.sage }]}>
                  {level === 'custom' ? t('donate.custom') : t(OPTIONS.find(o => o.key === level)!.labelKey)}
                </Text>
                <Text style={[styles.amountCardValue, { color: C.rust }]}>
                  {amount > 0 ? `$${amount.toFixed(2)}` : '—'}
                </Text>
                {showHome && (
                  <Text style={[styles.amountCardHome, { color: C.sage }]}>
                    ({Math.round(homeAmount!)} {homeCurrency})
                  </Text>
                )}
              </>
            )}
          </View>

          {/* CTAs */}
          {level !== 'poor' ? (
            <TouchableOpacity
              style={[styles.donateCta, { backgroundColor: canDonate ? C.rust : C.lightBorder }]}
              onPress={handleDonate}
              disabled={!canDonate}
              activeOpacity={0.85}
            >
              <Text style={styles.donateCtaText}>
                {canDonate
                  ? t('donate.donateCta', { amount: `$${amount.toFixed(2)}` })
                  : t('donate.donateCta', { amount: '—' })}
              </Text>
            </TouchableOpacity>
          ) : null}

          <TouchableOpacity
            style={styles.continueBtn}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Text style={[styles.continueBtnText, { color: C.sage }]}>{t('donate.continueAds')}</Text>
          </TouchableOpacity>

          {/* Tagline */}
          <Text style={[styles.tagline, { color: C.sage }]}>{t('donate.tagline')}</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderBottomWidth: 1,
  },
  closeBtn: { width: 36, alignItems: 'center' },
  closeBtnText: { fontSize: 18, fontWeight: '600' },
  closeBtnPlaceholder: { width: 36 },
  headerTitle: {
    flex: 1,
    fontFamily: Typography.serif,
    fontWeight: '700',
    fontSize: 17,
    textAlign: 'center',
  },
  content: {
    padding: Spacing.lg,
    paddingBottom: 40,
    alignItems: 'center',
  },
  subtitle: {
    fontFamily: Typography.serif,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
    marginTop: 4,
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
    marginBottom: 20,
    width: '100%',
  },
  optionBtn: {
    width: '46%',
    borderWidth: 1.5,
    borderRadius: Radius.md,
    paddingVertical: 14,
    paddingHorizontal: 10,
    alignItems: 'center',
    gap: 4,
  },
  optionEmoji: { fontSize: 26 },
  optionLabel: { fontFamily: Typography.serif, fontWeight: '600', fontSize: 13, textAlign: 'center' },
  optionAmount: { fontFamily: Typography.mono, fontSize: 11, textAlign: 'center' },
  customInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 16,
    width: '100%',
  },
  customDollar: {
    fontFamily: Typography.mono,
    fontSize: 26,
    fontWeight: '700',
  },
  customInput: {
    flex: 1,
    borderWidth: 2,
    borderRadius: Radius.sm,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontFamily: Typography.mono,
    fontSize: 26,
  },
  minimumNote: {
    fontFamily: Typography.mono,
    fontSize: 11,
    position: 'absolute',
    bottom: -18,
    left: 36,
  },
  amountCard: {
    width: '100%',
    borderWidth: 1.5,
    borderRadius: Radius.md,
    paddingVertical: 20,
    paddingHorizontal: 16,
    alignItems: 'center',
    marginBottom: 20,
    gap: 4,
  },
  amountCardLabel: { fontFamily: Typography.mono, fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 },
  amountCardValue: { fontFamily: Typography.mono, fontSize: 38, fontWeight: '700' },
  amountCardZero: { fontFamily: Typography.mono, fontSize: 38, fontWeight: '700' },
  amountCardHome: { fontFamily: Typography.mono, fontSize: 14 },
  donateCta: {
    width: '100%',
    paddingVertical: 15,
    borderRadius: Radius.md,
    alignItems: 'center',
    marginBottom: 10,
  },
  donateCtaText: { fontFamily: Typography.mono, fontSize: 15, fontWeight: '700', color: '#fff' },
  continueBtn: {
    paddingVertical: 12,
    marginBottom: 20,
  },
  continueBtnText: { fontFamily: Typography.mono, fontSize: 13 },
  tagline: {
    fontFamily: Typography.serif,
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
    opacity: 0.7,
  },
  thankYouContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  thankYouEmoji: { fontSize: 56 },
  thankYouText: { fontFamily: Typography.serif, fontWeight: '700', fontSize: 20, textAlign: 'center' },
});
