import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';

import { HistoryEntry } from '../store/historyStore';
import { formatAmount } from '../utils/tipCalculations';
import { useColors } from '../hooks/useColors';
import { Typography, Radius } from '../constants/Theme';

const COUNTRY_FLAGS: Record<string, string> = {
  USA: '🇺🇸', Canada: '🇨🇦', Mexico: '🇲🇽',
  Norge: '🇳🇴', Sverige: '🇸🇪', Danmark: '🇩🇰', Finland: '🇫🇮', Island: '🇮🇸',
  Storbritannia: '🇬🇧', Irland: '🇮🇪', Frankrike: '🇫🇷', Italia: '🇮🇹',
  Spania: '🇪🇸', Portugal: '🇵🇹', Tyskland: '🇩🇪', Nederland: '🇳🇱',
  Belgia: '🇧🇪', Sveits: '🇨🇭', Østerrike: '🇦🇹', Hellas: '🇬🇷',
  Tyrkia: '🇹🇷', Polen: '🇵🇱', Tsjekkia: '🇨🇿', Ungarn: '🇭🇺',
  Kroatia: '🇭🇷', Romania: '🇷🇴', Bulgaria: '🇧🇬', Russland: '🇷🇺',
  Brasil: '🇧🇷', Argentina: '🇦🇷', Chile: '🇨🇱', Colombia: '🇨🇴',
  Peru: '🇵🇪', Ecuador: '🇪🇨', Uruguay: '🇺🇾',
  Japan: '🇯🇵', Kina: '🇨🇳', 'Sør-Korea': '🇰🇷', Thailand: '🇹🇭',
  Vietnam: '🇻🇳', Indonesia: '🇮🇩', Malaysia: '🇲🇾', Filippinene: '🇵🇭',
  Singapore: '🇸🇬', India: '🇮🇳', 'Sri Lanka': '🇱🇰', Nepal: '🇳🇵',
  Pakistan: '🇵🇰', Bangladesh: '🇧🇩', 'Hong Kong': '🇭🇰', Taiwan: '🇹🇼',
  Australia: '🇦🇺', 'New Zealand': '🇳🇿', Fiji: '🇫🇯',
  'Sør-Afrika': '🇿🇦', Egypt: '🇪🇬', Marokko: '🇲🇦', Tunisia: '🇹🇳',
  Kenya: '🇰🇪', Tanzania: '🇹🇿', Ghana: '🇬🇭', Nigeria: '🇳🇬',
  'De forente arabiske emirater': '🇦🇪', 'Saudi-Arabia': '🇸🇦', Qatar: '🇶🇦',
  Kuwait: '🇰🇼', Oman: '🇴🇲', Bahrain: '🇧🇭', Israel: '🇮🇱',
  Libanon: '🇱🇧', Jordan: '🇯🇴',
};

interface Props {
  entry: HistoryEntry;
  onDelete: (id: string) => void;
}

export default function HistoryItem({ entry, onDelete }: Props) {
  const { t } = useTranslation();
  const C = useColors();
  const flag = COUNTRY_FLAGS[entry.country] ?? '🌍';
  const date = new Date(entry.date);
  const dateStr = date.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });

  return (
    <View style={[styles.card, { backgroundColor: C.white, borderColor: C.lightBorder, shadowColor: C.darkSlate }]}>
      <View style={styles.top}>
        <Text style={styles.flag}>{flag}</Text>
        <View style={styles.info}>
          <Text style={[styles.country, { color: C.darkSlate }]}>{entry.country}</Text>
          <Text style={[styles.date, { color: C.sage }]}>{dateStr}</Text>
        </View>
        <TouchableOpacity
          style={[styles.deleteBtn, { borderColor: C.rust }]}
          onPress={() => onDelete(entry.id)}
        >
          <Text style={[styles.deleteText, { color: C.rust }]}>{t('history.delete')}</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.amounts}>
        <View style={styles.amountCol}>
          <Text style={[styles.amountLabel, { color: C.sage }]}>{t('result.total')}</Text>
          <Text style={[styles.amountValue, { color: C.darkSlate }]}>
            {formatAmount(entry.total)} {entry.currency}
          </Text>
        </View>
        <View style={styles.amountCol}>
          <Text style={[styles.amountLabel, { color: C.sage }]}>{t('result.tip', { percent: entry.tipPercent })}</Text>
          <Text style={[styles.amountValue, styles.tipValue, { color: C.rust }]}>
            {formatAmount(entry.tipAmount)} {entry.currency}
          </Text>
        </View>
        {entry.people > 1 && (
          <View style={styles.amountCol}>
            <Text style={[styles.amountLabel, { color: C.sage }]}>{t('result.perPerson')}</Text>
            <Text style={[styles.amountValue, { color: C.darkSlate }]}>
              {formatAmount(entry.perPerson)} {entry.currency}
            </Text>
          </View>
        )}
      </View>
      {entry.homeTotal !== null && (
        <Text style={[styles.home, { color: C.sage }]}>
          {t('result.home', {
            amount: formatAmount(entry.homeTotal, 0),
            currency: entry.homeCurrency,
          })}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.md,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  top: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  flag: { fontSize: 28, marginRight: 10 },
  info: { flex: 1 },
  country: { fontFamily: Typography.serif, fontSize: 16, fontWeight: '600' },
  date: { fontFamily: Typography.mono, fontSize: 11, marginTop: 2 },
  deleteBtn: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderRadius: Radius.sm,
  },
  deleteText: { fontFamily: Typography.mono, fontSize: 11 },
  amounts: { flexDirection: 'row', gap: 10 },
  amountCol: { flex: 1 },
  amountLabel: { fontFamily: Typography.mono, fontSize: 10, marginBottom: 2 },
  amountValue: { fontFamily: Typography.mono, fontSize: 14, fontWeight: '500' },
  tipValue: {},
  home: { fontFamily: Typography.mono, fontSize: 11, marginTop: 8, textAlign: 'right' },
});
