import React, { useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { useTripStore, Trip } from '../../store/tripStore';
import { useColors } from '../../hooks/useColors';
import { Typography, Radius } from '../../constants/Theme';

export default function TripsScreen() {
  const { t } = useTranslation();
  const C = useColors();
  const { trips } = useTripStore();

  const activeTrips = trips.filter(tr => !tr.archived);

  const renderTrip = useCallback(({ item }: { item: Trip }) => {
    const totalBills = item.bills.length;
    const currencies = [...new Set(item.bills.map(b => b.currency))];
    const currencyLabel = currencies.join(', ') || item.lastCurrency;
    const isSettled = (item.settledTransfers?.length ?? 0) > 0 && item.bills.length > 0;

    return (
      <TouchableOpacity
        style={[styles.tripCard, { backgroundColor: C.white, borderColor: isSettled ? C.rust : C.lightBorder }]}
        onPress={() => router.push({ pathname: '/trip-detail', params: { id: item.id } })}
        activeOpacity={0.75}
      >
        <View style={styles.tripCardInner}>
          <View style={styles.tripNameRow}>
            <Text style={[styles.tripName, { color: C.darkSlate }]} numberOfLines={1}>
              {item.name}
            </Text>
            {isSettled && (
              <Text style={[styles.settledBadge, { color: C.rust }]}>{t('splitTab.settled')}</Text>
            )}
          </View>
          <View style={styles.tripMeta}>
            <Text style={[styles.tripMetaText, { color: C.sage }]}>
              👥 {item.participants.length}  ·  🧾 {totalBills} {t('splitTab.bills')}
            </Text>
            {currencies.length > 0 && (
              <Text style={[styles.tripCurrency, { color: C.sage }]}>{currencyLabel}</Text>
            )}
          </View>
          <View style={styles.colorDotsRow}>
            {item.participants.slice(0, 8).map(p => (
              <View key={p.id} style={[styles.colorDot, { backgroundColor: p.color ?? C.sage }]} />
            ))}
          </View>
        </View>
        <Text style={[styles.tripChevron, { color: C.sage }]}>›</Text>
      </TouchableOpacity>
    );
  }, [C, t]);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.cream }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: C.sage, backgroundColor: C.cream }]}>
        <Text style={[styles.headerIcon, { color: C.rust }]}>✈️</Text>
        <Text style={[styles.title, { color: C.rust }]}>{t('tripsTab.title')}</Text>
        <TouchableOpacity
          style={styles.helpBtn}
          onPress={() => router.push('/help-trips')}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={[styles.helpBtnText, { color: C.rust }]}>?</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={activeTrips}
        keyExtractor={item => item.id}
        renderItem={renderTrip}
        ListHeaderComponent={
          <View style={styles.listHeader}>
            <TouchableOpacity
              style={[styles.newTripBtn, { backgroundColor: C.rust }]}
              onPress={() => router.push('/new-trip')}
              activeOpacity={0.8}
            >
              <Text style={styles.newTripBtnText}>+ {t('splitTab.newTrip')}</Text>
            </TouchableOpacity>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🗺️</Text>
            <Text style={[styles.emptyText, { color: C.darkSlate }]}>{t('tripsTab.noTrips')}</Text>
            <Text style={[styles.emptyHint, { color: C.sage }]}>{t('tripsTab.noTripsHint')}</Text>
          </View>
        }
        contentContainerStyle={styles.listContent}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
    borderBottomWidth: 2,
    gap: 8,
  },
  headerIcon: { fontSize: 22 },
  title: {
    fontFamily: Typography.serif,
    fontSize: 22,
    fontWeight: '700',
    flex: 1,
  },
  helpBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  helpBtnText: {
    fontFamily: Typography.mono,
    fontSize: 22,
    fontWeight: '700',
  },
  listContent: { paddingBottom: 32 },
  listHeader: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    alignItems: 'flex-end',
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
  tripNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  tripName: {
    fontFamily: Typography.serif,
    fontWeight: '700',
    fontSize: 16,
    flexShrink: 1,
  },
  settledBadge: {
    fontFamily: Typography.mono,
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  tripMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  tripMetaText: { fontFamily: Typography.mono, fontSize: 12 },
  tripCurrency: { fontFamily: Typography.mono, fontSize: 12 },
  colorDotsRow: { flexDirection: 'row', gap: 4 },
  colorDot: { width: 8, height: 8, borderRadius: 4 },
  tripChevron: { fontSize: 22, marginLeft: 8 },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
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
