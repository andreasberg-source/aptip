import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { useSettingsStore } from '../store/settingsStore';
import { useExchangeRateStore } from '../store/exchangeRateStore';
import { useColors } from '../hooks/useColors';
import { Typography, Radius, Spacing } from '../constants/Theme';

type PurchaseLevel = 'poor' | 'ok' | 'excellent';

const AMOUNTS: Record<PurchaseLevel, number> = {
  poor: 0,
  ok: 5.99,
  excellent: 9.99,
};

const OPTIONS: Array<{ key: PurchaseLevel; emoji: string; labelKey: string }> = [
  { key: 'poor',      emoji: '😕', labelKey: 'donate.notReally' },
  { key: 'ok',        emoji: '🙂', labelKey: 'donate.likeIt' },
  { key: 'excellent', emoji: '😄', labelKey: 'donate.loveIt' },
];

export default function DonateScreen() {
  const { t } = useTranslation();
  const C = useColors();
  const { homeCurrency, patch } = useSettingsStore();
  const getHomeAmount = useExchangeRateStore(s => s.getHomeAmount);

  const [level, setLevel] = useState<PurchaseLevel>('ok');
  const [purchased, setPurchased] = useState(false);

  const amount = AMOUNTS[level];
  const homeAmount = amount > 0 ? getHomeAmount(amount, 'USD', homeCurrency) : null;
  const showHome = homeAmount !== null && homeCurrency !== 'USD';

  const handlePurchase = async () => {
    // TODO: Integrate RevenueCat / in-app purchase here
    // e.g. await Purchases.purchaseProduct('remove_ads');
    await patch({ adsRemoved: true });
    setPurchased(true);
    setTimeout(() => router.back(), 1400);
  };

  if (purchased) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: C.cream }]}>
        <View style={styles.thankYouContainer}>
          <Text style={styles.thankYouEmoji}>🎉</Text>
          <Text style={[styles.thankYouText, { color: C.darkSlate }]}>{t('donate.thankYou')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.cream }]}>
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

      <ScrollView contentContainerStyle={styles.content}>
        {/* Subtitle */}
        <Text style={[styles.subtitle, { color: C.sage }]}>{t('donate.subtitle')}</Text>

        {/* Three-option row */}
        <View style={styles.optionsRow}>
          {OPTIONS.map(opt => {
            const isSelected = level === opt.key;
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
                <Text style={[styles.optionAmount, { color: isSelected ? 'rgba(255,255,255,0.75)' : C.sage }]}>
                  {AMOUNTS[opt.key] > 0 ? `$${AMOUNTS[opt.key].toFixed(2)}` : t('donate.keepAds')}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

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
                {t(OPTIONS.find(o => o.key === level)!.labelKey)}
              </Text>
              <Text style={[styles.amountCardValue, { color: C.rust }]}>
                ${amount.toFixed(2)}
              </Text>
              {showHome && (
                <Text style={[styles.amountCardHome, { color: C.sage }]}>
                  ({Math.round(homeAmount!)} {homeCurrency})
                </Text>
              )}
            </>
          )}
        </View>

        {/* CTA */}
        {level !== 'poor' ? (
          <TouchableOpacity
            style={[styles.unlockCta, { backgroundColor: C.rust }]}
            onPress={handlePurchase}
            activeOpacity={0.85}
          >
            <Text style={styles.unlockCtaText}>
              {t('donate.unlockCta', { amount: `$${amount.toFixed(2)}` })}
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
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
  optionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
    width: '100%',
  },
  optionBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: Radius.md,
    paddingVertical: 14,
    paddingHorizontal: 6,
    alignItems: 'center',
    gap: 4,
  },
  optionEmoji: { fontSize: 26 },
  optionLabel: { fontFamily: Typography.serif, fontWeight: '600', fontSize: 12, textAlign: 'center' },
  optionAmount: { fontFamily: Typography.mono, fontSize: 11, textAlign: 'center' },
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
  unlockCta: {
    width: '100%',
    paddingVertical: 15,
    borderRadius: Radius.md,
    alignItems: 'center',
    marginBottom: 10,
  },
  unlockCtaText: { fontFamily: Typography.mono, fontSize: 15, fontWeight: '700', color: '#fff' },
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
