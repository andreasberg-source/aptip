import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { useTripStore } from '../store/tripStore';
import { useSettingsStore } from '../store/settingsStore';
import { useColors } from '../hooks/useColors';
import { Typography, Radius, PARTICIPANT_COLORS } from '../constants/Theme';

interface ParticipantRow {
  key: string;
  name: string;
}

export default function NewTripScreen() {
  const { t } = useTranslation();
  const C = useColors();
  const { createTrip } = useTripStore();
  const { userName, savedParticipantNames, patch: patchSettings } = useSettingsStore();

  const [tripName, setTripName] = useState('');
  const [participants, setParticipants] = useState<ParticipantRow[]>(() => {
    const rows: ParticipantRow[] = [{ key: '1', name: '' }, { key: '2', name: '' }];
    if (userName.trim()) rows[0] = { key: '1', name: userName.trim() };
    return rows;
  });
  const [saving, setSaving] = useState(false);

  const nextKey = useRef(3);

  const addParticipant = useCallback((name = '') => {
    setParticipants(prev => [...prev, { key: String(nextKey.current++), name }]);
  }, []);

  const removeParticipant = useCallback((key: string) => {
    setParticipants(prev => prev.filter(p => p.key !== key));
  }, []);

  const updateParticipant = useCallback((key: string, name: string) => {
    setParticipants(prev => prev.map(p => p.key === key ? { ...p, name } : p));
  }, []);

  const currentNames = participants.map(p => p.name.trim()).filter(Boolean);
  const suggestions = (savedParticipantNames ?? []).filter(
    n => !currentNames.includes(n),
  );

  const canCreate = tripName.trim().length > 0 &&
    participants.filter(p => p.name.trim().length > 0).length >= 2;

  const handleCreate = useCallback(async () => {
    if (!canCreate || saving) return;
    setSaving(true);
    const validParticipants = participants
      .filter(p => p.name.trim().length > 0)
      .map(p => ({ name: p.name.trim() }));

    await createTrip(tripName.trim(), validParticipants);

    // Save participant names for future suggestions (deduplicated)
    const existing = savedParticipantNames ?? [];
    const newNames = validParticipants.map(p => p.name);
    const merged = [...new Set([...existing, ...newNames])];
    await patchSettings({ savedParticipantNames: merged });

    router.back();
  }, [canCreate, saving, participants, tripName, createTrip, savedParticipantNames, patchSettings]);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.cream }]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: C.lightBorder }]}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Text style={[styles.backBtnText, { color: C.rust }]}>✕</Text>
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: C.darkSlate }]}>{t('splitTab.newTrip')}</Text>
          <View style={styles.backBtn} />
        </View>

        <ScrollView style={styles.flex} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {/* Trip name */}
          <Text style={[styles.label, { color: C.darkSlate }]}>{t('splitTab.turnavn')}</Text>
          <TextInput
            style={[styles.input, { backgroundColor: C.white, borderColor: C.lightBorder, color: C.darkSlate }]}
            value={tripName}
            onChangeText={setTripName}
            placeholder={t('splitTab.tripNamePlaceholder')}
            placeholderTextColor={C.sage}
            autoCapitalize="words"
            returnKeyType="done"
          />

          {/* Participants */}
          <Text style={[styles.label, { color: C.darkSlate }]}>{t('splitTab.participants')}</Text>
          <Text style={[styles.hint, { color: C.sage }]}>Min. 2</Text>

          {participants.map((p, idx) => {
            const color = PARTICIPANT_COLORS[idx % PARTICIPANT_COLORS.length];
            return (
              <View key={p.key} style={styles.participantRow}>
                <View style={[styles.colorDot, { backgroundColor: color }]} />
                <TextInput
                  style={[styles.participantInput, { backgroundColor: C.white, borderColor: C.lightBorder, color: C.darkSlate }]}
                  value={p.name}
                  onChangeText={v => updateParticipant(p.key, v)}
                  placeholder={`${t('splitTab.participantName')} ${idx + 1}`}
                  placeholderTextColor={C.sage}
                  autoCapitalize="words"
                  returnKeyType="done"
                />
                {participants.length > 2 && (
                  <TouchableOpacity
                    style={[styles.removeBtn, { backgroundColor: C.cream, borderColor: C.lightBorder }]}
                    onPress={() => removeParticipant(p.key)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Text style={[styles.removeBtnText, { color: C.sage }]}>✕</Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          })}

          {/* Saved name suggestions */}
          {suggestions.length > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.suggestionsScroll}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.suggestionsRow}>
                {suggestions.map(name => (
                  <TouchableOpacity
                    key={name}
                    style={[styles.suggestionChip, { borderColor: C.lightBorder, backgroundColor: C.white }]}
                    onPress={() => addParticipant(name)}
                    onLongPress={() => {
                      Alert.alert(name, t('splitTab.removeSavedName'), [
                        { text: 'Cancel', style: 'cancel' },
                        {
                          text: t('settings.clearSavedName'),
                          style: 'destructive',
                          onPress: async () => {
                            const updated = (savedParticipantNames ?? []).filter(n => n !== name);
                            await patchSettings({ savedParticipantNames: updated });
                          },
                        },
                      ]);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.suggestionChipText, { color: C.darkSlate }]}>+ {name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          )}

          <TouchableOpacity
            style={[styles.addPersonBtn, { borderColor: C.lightBorder }]}
            onPress={() => addParticipant()}
            activeOpacity={0.7}
          >
            <Text style={[styles.addPersonBtnText, { color: C.sage }]}>+ {t('splitTab.addParticipant')}</Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Footer CTA */}
        <View style={[styles.footer, { borderTopColor: C.lightBorder }]}>
          <TouchableOpacity
            style={[styles.createBtn, { backgroundColor: C.rust }, !canCreate && styles.createBtnDisabled]}
            onPress={handleCreate}
            disabled={!canCreate || saving}
            activeOpacity={0.85}
          >
            <Text style={styles.createBtnText}>{t('splitTab.createTrip')}</Text>
          </TouchableOpacity>
        </View>
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
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  backBtn: { width: 36, alignItems: 'center' },
  backBtnText: { fontSize: 18, fontWeight: '600' },
  headerTitle: {
    fontFamily: Typography.serif,
    fontWeight: '700',
    fontSize: 17,
  },
  content: { padding: 20, paddingBottom: 16 },
  label: {
    fontFamily: Typography.serif,
    fontWeight: '600',
    fontSize: 15,
    marginBottom: 8,
    marginTop: 4,
  },
  hint: {
    fontFamily: Typography.mono,
    fontSize: 11,
    marginBottom: 10,
    marginTop: -4,
  },
  input: {
    borderWidth: 1.5,
    borderRadius: Radius.sm,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: Typography.mono,
    fontSize: 16,
    marginBottom: 16,
  },
  participantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  colorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    flexShrink: 0,
  },
  participantInput: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: Radius.sm,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontFamily: Typography.mono,
    fontSize: 15,
  },
  removeBtn: {
    width: 38,
    height: 38,
    borderWidth: 1.5,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeBtnText: { fontSize: 14 },
  suggestionsScroll: { marginBottom: 12 },
  suggestionsRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 2 },
  suggestionChip: {
    borderWidth: 1.5,
    borderRadius: Radius.sm,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  suggestionChipText: { fontFamily: Typography.mono, fontSize: 13 },
  addPersonBtn: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderRadius: Radius.sm,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 6,
  },
  addPersonBtnText: {
    fontFamily: Typography.mono,
    fontSize: 13,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
  },
  createBtn: {
    borderRadius: Radius.sm,
    paddingVertical: 14,
    alignItems: 'center',
  },
  createBtnDisabled: { opacity: 0.4 },
  createBtnText: {
    fontFamily: Typography.mono,
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
});
