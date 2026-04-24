import React, { useState, useRef, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { useTranslation } from 'react-i18next';
import { router, useFocusEffect } from 'expo-router';

import { useHistoryStore, HistoryEntry } from '../../store/historyStore';
import { useTripStore } from '../../store/tripStore';
import HistoryItem from '../../components/HistoryItem';
import TripPickerDropdown from '../../components/TripPickerDropdown';
import TipBanner from '../../components/TipBanner';
import { useColors } from '../../hooks/useColors';
import { Typography, Radius } from '../../constants/Theme';
import { formatAmount } from '../../utils/tipCalculations';
import { getLocalizedCountryName } from '../../data/tippingData';
import i18n from '../../i18n';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: '2-digit' });
}

export default function HistoryScreen() {
  const { t } = useTranslation();
  const C = useColors();
  const { entries, loadHistory, removeEntry } = useHistoryStore();
  const { trips, removedBills, addBill } = useTripStore();

  const [selectedEntry, setSelectedEntry] = useState<HistoryEntry | null>(null);
  const [addTripId, setAddTripId] = useState<string | null>(null);
  const [addedVisible, setAddedVisible] = useState(false);
  const pendingEntryRef = useRef<HistoryEntry | null>(null);

  useFocusEffect(useCallback(() => {
    loadHistory();
    if (pendingEntryRef.current) {
      setSelectedEntry(pendingEntryRef.current);
      setAddTripId(null);
      pendingEntryRef.current = null;
    }
  }, [loadHistory]));

  const activeTrips = trips.filter(tr => !tr.archived);

  const linkedIds = new Set(
    trips.flatMap(tr => tr.bills.map(b => b.linkedHistoryId).filter(Boolean))
  );
  const unlinkedEntries = entries.filter(e => !linkedIds.has(e.id));

  const hasContent = unlinkedEntries.length > 0 || removedBills.length > 0;

  const handleAddToTrip = async () => {
    if (!selectedEntry || !addTripId) return;
    const trip = activeTrips.find(tr => tr.id === addTripId);
    if (!trip) return;
    await addBill({
      tripId: addTripId,
      description: selectedEntry.name || selectedEntry.country,
      currency: selectedEntry.currency,
      totalAmount: selectedEntry.total,
      country: selectedEntry.country || undefined,
      continent: selectedEntry.continent || undefined,
      paidBy: trip.participants[0]?.id ?? '',
      participants: trip.participants.map(p => p.id),
      splitMode: 'equal',
      splits: {},
      items: [],
      linkedHistoryId: selectedEntry.id,
    });
    setSelectedEntry(null);
    setAddTripId(null);
    setAddedVisible(true);
    setTimeout(() => setAddedVisible(false), 2000);
  };

  return (
    <View style={[styles.flex, { backgroundColor: C.cream }]}>
      <View style={[styles.header, { borderBottomColor: C.sage }]}>
        <Text style={[styles.title, { color: C.darkSlate }]}>{t('archive.title')}</Text>
      </View>

      <View style={styles.bannerWrap}>
        <TipBanner tipKey="archive" text={t('tip.archiveTab')} />
      </View>

      {!hasContent ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>🧾</Text>
          <Text style={[styles.emptyText, { color: C.darkSlate }]}>{t('archive.empty')}</Text>
          <Text style={[styles.emptyHint, { color: C.sage }]}>{t('archive.emptyHint')}</Text>
        </View>
      ) : (
        <FlatList
          data={unlinkedEntries}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <HistoryItem
              entry={item}
              onDelete={removeEntry}
              onPress={() => { setSelectedEntry(item); setAddTripId(null); }}
            />
          )}
          contentContainerStyle={styles.list}
          ListFooterComponent={
            removedBills.length > 0 ? (
              <View>
                <Text style={[styles.sectionLabel, { color: C.sage }]}>
                  {t('history.removedBills')}
                </Text>
                {removedBills.map(bill => (
                  <View
                    key={bill.id}
                    style={[styles.removedBillCard, { backgroundColor: C.white, borderColor: C.lightBorder }]}
                  >
                    <View style={styles.removedBillInfo}>
                      <Text style={[styles.removedBillDesc, { color: C.darkSlate }]} numberOfLines={1}>
                        {bill.description || '—'}
                      </Text>
                      <Text style={[styles.removedBillMeta, { color: C.sage }]}>
                        {formatDate(bill.date)}  ·  {bill.currency}
                      </Text>
                    </View>
                    <Text style={[styles.removedBillAmount, { color: C.darkSlate }]}>
                      {bill.totalAmount.toFixed(2)}
                    </Text>
                  </View>
                ))}
              </View>
            ) : null
          }
        />
      )}

      {/* Entry detail modal */}
      <Modal
        visible={!!selectedEntry}
        animationType="fade"
        transparent
        onRequestClose={() => setSelectedEntry(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: C.white }]}>
            {selectedEntry && (
              <>
                <View style={[styles.entryInfo, { borderBottomColor: C.lightBorder }]}>
                  <Text style={[styles.entryName, { color: C.darkSlate }]} numberOfLines={2}>
                    {selectedEntry.name || getLocalizedCountryName(selectedEntry.country ?? '', i18n.language)}
                  </Text>
                  <Text style={[styles.entryMeta, { color: C.sage }]}>
                    {formatDate(selectedEntry.date)}  ·  {formatAmount(selectedEntry.total)} {selectedEntry.currency}
                  </Text>
                </View>

                {activeTrips.length > 0 ? (
                  <>
                    <TripPickerDropdown
                      value={addTripId}
                      onChange={setAddTripId}
                      trips={activeTrips}
                      label={t('archive.addToTrip')}
                      onRequestNewTrip={() => {
                        pendingEntryRef.current = selectedEntry;
                        setSelectedEntry(null);
                        router.push('/new-trip');
                      }}
                    />
                    <TouchableOpacity
                      style={[styles.addBtn, { backgroundColor: addTripId ? C.rust : C.lightBorder }]}
                      onPress={handleAddToTrip}
                      disabled={!addTripId}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.addBtnText}>{t('archive.addToTrip')}</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <Text style={[styles.noTripsHint, { color: C.sage }]}>{t('result.noTrips')}</Text>
                )}

                <TouchableOpacity
                  style={[styles.cancelBtn, { borderColor: C.lightBorder }]}
                  onPress={() => setSelectedEntry(null)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.cancelBtnText, { color: C.sage }]}>{t('cancel')}</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Added toast */}
      {addedVisible && (
        <View style={[styles.toast, { backgroundColor: C.darkSlate }]} pointerEvents="none">
          <Text style={styles.toastText}>✓  {t('archive.addedToTrip')}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  bannerWrap: { paddingHorizontal: 16, paddingTop: 8 },
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
  list: { padding: 16 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyText: {
    fontFamily: Typography.serif,
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptyHint: {
    fontFamily: Typography.mono,
    fontSize: 13,
    textAlign: 'center',
  },
  sectionLabel: {
    fontFamily: Typography.mono,
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginTop: 24,
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  removedBillCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: Radius.md,
    padding: 12,
    marginBottom: 8,
  },
  removedBillInfo: { flex: 1 },
  removedBillDesc: {
    fontFamily: Typography.serif,
    fontWeight: '600',
    fontSize: 14,
    marginBottom: 2,
  },
  removedBillMeta: { fontFamily: Typography.mono, fontSize: 11 },
  removedBillAmount: { fontFamily: Typography.mono, fontSize: 15, fontWeight: '700' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    borderRadius: Radius.md,
    padding: 20,
    gap: 14,
  },
  entryInfo: {
    paddingBottom: 14,
    borderBottomWidth: 1,
    gap: 4,
  },
  entryName: {
    fontFamily: Typography.serif,
    fontWeight: '700',
    fontSize: 16,
  },
  entryMeta: {
    fontFamily: Typography.mono,
    fontSize: 13,
  },
  noTripsHint: {
    fontFamily: Typography.mono,
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: 8,
  },
  addBtn: {
    borderRadius: Radius.sm,
    paddingVertical: 12,
    alignItems: 'center',
  },
  addBtnText: {
    fontFamily: Typography.mono,
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    letterSpacing: 0.5,
  },
  cancelBtn: {
    borderWidth: 1.5,
    borderRadius: Radius.sm,
    paddingVertical: 11,
    alignItems: 'center',
  },
  cancelBtnText: { fontFamily: Typography.mono, fontSize: 13, fontWeight: '600' },
  toast: {
    position: 'absolute',
    top: 60,
    alignSelf: 'center',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 20,
  },
  toastText: { fontFamily: Typography.mono, fontSize: 13, color: '#fff', fontWeight: '600' },
});
