import React, { useEffect } from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';

import { useHistoryStore } from '../../store/historyStore';
import HistoryItem from '../../components/HistoryItem';
import { useColors } from '../../hooks/useColors';
import { Typography } from '../../constants/Theme';

export default function HistoryScreen() {
  const { t } = useTranslation();
  const C = useColors();
  const { entries, loadHistory, removeEntry } = useHistoryStore();

  useEffect(() => {
    loadHistory();
  }, []);

  return (
    <View style={[styles.flex, { backgroundColor: C.cream }]}>
      <View style={[styles.header, { borderBottomColor: C.sage }]}>
        <Text style={[styles.title, { color: C.darkSlate }]}>{t('history.title')}</Text>
      </View>

      {entries.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>🧾</Text>
          <Text style={[styles.emptyText, { color: C.darkSlate }]}>{t('history.empty')}</Text>
          <Text style={[styles.emptyHint, { color: C.sage }]}>{t('history.emptyHint')}</Text>
        </View>
      ) : (
        <FlatList
          data={entries}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <HistoryItem entry={item} onDelete={removeEntry} />
          )}
          contentContainerStyle={styles.list}
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
});
