import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { useColors } from '../hooks/useColors';
import { Typography, Radius } from '../constants/Theme';

const STEPS = [
  'step1', 'step2', 'step3', 'step4',
  'step5', 'step6', 'step7', 'step8',
] as const;

export default function HelpScreen() {
  const { t } = useTranslation();
  const C = useColors();

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.cream }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: C.lightBorder }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          style={styles.backBtn}
        >
          <Text style={[styles.backText, { color: C.rust }]}>‹</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: C.darkSlate }]}>{t('help.title')}</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <Text style={[styles.intro, { color: C.sage }]}>{t('help.intro')}</Text>

        {STEPS.map((step) => (
          <View
            key={step}
            style={[styles.card, { backgroundColor: C.white, borderColor: C.lightBorder }]}
          >
            <Text style={[styles.stepTitle, { color: C.rust }]}>
              {t(`help.${step}Title`)}
            </Text>
            <Text style={[styles.stepBody, { color: C.darkSlate }]}>
              {t(`help.${step}Body`)}
            </Text>
          </View>
        ))}

        <View style={styles.bottomPad} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  backBtn: { width: 36 },
  backText: { fontSize: 28, fontWeight: '300', lineHeight: 32 },
  title: {
    fontFamily: Typography.serif,
    fontSize: 17,
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
  },
  body: { padding: 20, gap: 12 },
  intro: {
    fontFamily: Typography.mono,
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 4,
  },
  card: {
    borderWidth: 1.5,
    borderRadius: Radius.sm,
    padding: 14,
    gap: 6,
  },
  stepTitle: {
    fontFamily: Typography.serif,
    fontSize: 14,
    fontWeight: '700',
  },
  stepBody: {
    fontFamily: Typography.mono,
    fontSize: 13,
    lineHeight: 20,
  },
  bottomPad: { height: 20 },
});
