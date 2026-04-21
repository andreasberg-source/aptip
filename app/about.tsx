import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Image,
  Linking,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { useColors } from '../hooks/useColors';
import { Typography, Radius, Spacing } from '../constants/Theme';

export default function AboutScreen() {
  const { t } = useTranslation();
  const C = useColors();
  const [feedbackVisible, setFeedbackVisible] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');

  const handleSendFeedback = () => {
    const body = encodeURIComponent(feedbackText.trim());
    Linking.openURL(
      `mailto:andreas.berg@gmail.com?subject=Aptip%20Feedback&body=${body}`
    );
    setFeedbackVisible(false);
    setFeedbackText('');
  };

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
        <Text style={[styles.title, { color: C.darkSlate }]}>{t('about.title')}</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        {/* Logo */}
        <View style={styles.logoWrap}>
          <Image
            source={require('../assets/images/logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

        {/* Description */}
        <View style={[styles.card, { backgroundColor: C.white, borderColor: C.lightBorder }]}>
          <Text style={[styles.cardText, { color: C.darkSlate }]}>{t('about.description')}</Text>
        </View>

        {/* Feedback */}
        <View style={[styles.card, { backgroundColor: C.white, borderColor: C.lightBorder }]}>
          <Text style={[styles.cardTitle, { color: C.darkSlate }]}>{t('about.feedbackTitle')}</Text>
          <Text style={[styles.cardText, { color: C.sage }]}>{t('about.feedbackBody')}</Text>
          <TouchableOpacity
            style={[styles.feedbackBtn, { backgroundColor: C.rust }]}
            onPress={() => setFeedbackVisible(true)}
            activeOpacity={0.8}
          >
            <Text style={styles.feedbackBtnText}>{t('about.feedbackBtn')}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Feedback modal */}
      <Modal
        visible={feedbackVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setFeedbackVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={[styles.modalSheet, { backgroundColor: C.white }]}>
            <Text style={[styles.modalTitle, { color: C.darkSlate }]}>
              {t('about.feedbackFormTitle')}
            </Text>
            <TextInput
              style={[
                styles.feedbackInput,
                { backgroundColor: C.cream, borderColor: C.lightBorder, color: C.darkSlate },
              ]}
              placeholder={t('about.feedbackPlaceholder')}
              placeholderTextColor={C.sage}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
              value={feedbackText}
              onChangeText={setFeedbackText}
              autoFocus
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.cancelBtn, { borderColor: C.lightBorder }]}
                onPress={() => {
                  setFeedbackVisible(false);
                  setFeedbackText('');
                }}
              >
                <Text style={[styles.cancelBtnText, { color: C.darkSlate }]}>{t('cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalBtn,
                  styles.sendBtn,
                  { backgroundColor: feedbackText.trim() ? C.rust : C.sage },
                ]}
                onPress={handleSendFeedback}
                disabled={!feedbackText.trim()}
              >
                <Text style={styles.sendBtnText}>{t('about.feedbackSend')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
  body: { padding: 20, gap: 16 },
  logoWrap: { alignItems: 'center', paddingVertical: 12 },
  logo: { width: 200, height: 60 },
  card: {
    borderWidth: 1.5,
    borderRadius: Radius.sm,
    padding: 16,
    gap: 8,
  },
  cardTitle: {
    fontFamily: Typography.serif,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  cardText: {
    fontFamily: Typography.mono,
    fontSize: 14,
    lineHeight: 22,
  },
  feedbackBtn: {
    marginTop: 8,
    paddingVertical: 12,
    borderRadius: Radius.sm,
    alignItems: 'center',
  },
  feedbackBtnText: {
    fontFamily: Typography.mono,
    fontSize: 13,
    color: '#fff',
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  modalSheet: {
    borderTopLeftRadius: Radius.lg,
    borderTopRightRadius: Radius.lg,
    padding: Spacing.lg,
    gap: Spacing.md,
    paddingBottom: 32,
  },
  modalTitle: {
    fontFamily: Typography.serif,
    fontSize: 17,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 4,
  },
  feedbackInput: {
    borderWidth: 1.5,
    borderRadius: Radius.sm,
    padding: 12,
    fontFamily: Typography.mono,
    fontSize: 14,
    lineHeight: 22,
    minHeight: 140,
  },
  modalActions: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: Radius.md,
    alignItems: 'center',
  },
  cancelBtn: {
    borderWidth: 1.5,
  },
  cancelBtnText: {
    fontFamily: Typography.mono,
    fontSize: 14,
    fontWeight: '600',
  },
  sendBtn: {},
  sendBtnText: {
    fontFamily: Typography.mono,
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
});
