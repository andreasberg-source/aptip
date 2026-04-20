import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSettingsStore } from '../store/settingsStore';
import { useColors } from '../hooks/useColors';
import { Typography, Radius, Spacing } from '../constants/Theme';

interface Props {
  tipKey: string;
  text: string;
}

export default function TipBanner({ tipKey, text }: Props) {
  const C = useColors();
  const { dismissedTips, dismissTip } = useSettingsStore();

  if (dismissedTips.includes(tipKey)) return null;

  return (
    <View style={[styles.banner, { backgroundColor: C.rustTransparent ?? 'rgba(180,60,40,0.08)', borderColor: C.rust }]}>
      <Text style={[styles.icon, { color: C.rust }]}>ℹ</Text>
      <Text style={[styles.text, { color: C.darkSlate }]}>{text}</Text>
      <TouchableOpacity
        onPress={() => dismissTip(tipKey)}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        activeOpacity={0.7}
      >
        <Text style={[styles.close, { color: C.sage }]}>✕</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderWidth: 1,
    borderRadius: Radius.sm,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    gap: 8,
  },
  icon: {
    fontFamily: Typography.mono,
    fontSize: 14,
    fontWeight: '700',
    marginTop: 1,
  },
  text: {
    flex: 1,
    fontFamily: Typography.serif,
    fontSize: 13,
    lineHeight: 18,
  },
  close: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 1,
  },
});
