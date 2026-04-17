import React, { useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';

import { useHistoryStore } from '../../store/historyStore';
import { useTripStore } from '../../store/tripStore';
import HistoryItem from '../../components/HistoryItem';
import { useColors } from '../../hooks/useColors';
import { Typography, Radius } from '../../constants/Theme';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: '2-digit' });
}

export default function HistoryScreen() {
  const { t } = useTranslation();
  const C = useColors();
  const { entries, loadHistory, removeEntry } = useHistoryStore();
  const { removedBills } = useTripStore();

  useEffect(() => {
    loadHistory();
  }, []);

  const hasContent = entries.length > 0 || removedBills.length > 0;

  return (
    <View style={[styles.flex, { backgroundColor: C.cream }]}>
      <View style={[styles.header, { borderBottomColor: C.sage }]}>
        <Text style={[styles.title, { color: C.darkSlate }]}>{t('archive.title')}</Text>
      </View>

      {!hasContent ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>🧾</Text>
          <Text style={[styles.emptyText, { color: C.darkSlate }]}>{t('archive.empty')}</Text>
          <Text style={[styles.emptyHint, { color: C.sage }]}>{t('archive.emptyHint')}</Text>
        </View>
      ) : (
        <FlatList
          data={entries}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <HistoryItem entry={item} onDelete={removeEntry} />
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
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
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
});
