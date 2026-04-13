import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Modal,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { useTripStore } from '../../../store/tripStore';
import { useSettingsStore } from '../../../store/settingsStore';
import { useExchangeRateStore } from '../../../store/exchangeRateStore';
import { useColors } from '../../../hooks/useColors';
import { Typography, Radius } from '../../../constants/Theme';
import { computeSettlement, Transfer } from '../../../utils/settlement';
import { SORTED_CURRENCIES } from '../../../data/currencies';

export default function SettleScreen() {
  const { t } = useTranslation();
  const C = useColors();
  const { id } = useLocalSearchParams<{ id: string }>();

  const { trips } = useTripStore();
  const { homeCurrency } = useSettingsStore();
  const getHomeAmount = useExchangeRateStore(s => s.getHomeAmount);

  const trip = trips.find(tr => tr.id === id);

  // Collect currencies used in this trip's bills
  const tripCurrencies = useMemo(() => {
    if (!trip) return [];
    return [...new Set(trip.bills.map(b => b.currency))];
  }, [trip]);

  const defaultCurrency = trip?.lastCurrency ?? homeCurrency;
  const [settleCurrency, setSettleCurrency] = useState(defaultCurrency);
  const [currencyPickerVisible, setCurrencyPickerVisible] = useState(false);

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

  const transfers: Transfer[] = useMemo(() => {
    return computeSettlement(trip);
  }, [trip]);

  const getDisplayAmount = (transfer: Transfer): { primary: string; secondary: string | null } => {
    // For now we use the trip's bill currency (first bill or lastCurrency) as the native currency
    // The transfers are computed in the bill's currency units; if all bills share the same currency, it's straightforward
    const primaryCurrency = settleCurrency;
    const primaryAmount = transfer.amount;

    const homeAmt = homeCurrency !== primaryCurrency
      ? getHomeAmount(primaryAmount, primaryCurrency, homeCurrency)
      : null;

    return {
      primary: `${primaryAmount.toFixed(2)} ${primaryCurrency}`,
      secondary: homeAmt !== null ? `${homeAmt.toFixed(2)} ${homeCurrency}` : null,
    };
  };

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
        <Text style={[styles.headerTitle, { color: C.darkSlate }]}>{t('splitTab.settlement')}</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView style={styles.flex} contentContainerStyle={styles.content}>
        {/* Trip name */}
        <Text style={[styles.tripName, { color: C.sage }]}>{trip.name}</Text>

        {/* Currency selector */}
        <View style={[styles.currencyRow, { backgroundColor: C.white, borderColor: C.lightBorder }]}>
          <Text style={[styles.currencyLabel, { color: C.darkSlate }]}>{t('splitTab.settleCurrency')}</Text>
          <TouchableOpacity
            style={[styles.currencyBtn, { borderColor: C.lightBorder }]}
            onPress={() => setCurrencyPickerVisible(true)}
            activeOpacity={0.7}
          >
            <Text style={[styles.currencyBtnText, { color: C.rust }]}>{settleCurrency}</Text>
            <Text style={[styles.currencyChevron, { color: C.sage }]}>▾</Text>
          </TouchableOpacity>
        </View>

        {/* Home currency note */}
        {homeCurrency !== settleCurrency && (
          <Text style={[styles.homeNote, { color: C.sage }]}>
            ({homeCurrency} shown in parentheses)
          </Text>
        )}

        {/* Transfers */}
        {transfers.length === 0 ? (
          <View style={styles.allSettled}>
            <Text style={styles.allSettledIcon}>🎉</Text>
            <Text style={[styles.allSettledText, { color: C.darkSlate }]}>{t('splitTab.noDebts')}</Text>
          </View>
        ) : (
          transfers.map((transfer, idx) => {
            const { primary, secondary } = getDisplayAmount(transfer);
            return (
              <View
                key={idx}
                style={[styles.transferRow, { backgroundColor: C.white, borderColor: C.lightBorder }]}
              >
                <View style={styles.transferNames}>
                  <Text style={[styles.transferFrom, { color: C.darkSlate }]}>{transfer.fromName}</Text>
                  <Text style={[styles.transferArrow, { color: C.sage }]}>→</Text>
                  <Text style={[styles.transferTo, { color: C.darkSlate }]}>{transfer.toName}</Text>
                </View>
                <View style={styles.transferAmounts}>
                  <Text style={[styles.transferPrimary, { color: C.rust }]}>{primary}</Text>
                  {secondary && (
                    <Text style={[styles.transferSecondary, { color: C.sage }]}>({secondary})</Text>
                  )}
                </View>
              </View>
            );
          })
        )}

        {/* Participant balances summary */}
        {transfers.length > 0 && (
          <>
            <Text style={[styles.sectionSubtitle, { color: C.sage }]}>{t('splitTab.participants')}</Text>
            {trip.participants.map(p => {
              let balance = 0;
              for (const bill of trip.bills) {
                if (bill.paidBy === p.id) balance += bill.totalAmount;
                const owed = bill.splits[p.id];
                if (owed) balance -= owed;
              }
              const isEven = Math.abs(balance) < 0.01;
              return (
                <View
                  key={p.id}
                  style={[styles.balanceRow, { backgroundColor: C.white, borderColor: C.lightBorder }]}
                >
                  <Text style={[styles.balanceName, { color: C.darkSlate }]}>{p.name}</Text>
                  <Text style={[
                    styles.balanceAmount,
                    { color: isEven ? C.sage : balance > 0 ? C.rust : C.darkSlate },
                  ]}>
                    {balance >= 0 ? '+' : ''}{balance.toFixed(2)} {settleCurrency}
                  </Text>
                </View>
              );
            })}
          </>
        )}
      </ScrollView>

      {/* Currency Picker Modal */}
      <Modal
        visible={currencyPickerVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setCurrencyPickerVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: C.white }]}>
            <View style={[styles.modalHeader, { borderBottomColor: C.lightBorder }]}>
              <Text style={[styles.modalTitle, { color: C.darkSlate }]}>{t('splitTab.settleCurrency')}</Text>
              <TouchableOpacity onPress={() => setCurrencyPickerVisible(false)}>
                <Text style={[styles.modalClose, { color: C.rust }]}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Trip currencies first */}
            {tripCurrencies.length > 0 && (
              <View style={[styles.tripCurrenciesSection, { borderBottomColor: C.lightBorder }]}>
                <Text style={[styles.tripCurrenciesLabel, { color: C.sage }]}>Trip currencies</Text>
                <View style={styles.tripCurrenciesRow}>
                  {tripCurrencies.map(code => (
                    <TouchableOpacity
                      key={code}
                      style={[
                        styles.tripCurrencyChip,
                        { borderColor: C.lightBorder, backgroundColor: C.cream },
                        settleCurrency === code && { backgroundColor: C.rust, borderColor: C.rust },
                      ]}
                      onPress={() => { setSettleCurrency(code); setCurrencyPickerVisible(false); }}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.tripCurrencyChipText, { color: settleCurrency === code ? '#fff' : C.darkSlate }]}>
                        {code}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            <FlatList
              data={SORTED_CURRENCIES}
              keyExtractor={item => item.code}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.currencyPickerRow,
                    { borderBottomColor: C.lightBorder },
                    settleCurrency === item.code && { backgroundColor: C.rustTransparent },
                  ]}
                  onPress={() => { setSettleCurrency(item.code); setCurrencyPickerVisible(false); }}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.currencyPickerCode, { color: settleCurrency === item.code ? C.rust : C.darkSlate }]}>
                    {item.code}
                  </Text>
                  <Text style={[styles.currencyPickerName, { color: C.sage }]}>{item.name}</Text>
                  {settleCurrency === item.code && <Text style={[styles.currencyPickerCheck, { color: C.rust }]}>✓</Text>}
                </TouchableOpacity>
              )}
              style={styles.currencyList}
            />
          </View>
        </View>
      </Modal>
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
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: 8,
  },
  backBtn: { width: 36, alignItems: 'center' },
  backBtnText: { fontSize: 26, lineHeight: 30 },
  headerTitle: {
    flex: 1,
    fontFamily: Typography.serif,
    fontWeight: '700',
    fontSize: 17,
    textAlign: 'center',
  },
  content: { padding: 16, paddingBottom: 40 },
  tripName: {
    fontFamily: Typography.mono,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 16,
  },
  currencyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1.5,
    borderRadius: Radius.md,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 8,
  },
  currencyLabel: { fontFamily: Typography.serif, fontWeight: '600', fontSize: 15 },
  currencyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1.5,
    borderRadius: Radius.sm,
    paddingVertical: 5,
    paddingHorizontal: 12,
  },
  currencyBtnText: { fontFamily: Typography.mono, fontSize: 15, fontWeight: '700' },
  currencyChevron: { fontSize: 12 },
  homeNote: {
    fontFamily: Typography.mono,
    fontSize: 11,
    marginBottom: 16,
  },
  allSettled: { alignItems: 'center', paddingVertical: 48 },
  allSettledIcon: { fontSize: 44, marginBottom: 12 },
  allSettledText: { fontFamily: Typography.serif, fontWeight: '700', fontSize: 18 },
  transferRow: {
    borderWidth: 1.5,
    borderRadius: Radius.md,
    padding: 14,
    marginBottom: 10,
  },
  transferNames: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  transferFrom: { fontFamily: Typography.serif, fontWeight: '700', fontSize: 15 },
  transferArrow: { fontFamily: Typography.mono, fontSize: 14 },
  transferTo: { fontFamily: Typography.serif, fontWeight: '700', fontSize: 15 },
  transferAmounts: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  transferPrimary: { fontFamily: Typography.mono, fontSize: 18, fontWeight: '700' },
  transferSecondary: { fontFamily: Typography.mono, fontSize: 13 },
  sectionSubtitle: {
    fontFamily: Typography.mono,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 24,
    marginBottom: 10,
  },
  balanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: Radius.sm,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 6,
  },
  balanceName: { fontFamily: Typography.serif, fontWeight: '600', fontSize: 14 },
  balanceAmount: { fontFamily: Typography.mono, fontSize: 14, fontWeight: '600' },
  emptyText: { fontFamily: Typography.serif, fontSize: 15 },
  backLink: { fontFamily: Typography.mono, fontSize: 14, marginTop: 8 },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
  },
  modalTitle: { fontFamily: Typography.serif, fontWeight: '700', fontSize: 16 },
  modalClose: { fontSize: 18, fontWeight: '600', paddingHorizontal: 4 },
  tripCurrenciesSection: {
    padding: 12,
    borderBottomWidth: 1,
  },
  tripCurrenciesLabel: {
    fontFamily: Typography.mono,
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  tripCurrenciesRow: { flexDirection: 'row', gap: 8 },
  tripCurrencyChip: {
    borderWidth: 1.5,
    borderRadius: Radius.sm,
    paddingVertical: 6,
    paddingHorizontal: 14,
  },
  tripCurrencyChipText: { fontFamily: Typography.mono, fontSize: 14, fontWeight: '700' },
  currencyList: { flex: 1 },
  currencyPickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderBottomWidth: 0.5,
    gap: 10,
  },
  currencyPickerCode: {
    fontFamily: Typography.mono,
    fontSize: 14,
    fontWeight: '700',
    width: 48,
  },
  currencyPickerName: {
    fontFamily: Typography.serif,
    fontSize: 14,
    flex: 1,
  },
  currencyPickerCheck: { fontSize: 16 },
});
