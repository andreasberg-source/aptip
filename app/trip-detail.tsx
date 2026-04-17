import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { useTripStore, Bill, Participant } from '../store/tripStore';
import { useColors } from '../hooks/useColors';
import { Typography, Radius } from '../constants/Theme';

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default function TripDetailScreen() {
  const { t } = useTranslation();
  const C = useColors();
  const { id } = useLocalSearchParams<{ id: string }>();

  const { trips, updateTrip, deleteBill, detachBill } = useTripStore();
  const trip = trips.find(t => t.id === id);

  const [editingParticipants, setEditingParticipants] = useState(false);
  const [participantEdits, setParticipantEdits] = useState<Participant[]>([]);
  const [newParticipantName, setNewParticipantName] = useState('');

  // Hooks must all be called before any conditional return
  const handleBillLongPress = useCallback((bill: Bill) => {
    if (!trip) return;
    Alert.alert(
      bill.description || t('splitTab.billDescription'),
      '',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: t('splitTab.detachBill'),
          onPress: () => {
            Alert.alert(
              t('splitTab.detachBill'),
              t('splitTab.detachBillConfirm'),
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: t('splitTab.detachBill'),
                  onPress: () => detachBill(trip.id, bill.id),
                },
              ],
            );
          },
        },
        {
          text: t('splitTab.deleteBill'),
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              t('splitTab.deleteBill'),
              t('splitTab.deleteBillConfirm'),
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: t('splitTab.deleteBill'),
                  style: 'destructive',
                  onPress: () => deleteBill(trip.id, bill.id),
                },
              ],
            );
          },
        },
      ],
    );
  }, [trip, deleteBill, detachBill, t]);

  const handleDeleteTrip = useCallback(() => {
    if (!trip) return;
    Alert.alert(
      t('splitTab.deleteTrip'),
      t('splitTab.deleteConfirm'),
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: t('splitTab.deleteTrip'),
          style: 'destructive',
          onPress: async () => {
            const { deleteTrip } = useTripStore.getState();
            await deleteTrip(trip.id);
            router.back();
          },
        },
      ],
    );
  }, [trip, t]);

  if (!trip) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: C.cream }]}>
        <View style={styles.center}>
          <Text style={[styles.emptyText, { color: C.sage }]}>Trip not found.</Text>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={[styles.backLink, { color: C.rust }]}>← Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const startEditParticipants = () => {
    setParticipantEdits([...trip.participants]);
    setNewParticipantName('');
    setEditingParticipants(true);
  };

  const saveParticipants = async () => {
    const valid = participantEdits.filter(p => p.name.trim().length > 0);
    await updateTrip(trip.id, { participants: valid });
    setEditingParticipants(false);
  };

  const addParticipantInEdit = () => {
    if (!newParticipantName.trim()) return;
    const newP: Participant = {
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name: newParticipantName.trim(),
      color: '#999999',
    };
    setParticipantEdits(prev => [...prev, newP]);
    setNewParticipantName('');
  };

  const isFullySettled = trip.bills.length > 0 && (() => {
    // check via settledTransfers length vs computed transfers - simplified check
    return (trip.settledTransfers?.length ?? 0) > 0;
  })();

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.cream }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: C.lightBorder, backgroundColor: C.white }]}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={[styles.backBtnText, { color: C.rust }]}>‹</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: C.darkSlate }]} numberOfLines={1}>
            {trip.name}
          </Text>
          {isFullySettled && (
            <Text style={[styles.settledBadge, { color: C.rust }]}>{t('splitTab.settled')}</Text>
          )}
        </View>
        <TouchableOpacity
          style={[styles.settleBtn, { backgroundColor: C.rust }]}
          onPress={() => router.push({ pathname: '/trip-settle', params: { id: trip.id } })}
          activeOpacity={0.8}
        >
          <Text style={styles.settleBtnText}>{t('splitTab.settleUp')}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.flex} contentContainerStyle={styles.content}>
        {/* Participants */}
        <View style={[styles.card, { backgroundColor: C.white, borderColor: C.lightBorder }]}>
          <View style={styles.cardHeader}>
            <Text style={[styles.sectionTitle, { color: C.darkSlate }]}>👥 {t('splitTab.participants')}</Text>
            {!editingParticipants ? (
              <TouchableOpacity onPress={startEditParticipants}>
                <Text style={[styles.editLink, { color: C.rust }]}>{t('splitTab.editParticipants')}</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity onPress={saveParticipants}>
                <Text style={[styles.editLink, { color: C.rust }]}>{t('splitTab.doneEditing')}</Text>
              </TouchableOpacity>
            )}
          </View>

          {!editingParticipants ? (
            <View style={styles.chipsRow}>
              {trip.participants.map(p => (
                <View key={p.id} style={[styles.chip, { backgroundColor: C.cream, borderColor: C.lightBorder }]}>
                  {p.color ? (
                    <View style={[styles.colorDot, { backgroundColor: p.color }]} />
                  ) : null}
                  <Text style={[styles.chipText, { color: C.darkSlate }]}>{p.name}</Text>
                </View>
              ))}
            </View>
          ) : (
            <>
              {participantEdits.map((p, idx) => (
                <View key={p.id} style={styles.editRow}>
                  {p.color ? (
                    <View style={[styles.colorDot, { backgroundColor: p.color }]} />
                  ) : null}
                  <TextInput
                    style={[styles.editInput, { backgroundColor: C.cream, borderColor: C.lightBorder, color: C.darkSlate }]}
                    value={p.name}
                    onChangeText={v => setParticipantEdits(prev => prev.map((ep, i) => i === idx ? { ...ep, name: v } : ep))}
                    autoCapitalize="words"
                  />
                  {participantEdits.length > 2 && (
                    <TouchableOpacity
                      onPress={() => setParticipantEdits(prev => prev.filter((_, i) => i !== idx))}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Text style={[styles.removeText, { color: C.sage }]}>✕</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ))}
              <View style={styles.editRow}>
                <TextInput
                  style={[styles.editInput, { backgroundColor: C.cream, borderColor: C.lightBorder, color: C.darkSlate }]}
                  value={newParticipantName}
                  onChangeText={setNewParticipantName}
                  placeholder={t('splitTab.participantName')}
                  placeholderTextColor={C.sage}
                  autoCapitalize="words"
                  returnKeyType="done"
                  onSubmitEditing={addParticipantInEdit}
                />
                <TouchableOpacity
                  style={[styles.addInlineBtn, { backgroundColor: C.rust }]}
                  onPress={addParticipantInEdit}
                >
                  <Text style={styles.addInlineBtnText}>+</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>

        {/* Bills */}
        <View style={styles.billsHeader}>
          <Text style={[styles.sectionTitle, { color: C.darkSlate }]}>🧾 {t('history.title')}</Text>
          <View style={styles.billsActions}>
            <TouchableOpacity
              style={[styles.scanBillBtn, { borderColor: C.lightBorder }]}
              onPress={() => router.push({ pathname: '/add-bill', params: { tripId: trip.id, autoScan: '1' } })}
              activeOpacity={0.8}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            >
              <Text style={[styles.scanBillBtnText, { color: C.sage }]}>📷</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.addBillBtn, { backgroundColor: C.rust }]}
              onPress={() => router.push({ pathname: '/add-bill', params: { tripId: trip.id } })}
              activeOpacity={0.8}
            >
              <Text style={styles.addBillBtnText}>+ {t('splitTab.addBill')}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {trip.bills.length === 0 ? (
          <View style={[styles.emptyBills, { borderColor: C.lightBorder }]}>
            <Text style={[styles.emptyText, { color: C.sage }]}>{t('splitTab.noBillsYet')}</Text>
          </View>
        ) : (
          trip.bills.map(bill => {
            const payer = trip.participants.find(p => p.id === bill.paidBy);
            return (
              <TouchableOpacity
                key={bill.id}
                style={[styles.billRow, { backgroundColor: C.white, borderColor: C.lightBorder }]}
                onPress={() => router.push({ pathname: '/add-bill', params: { tripId: trip.id, billId: bill.id } })}
                onLongPress={() => handleBillLongPress(bill)}
                activeOpacity={0.75}
              >
                <View style={styles.billInfo}>
                  <Text style={[styles.billDesc, { color: C.darkSlate }]} numberOfLines={1}>
                    {bill.description || '—'}
                  </Text>
                  <Text style={[styles.billMeta, { color: C.sage }]}>
                    {t('splitTab.paidBy')}: {payer?.name ?? '?'}  ·  {formatDate(bill.date)}
                  </Text>
                </View>
                <View style={styles.billAmountCol}>
                  <Text style={[styles.billAmount, { color: C.darkSlate }]}>
                    {bill.totalAmount.toFixed(2)}
                  </Text>
                  <Text style={[styles.billCurrency, { color: C.sage }]}>{bill.currency}</Text>
                </View>
              </TouchableOpacity>
            );
          })
        )}

        {/* Delete trip */}
        <TouchableOpacity style={styles.deleteTripBtn} onPress={handleDeleteTrip}>
          <Text style={[styles.deleteTripText, { color: C.sage }]}>{t('splitTab.deleteTrip')}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderBottomWidth: 1,
    gap: 8,
  },
  backBtn: { width: 36, alignItems: 'center' },
  backBtnText: { fontSize: 26, lineHeight: 30 },
  headerCenter: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle: {
    fontFamily: Typography.serif,
    fontWeight: '700',
    fontSize: 17,
    flexShrink: 1,
  },
  settledBadge: {
    fontFamily: Typography.mono,
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  settleBtn: {
    borderRadius: Radius.sm,
    paddingVertical: 7,
    paddingHorizontal: 14,
  },
  settleBtnText: {
    fontFamily: Typography.mono,
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  content: { padding: 16, paddingBottom: 40 },
  card: {
    borderWidth: 1.5,
    borderRadius: Radius.md,
    padding: 14,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sectionTitle: {
    fontFamily: Typography.serif,
    fontWeight: '700',
    fontSize: 15,
  },
  editLink: {
    fontFamily: Typography.mono,
    fontSize: 13,
    fontWeight: '600',
  },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    borderWidth: 1.5,
    borderRadius: Radius.sm,
    paddingVertical: 5,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  colorDot: { width: 10, height: 10, borderRadius: 5 },
  chipText: { fontFamily: Typography.mono, fontSize: 13 },
  editRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  editInput: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: Radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontFamily: Typography.mono,
    fontSize: 14,
  },
  removeText: { fontSize: 16, width: 24, textAlign: 'center' },
  addInlineBtn: {
    width: 36,
    height: 36,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addInlineBtnText: { color: '#fff', fontSize: 20, lineHeight: 24 },
  billsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  billsActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  scanBillBtn: {
    borderWidth: 1.5,
    borderRadius: Radius.sm,
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanBillBtnText: { fontSize: 16 },
  addBillBtn: {
    borderRadius: Radius.sm,
    paddingVertical: 7,
    paddingHorizontal: 12,
  },
  addBillBtnText: {
    fontFamily: Typography.mono,
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  emptyBills: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderRadius: Radius.md,
    paddingVertical: 28,
    alignItems: 'center',
    marginBottom: 16,
  },
  billRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: Radius.md,
    padding: 12,
    marginBottom: 8,
  },
  billInfo: { flex: 1 },
  billDesc: {
    fontFamily: Typography.serif,
    fontWeight: '600',
    fontSize: 15,
    marginBottom: 3,
  },
  billMeta: { fontFamily: Typography.mono, fontSize: 11 },
  billAmountCol: { alignItems: 'flex-end', marginLeft: 8 },
  billAmount: { fontFamily: Typography.mono, fontSize: 16, fontWeight: '700' },
  billCurrency: { fontFamily: Typography.mono, fontSize: 11 },
  deleteTripBtn: {
    marginTop: 24,
    paddingVertical: 12,
    alignItems: 'center',
  },
  deleteTripText: { fontFamily: Typography.mono, fontSize: 13 },
  backLink: { fontFamily: Typography.mono, fontSize: 14, marginTop: 8 },
  emptyText: { fontFamily: Typography.serif, fontSize: 15 },
});
