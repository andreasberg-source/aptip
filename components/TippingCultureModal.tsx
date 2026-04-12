import React, { useRef, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { ServiceType } from '../data/tippingData';
import { useColors } from '../hooks/useColors';
import { Typography, Radius } from '../constants/Theme';

interface Props {
  visible: boolean;
  country: string;
  initialSection?: ServiceType;
  onClose: () => void;
}

const SECTIONS: { key: ServiceType; emoji: string }[] = [
  { key: 'restaurants', emoji: '🍽️' },
  { key: 'taxis',       emoji: '🚕' },
  { key: 'shops',       emoji: '🛍️' },
  { key: 'services',    emoji: '💇' },
];

export default function TippingCultureModal({ visible, country, initialSection, onClose }: Props) {
  const { t } = useTranslation();
  const C = useColors();
  const scrollRef = useRef<ScrollView>(null);
  const sectionOffsets = useRef<Record<string, number>>({});

  // Scroll to the initialSection when the modal becomes visible
  useEffect(() => {
    if (!visible || !initialSection) return;
    const offset = sectionOffsets.current[initialSection];
    if (offset !== undefined) {
      scrollRef.current?.scrollTo({ y: offset, animated: false });
    }
  }, [visible, initialSection]);

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
          <View style={styles.headerText}>
            <Text style={[styles.title, { color: C.darkSlate }]}>{t('culture.title')}</Text>
            <Text style={[styles.subtitle, { color: C.rust }]}>{country}</Text>
          </View>
          <TouchableOpacity
            onPress={onClose}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Text style={[styles.closeBtn, { color: C.rust }]}>✕</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.body}
          showsVerticalScrollIndicator={false}
        >
          {/* General overview */}
          {(() => {
            const general = t(`culture.countries.${country}.general`, { defaultValue: '' });
            if (!general) return null;
            return (
              <View style={[styles.section, { backgroundColor: C.white, borderColor: C.lightBorder }]}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.emoji}>ℹ️</Text>
                  <Text style={[styles.sectionTitle, { color: C.sage }]}>
                    {t('culture.overview')}
                  </Text>
                </View>
                <Text style={[styles.sectionText, { color: C.darkSlate }]}>{general}</Text>
              </View>
            );
          })()}

          {SECTIONS.map(({ key, emoji }) => {
            const text = t(`culture.countries.${country}.${key}`, { defaultValue: '' });
            if (!text) return null;
            const isActive = key === initialSection;
            return (
              <View
                key={key}
                onLayout={(e) => {
                  sectionOffsets.current[key] = e.nativeEvent.layout.y;
                }}
                style={[
                  styles.section,
                  { backgroundColor: C.white, borderColor: C.lightBorder },
                  isActive && { borderColor: C.rust },
                ]}
              >
                <View style={styles.sectionHeader}>
                  <Text style={styles.emoji}>{emoji}</Text>
                  <Text style={[styles.sectionTitle, { color: isActive ? C.rust : C.sage }]}>
                    {t(`culture.${key}`)}
                  </Text>
                </View>
                <Text style={[styles.sectionText, { color: C.darkSlate }]}>{text}</Text>
              </View>
            );
          })}
        </ScrollView>
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
  headerText: { flex: 1 },
  title: {
    fontFamily: Typography.serif,
    fontSize: 18,
    fontWeight: '700',
  },
  subtitle: {
    fontFamily: Typography.mono,
    fontSize: 13,
    marginTop: 2,
  },
  closeBtn: {
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 16,
  },
  body: {
    padding: 16,
    gap: 12,
  },
  section: {
    borderWidth: 1.5,
    borderRadius: Radius.md,
    padding: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  emoji: { fontSize: 22 },
  sectionTitle: {
    fontFamily: Typography.serif,
    fontSize: 15,
    fontWeight: '700',
  },
  sectionText: {
    fontFamily: Typography.mono,
    fontSize: 14,
    lineHeight: 22,
  },
});
