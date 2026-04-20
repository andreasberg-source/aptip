import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Trip } from '../store/tripStore';
import { useColors } from '../hooks/useColors';
import { Typography, Radius } from '../constants/Theme';

interface Props {
  value: string | null;
  onChange: (id: string | null) => void;
  trips: Trip[];
  label?: string;
  onRequestNewTrip?: () => void;
}

export default function TripPickerDropdown({ value, onChange, trips, label, onRequestNewTrip }: Props) {
  const { t } = useTranslation();
  const C = useColors();
  const [open, setOpen] = useState(false);

  const selected = trips.find(tr => tr.id === value);

  const handleSelect = (id: string | null) => {
    onChange(id);
    setOpen(false);
  };

  return (
    <View style={{ position: 'relative', zIndex: open ? 1000 : 1 }}>
      {label ? (
        <Text style={[styles.label, { color: C.sage }]}>{label}</Text>
      ) : null}

      <TouchableOpacity
        style={[styles.btn, { backgroundColor: C.cream, borderColor: value ? C.rust : C.lightBorder }]}
        onPress={() => setOpen(prev => !prev)}
        activeOpacity={0.7}
      >
        <Text style={[styles.btnText, { color: selected ? C.darkSlate : C.sage }]} numberOfLines={1}>
          {selected ? selected.name : t('result.selectTrip')}
        </Text>
        <Text style={[styles.chevron, { color: C.sage }]}>{open ? '▴' : '▾'}</Text>
      </TouchableOpacity>

      {open && (
        <View style={[styles.dropdown, { backgroundColor: C.white, borderColor: C.lightBorder }]}>
          <ScrollView
            style={styles.dropdownList}
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled
          >
            {trips.map(tr => (
              <TouchableOpacity
                key={tr.id}
                style={[
                  styles.row,
                  { borderBottomColor: C.lightBorder },
                  value === tr.id && { backgroundColor: C.rustTransparent ?? 'rgba(180,60,40,0.08)' },
                ]}
                onPress={() => handleSelect(tr.id)}
                activeOpacity={0.7}
              >
                <Text style={[styles.rowName, { color: value === tr.id ? C.rust : C.darkSlate }]}
                  numberOfLines={1}>
                  {tr.name}
                </Text>
                {value === tr.id && (
                  <Text style={[styles.check, { color: C.rust }]}>✓</Text>
                )}
              </TouchableOpacity>
            ))}

            <TouchableOpacity
              style={[styles.newTripRow, { borderTopColor: C.lightBorder }]}
              onPress={() => {
                setOpen(false);
                if (onRequestNewTrip) { onRequestNewTrip(); } else { router.push('/new-trip'); }
              }}
              activeOpacity={0.7}
            >
              <Text style={[styles.newTripText, { color: C.rust }]}>
                {t('result.newTrip')}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    fontFamily: Typography.mono,
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 6,
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: Radius.sm,
    paddingVertical: 11,
    paddingHorizontal: 12,
    gap: 8,
  },
  btnText: {
    flex: 1,
    fontFamily: Typography.serif,
    fontSize: 14,
    fontWeight: '600',
  },
  chevron: { fontSize: 12 },
  dropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    zIndex: 1000,
    elevation: 10,
    borderWidth: 1.5,
    borderRadius: Radius.md,
    marginTop: 4,
    maxHeight: 280,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
  },
  dropdownList: { flex: 1 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 0.5,
    gap: 10,
  },
  rowName: {
    flex: 1,
    fontFamily: Typography.serif,
    fontWeight: '600',
    fontSize: 15,
  },
  check: { fontSize: 16 },
  newTripRow: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    alignItems: 'center',
  },
  newTripText: {
    fontFamily: Typography.mono,
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
});
