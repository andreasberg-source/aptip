import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { useSettingsStore } from '../store/settingsStore';
import { Colors, Typography } from '../constants/Theme';

// ─── Ad source configuration ─────────────────────────────────────────────────
// Switch ACTIVE_AD_SOURCE to 'admob' or 'affiliate' when ready.
type AdSource = 'self-promo' | 'admob' | 'affiliate';
const ACTIVE_AD_SOURCE: AdSource = 'self-promo';

// Future AdMob config:
// const ADMOB_UNIT_ID = 'ca-app-pub-XXXXXXXX/XXXXXXXX';
// Install: npx expo install react-native-google-mobile-ads

// Future affiliate config:
// const AFFILIATE_URL = 'https://...';
// const AFFILIATE_IMAGE = require('../assets/images/affiliate-banner.png');

// ─── Banner content per source ────────────────────────────────────────────────

function SelfPromoBanner() {
  return (
    <TouchableOpacity
      style={styles.selfPromo}
      onPress={() => router.push('/donate')}
      activeOpacity={0.85}
    >
      <View style={styles.rustStrip} />
      <Text style={styles.selfPromoText}>
        🧮 Aptip — The best tip calculator on the market! ⭐
      </Text>
      <Text style={styles.removeAdsText}>Remove ads →</Text>
    </TouchableOpacity>
  );
}

function AdMobBanner() {
  // TODO: Replace with AdMob banner when ADMOB_UNIT_ID is available:
  // import { BannerAd, BannerAdSize } from 'react-native-google-mobile-ads';
  // return <BannerAd unitId={ADMOB_UNIT_ID} size={BannerAdSize.BANNER} />;
  return <SelfPromoBanner />;
}

function AffiliateBanner() {
  // TODO: Replace with affiliate banner:
  // return (
  //   <TouchableOpacity onPress={() => Linking.openURL(AFFILIATE_URL)}>
  //     <Image source={AFFILIATE_IMAGE} style={styles.affiliateImage} resizeMode="contain" />
  //   </TouchableOpacity>
  // );
  return <SelfPromoBanner />;
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function AdBanner() {
  const adsRemoved = useSettingsStore(s => s.adsRemoved);
  if (adsRemoved) return null;

  if (ACTIVE_AD_SOURCE === 'admob') return <AdMobBanner />;
  if (ACTIVE_AD_SOURCE === 'affiliate') return <AffiliateBanner />;
  return <SelfPromoBanner />;
}

const styles = StyleSheet.create({
  selfPromo: {
    height: 44,
    backgroundColor: Colors.darkSlate,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    gap: 8,
  },
  rustStrip: {
    width: 3,
    height: 28,
    backgroundColor: Colors.rust,
    borderRadius: 2,
  },
  selfPromoText: {
    flex: 1,
    fontFamily: Typography.mono,
    fontSize: 11,
    color: 'rgba(255,255,255,0.75)',
    letterSpacing: 0.2,
  },
  removeAdsText: {
    fontFamily: Typography.mono,
    fontSize: 10,
    color: Colors.gold,
    letterSpacing: 0.3,
  },
});
