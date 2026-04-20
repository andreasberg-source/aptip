import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { useTripStore } from '../store/tripStore';
import { useSettingsStore } from '../store/settingsStore';
import { useExchangeRateStore } from '../store/exchangeRateStore';
import { useColors } from '../hooks/useColors';
import { Typography, Radius } from '../constants/Theme';
import { Transfer } from '../utils/settlement';
import CurrencyDropdown from '../components/CurrencyDropdown';

export default function SettleScreen() {
  const { t } = useTranslation();
  const C = useColors();
  const { id } = useLocalSearchParams<{ id: string }>();

  const { trips, markTransferSettled, unmarkTransferSettled, clearSettledTransfers } = useTripStore();
  const { homeCurrency } = useSettingsStore();
  const getHomeAmount = useExchangeRateStore(s => s.getHomeAmount);

  const trip = trips.find(tr => tr.id === id);

  const tripCurrencies = useMemo(() => {
    if (!trip) return [];
    return [...new Set([trip.lastCurrency, ...trip.bills.map(b => b.currency)].filter(Boolean))];
  }, [trip]);

  const defaultCurrency = trip?.lastCurrency ?? homeCurrency;
  const [settleCurrency, setSettleCurrency] = useState(defaultCurrency);

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

  // Convert an amount from billCurrency → settleCurrency using exchange rates
  const convertAmount = useCallback((amount: number, fromCurrency: string): number => {
    if (fromCurrency === settleCurrency) return amount;
    const converted = getHomeAmount(amount, fromCurrency, settleCurrency);
    return converted ?? amount;
  }, [settleCurrency, getHomeAmount]);

  // Exchange-rate-aware settlement computation
  const transfers: Transfer[] = useMemo(() => {
    const nameMap: Record<string, string> = {};
    for (const p of trip.participants) nameMap[p.id] = p.name;

    const balance: Record<string, number> = {};
    for (const p of trip.participants) balance[p.id] = 0;

    for (const bill of trip.bills) {
      const paidAmt = convertAmount(bill.totalAmount, bill.currency);
      balance[bill.paidBy] = (balance[bill.paidBy] ?? 0) + paidAmt;
      for (const [pid, owed] of Object.entries(bill.splits)) {
        balance[pid] = (balance[pid] ?? 0) - convertAmount(owed, bill.currency);
      }
    }

    const debtors = Object.entries(balance)
      .filter(([, b]) => b < -0.005)
      .map(([id, b]) => ({ id, amount: Math.abs(b) }))
      .sort((a, b) => b.amount - a.amount);

    const creditors = Object.entries(balance)
      .filter(([, b]) => b > 0.005)
      .map(([id, b]) => ({ id, amount: b }))
      .sort((a, b) => b.amount - a.amount);

    const result: Transfer[] = [];
    let di = 0, ci = 0;
    while (di < debtors.length && ci < creditors.length) {
      const debtor = debtors[di];
      const creditor = creditors[ci];
      const amt = Math.min(debtor.amount, creditor.amount);
      if (amt > 0.005) {
        result.push({
          fromId: debtor.id,
          fromName: nameMap[debtor.id] ?? debtor.id,
          toId: creditor.id,
          toName: nameMap[creditor.id] ?? creditor.id,
          amount: Math.round(amt * 100) / 100,
        });
      }
      debtor.amount -= amt;
      creditor.amount -= amt;
      if (debtor.amount <= 0.005) di++;
      if (creditor.amount <= 0.005) ci++;
    }
    return result;
  }, [trip, convertAmount]);

  const settledTransfers = trip.settledTransfers ?? [];

  const isTransferSettled = (fromId: string, toId: string) =>
    settledTransfers.some(s => s.fromId === fromId && s.toId === toId);

  const toggleSettled = (fromId: string, toId: string) => {
    if (isTransferSettled(fromId, toId)) {
      unmarkTransferSettled(trip.id, fromId, toId);
    } else {
      markTransferSettled(trip.id, fromId, toId);
    }
  };

  const allSettled = transfers.length > 0 && transfers.every(t => isTransferSettled(t.fromId, t.toId));

  const handleShare = useCallback(async () => {
    const pending = transfers.filter(tr => !isTransferSettled(tr.fromId, tr.toId));
    const lines = pending.map(tr =>
      `${tr.fromName} → ${tr.toName}: ${tr.amount.toFixed(2)} ${settleCurrency}`
    );
    const text =
      t('splitTab.shareGroupHeader', { trip: trip.name }) +
      '\n\n' +
      lines.join('\n') +
      '\n\n' +
      t('splitTab.shareAppCredit');
    await Share.share({ message: text });
  }, [transfers, settleCurrency, trip.name, t, settledTransfers]);

  const handleSharePerson = useCallback((fromId: string, fromName: string) => {
    const myTransfers = transfers.filter(tr => tr.fromId === fromId);
    const lines = myTransfers.map(tr =>
      `  • ${tr.toName}: ${tr.amount.toFixed(2)} ${settleCurrency}`
    );
    const text =
      t('splitTab.sharePersonHeader', { name: fromName, trip: trip.name }) +
      '\n\n' +
      lines.join('\n') +
      '\n\n' +
      t('splitTab.shareAppCredit');
    Share.share({ message: text });
  }, [transfers, settleCurrency, trip.name, t]);

  // Participant balances computed in settleCurrency
  const participantBalances = useMemo(() => {
    return trip.participants.map(p => {
      let balance = 0;
      for (const bill of trip.bills) {
        if (bill.paidBy === p.id) balance += convertAmount(bill.totalAmount, bill.currency);
        const owed = bill.splits[p.id];
        if (owed) balance -= convertAmount(owed, bill.currency);
      }
      return { ...p, balance };
    });
  }, [trip, convertAmount]);

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
        {transfers.length > 0 && (
          <TouchableOpacity
            style={styles.shareBtn}
            onPress={handleShare}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={[styles.shareBtnText, { color: C.rust }]}>↗</Text>
          </TouchableOpacity>
        )}
        {transfers.length === 0 && <View style={styles.backBtn} />}
      </View>

      <ScrollView style={styles.flex} contentContainerStyle={styles.content}>
        {/* Trip name */}
        <Text style={[styles.tripName, { color: C.sage }]}>{trip.name}</Text>

        {/* Currency selector */}
        <View style={[styles.currencyRow, { backgroundColor: C.white, borderColor: C.lightBorder }]}>
          <Text style={[styles.currencyLabel, { color: C.darkSlate }]}>{t('splitTab.settleCurrency')}</Text>
          <CurrencyDropdown
            value={settleCurrency}
            onChange={setSettleCurrency}
            priorityCurrencies={tripCurrencies}
          />
        </View>

        {/* Home currency note */}
        {homeCurrency !== settleCurrency && (
          <Text style={[styles.homeNote, { color: C.sage }]}>
            ({homeCurrency} {t('splitTab.shownInParentheses')})
          </Text>
        )}

        {/* All settled banner */}
        {allSettled && (
          <View style={[styles.allSettledBanner, { backgroundColor: C.rustTransparent, borderColor: C.rust }]}>
            <Text style={[styles.allSettledText, { color: C.rust }]}>{t('splitTab.allSettled')}</Text>
          </View>
        )}

        {/* Transfers */}
        {transfers.length === 0 ? (
          <View style={styles.allSettledEmpty}>
            <Text style={styles.allSettledIcon}>🎉</Text>
            <Text style={[styles.noDebtsText, { color: C.darkSlate }]}>{t('splitTab.noDebts')}</Text>
          </View>
        ) : (
          transfers.map((transfer, idx) => {
            const settled = isTransferSettled(transfer.fromId, transfer.toId);
            const homeAmt = homeCurrency !== settleCurrency
              ? getHomeAmount(transfer.amount, settleCurrency, homeCurrency)
              : null;
            return (
              <View
                key={idx}
                style={[
                  styles.transferRow,
                  { backgroundColor: C.white, borderColor: settled ? C.rust : C.lightBorder },
                  settled && { opacity: 0.6 },
                ]}
              >
                <View style={styles.transferMain}>
                  <View style={styles.transferNames}>
                    <Text style={[styles.transferFrom, { color: C.darkSlate }]}>{transfer.fromName}</Text>
                    <Text style={[styles.transferArrow, { color: C.sage }]}>→</Text>
                    <Text style={[styles.transferTo, { color: C.darkSlate }]}>{transfer.toName}</Text>
                  </View>
                  <View style={styles.transferAmounts}>
                    <Text style={[
                      styles.transferPrimary,
                      { color: settled ? C.sage : C.rust },
                      settled && styles.strikethrough,
                    ]}>
                      {transfer.amount.toFixed(2)} {settleCurrency}
                    </Text>
                    {homeAmt !== null && (
                      <Text style={[styles.transferSecondary, { color: C.sage }]}>
                        ({homeAmt.toFixed(2)} {homeCurrency})
                      </Text>
                    )}
                  </View>
                </View>
                <TouchableOpacity
                  style={[styles.sharePersonBtn, { borderColor: C.lightBorder }]}
                  onPress={() => handleSharePerson(transfer.fromId, transfer.fromName)}
                  activeOpacity={0.7}
                  hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                >
                  <Text style={[styles.sharePersonBtnText, { color: C.sage }]}>↗</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.settleCheckBtn,
                    { borderColor: settled ? C.rust : C.lightBorder },
                    settled && { backgroundColor: C.rust },
                  ]}
                  onPress={() => toggleSettled(transfer.fromId, transfer.toId)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.settleCheckText, { color: settled ? '#fff' : C.sage }]}>
                    {settled ? '✓' : '○'}
                  </Text>
                </TouchableOpacity>
              </View>
            );
          })
        )}

        {/* Participant balances */}
        {participantBalances.length > 0 && transfers.length > 0 && (
          <>
            <Text style={[styles.sectionSubtitle, { color: C.sage }]}>{t('splitTab.participants')}</Text>
            {participantBalances.map(p => {
              const isEven = Math.abs(p.balance) < 0.01;
              return (
                <View
                  key={p.id}
                  style={[styles.balanceRow, { backgroundColor: C.white, borderColor: C.lightBorder }]}
                >
                  {p.color ? <View style={[styles.colorDot, { backgroundColor: p.color }]} /> : null}
                  <Text style={[styles.balanceName, { color: C.darkSlate }]}>{p.name}</Text>
                  <Text style={[
                    styles.balanceAmount,
                    { color: isEven ? C.sage : p.balance > 0 ? C.rust : C.darkSlate },
                  ]}>
                    {p.balance >= 0 ? '+' : ''}{p.balance.toFixed(2)} {settleCurrency}
                  </Text>
                </View>
              );
            })}
          </>
        )}
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
  headerTitle: {
    flex: 1,
    fontFamily: Typography.serif,
    fontWeight: '700',
    fontSize: 17,
    textAlign: 'center',
  },
  shareBtn: { width: 36, alignItems: 'center' },
  shareBtnText: { fontSize: 24, fontWeight: '700' },
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
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 8,
  },
  currencyLabel: { fontFamily: Typography.serif, fontWeight: '600', fontSize: 15 },
  homeNote: {
    fontFamily: Typography.mono,
    fontSize: 11,
    marginBottom: 16,
  },
  allSettledBanner: {
    borderWidth: 1.5,
    borderRadius: Radius.md,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  allSettledText: {
    fontFamily: Typography.serif,
    fontWeight: '700',
    fontSize: 16,
  },
  allSettledEmpty: { alignItems: 'center', paddingVertical: 48 },
  allSettledIcon: { fontSize: 44, marginBottom: 12 },
  noDebtsText: { fontFamily: Typography.serif, fontWeight: '700', fontSize: 18 },
  transferRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: Radius.md,
    padding: 14,
    marginBottom: 10,
    gap: 10,
  },
  transferMain: { flex: 1 },
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
  strikethrough: { textDecorationLine: 'line-through' },
  sharePersonBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sharePersonBtnText: { fontSize: 18, fontWeight: '700' },
  settleCheckBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settleCheckText: { fontSize: 16, fontWeight: '700' },
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
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: Radius.sm,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 6,
    gap: 8,
  },
  colorDot: { width: 10, height: 10, borderRadius: 5 },
  balanceName: { fontFamily: Typography.serif, fontWeight: '600', fontSize: 14, flex: 1 },
  balanceAmount: { fontFamily: Typography.mono, fontSize: 14, fontWeight: '600' },
  emptyText: { fontFamily: Typography.serif, fontSize: 15 },
  backLink: { fontFamily: Typography.mono, fontSize: 14, marginTop: 8 },
});
