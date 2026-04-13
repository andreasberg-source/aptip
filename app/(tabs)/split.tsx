import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { useTripStore, Trip } from '../../store/tripStore';
import { useColors } from '../../hooks/useColors';
import { Typography, Radius } from '../../constants/Theme';
import { formatAmount } from '../../utils/tipCalculations';

export default function SplitScreen() {
  const { t } = useTranslation();
  const C = useColors();
  const { trips } = useTripStore();

  // Quick Split state
  const [quickAmount, setQuickAmount] = useState('');
  const [quickPeople, setQuickPeople] = useState(2);

  const quickResult = (() => {
    const amt = parseFloat(quickAmount.replace(',', '.'));
    if (!isNaN(amt) && amt > 0 && quickPeople > 0) {
      return amt / quickPeople;
    }
    return null;
  })();

  const activeTrips = trips.filter(t => !t.archived);

  const renderTrip = useCallback(({ item }: { item: Trip }) => {
    const totalBills = item.bills.length;
    const currencies = [...new Set(item.bills.map(b => b.currency))];
    const currencyLabel = currencies.join(', ') || item.lastCurrency;

    return (
      <TouchableOpacity
        style={[styles.tripCard, { backgroundColor: C.white, borderColor: C.lightBorder }]}
        onPress={() => router.push({ pathname: '/trip/[id]', params: { id: item.id } })}
        activeOpacity={0.75}
      >
        <View style={styles.tripCardInner}>
          <Text style={[styles.tripName, { color: C.darkSlate }]} numberOfLines={1}>
            {item.name}
          </Text>
          <View style={styles.tripMeta}>
            <Text style={[styles.tripMetaText, { color: C.sage }]}>
              👥 {item.participants.length}  ·  🧾 {totalBills} {t('splitTab.bills')}
            </Text>
            {currencies.length > 0 && (
              <Text style={[styles.tripCurrency, { color: C.sage }]}>{currencyLabel}</Text>
            )}
          </View>
        </View>
        <Text style={[styles.tripChevron, { color: C.sage }]}>›</Text>
      </TouchableOpacity>
    );
  }, [C, t]);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.cream }]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <FlatList
          data={activeTrips}
          keyExtractor={item => item.id}
          renderItem={renderTrip}
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={
            <>
              {/* Header */}
              <View style={[styles.header, { borderBottomColor: C.sage }]}>
                <Text style={[styles.title, { color: C.darkSlate }]}>✂️ {t('splitTab.title')}</Text>
              </View>

              {/* Quick Split */}
              <View style={[styles.card, { backgroundColor: C.white, borderColor: C.lightBorder }]}>
                <Text style={[styles.sectionTitle, { color: C.darkSlate }]}>{t('splitTab.quickSplit')}</Text>
                <Text style={[styles.hint, { color: C.sage }]}>{t('splitTab.quickSplitHint')}</Text>

                <Text style={[styles.label, { color: C.darkSlate }]}>{t('splitTab.amountLabel')}</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: C.cream, borderColor: C.lightBorder, color: C.darkSlate }]}
                  value={quickAmount}
                  onChangeText={setQuickAmount}
                  placeholder="0.00"
                  placeholderTextColor={C.sage}
                  keyboardType="decimal-pad"
                  returnKeyType="done"
                />

                <View style={styles.stepperRow}>
                  <TouchableOpacity
                    style={[styles.stepperBtn, { backgroundColor: C.sage }, quickPeople <= 1 && styles.disabled]}
                    onPress={() => setQuickPeople(p => Math.max(1, p - 1))}
                    disabled={quickPeople <= 1}
                  >
                    <Text style={styles.stepperBtnText}>−</Text>
                  </TouchableOpacity>
                  <View style={[styles.stepperCount, { backgroundColor: C.cream, borderColor: C.lightBorder }]}>
                    <Text style={[styles.stepperCountText, { color: C.darkSlate }]}>
                      {quickPeople === 1
                        ? t('split.onePerson')
                        : t('split.people', { n: quickPeople })}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.stepperBtn, { backgroundColor: C.sage }, quickPeople >= 20 && styles.disabled]}
                    onPress={() => setQuickPeople(p => Math.min(20, p + 1))}
                    disabled={quickPeople >= 20}
                  >
                    <Text style={styles.stepperBtnText}>+</Text>
                  </TouchableOpacity>
                </View>

                {quickResult !== null && (
                  <View style={[styles.quickResult, { backgroundColor: C.cream, borderColor: C.lightBorder }]}>
                    <Text style={[styles.quickResultLabel, { color: C.sage }]}>{t('splitTab.perPerson')}</Text>
                    <Text style={[styles.quickResultValue, { color: C.rust }]}>
                      {formatAmount(quickResult, 2)}
                    </Text>
                  </View>
                )}
              </View>

              {/* My Trips header */}
              <View style={styles.tripsHeader}>
                <Text style={[styles.sectionTitle, { color: C.darkSlate }]}>{t('splitTab.trips')}</Text>
                <TouchableOpacity
                  style={[styles.newTripBtn, { backgroundColor: C.rust }]}
                  onPress={() => router.push('/new-trip')}
                  activeOpacity={0.8}
                >
                  <Text style={styles.newTripBtnText}>+ {t('splitTab.newTrip')}</Text>
                </TouchableOpacity>
              </View>
            </>
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={[styles.emptyIcon]}>🗺️</Text>
              <Text style={[styles.emptyText, { color: C.darkSlate }]}>{t('splitTab.noTrips')}</Text>
              <Text style={[styles.emptyHint, { color: C.sage }]}>{t('splitTab.noTripsHint')}</Text>
            </View>
          }
          contentContainerStyle={styles.listContent}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  listContent: { paddingBottom: 32 },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
    borderBottomWidth: 2,
    marginBottom: 16,
  },
  title: {
    fontFamily: Typography.serif,
    fontSize: 22,
    fontWeight: '700',
  },
  card: {
    marginHorizontal: 16,
    marginBottom: 20,
    borderWidth: 1.5,
    borderRadius: Radius.md,
    padding: 16,
  },
  sectionTitle: {
    fontFamily: Typography.serif,
    fontWeight: '700',
    fontSize: 16,
    marginBottom: 4,
  },
  hint: {
    fontFamily: Typography.mono,
    fontSize: 11,
    marginBottom: 14,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  label: {
    fontFamily: Typography.serif,
    fontWeight: '600',
    fontSize: 14,
    marginBottom: 6,
  },
  input: {
    borderWidth: 2,
    borderRadius: Radius.sm,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontFamily: Typography.mono,
    fontSize: 18,
    marginBottom: 12,
  },
  stepperRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  stepperBtn: {
    width: 44,
    height: 44,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperBtnText: { color: '#fff', fontSize: 22, fontWeight: '600', lineHeight: 26 },
  stepperCount: {
    flex: 1,
    borderWidth: 2,
    borderRadius: Radius.sm,
    paddingVertical: 10,
    alignItems: 'center',
  },
  stepperCountText: { fontFamily: Typography.mono, fontSize: 16 },
  disabled: { opacity: 0.35 },
  quickResult: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14,
    borderWidth: 1.5,
    borderRadius: Radius.sm,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  quickResultLabel: { fontFamily: Typography.serif, fontSize: 14 },
  quickResultValue: { fontFamily: Typography.mono, fontSize: 20, fontWeight: '700' },
  tripsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  newTripBtn: {
    borderRadius: Radius.sm,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  newTripBtnText: {
    fontFamily: Typography.mono,
    fontSize: 13,
    color: '#fff',
    fontWeight: '600',
  },
  tripCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 10,
    borderWidth: 1.5,
    borderRadius: Radius.md,
    padding: 14,
  },
  tripCardInner: { flex: 1 },
  tripName: {
    fontFamily: Typography.serif,
    fontWeight: '700',
    fontSize: 16,
    marginBottom: 4,
  },
  tripMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  tripMetaText: { fontFamily: Typography.mono, fontSize: 12 },
  tripCurrency: { fontFamily: Typography.mono, fontSize: 12 },
  tripChevron: { fontSize: 22, marginLeft: 8 },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 32,
  },
  emptyIcon: { fontSize: 40, marginBottom: 12 },
  emptyText: {
    fontFamily: Typography.serif,
    fontWeight: '700',
    fontSize: 16,
    marginBottom: 6,
    textAlign: 'center',
  },
  emptyHint: {
    fontFamily: Typography.mono,
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
});
