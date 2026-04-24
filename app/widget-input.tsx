import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { SectionList } from 'react-native';
import { updateWidgetById } from 'react-native-android-widget';
import { useColors } from '../hooks/useColors';
import { Typography, Radius, Spacing } from '../constants/Theme';
import { tippingData, continentKeys, ContinentKey, getLocalizedCountryName } from '../data/tippingData';
import i18n from '../i18n';
import {
  WIDGET_NAME,
  getWidgetState,
  saveWidgetState,
  computeTip,
  WidgetState,
} from '../widgets/widgetUtils';
import { TipWidget } from '../widgets/TipWidget';

type InputType = 'amount' | 'country';

interface CountryItem {
  name: string;
  localizedName: string;
  currency: string;
  continent: ContinentKey;
}

async function refreshWidget(widgetId: number, state: WidgetState) {
  await updateWidgetById({
    widgetId,
    widgetName: WIDGET_NAME,
    renderWidget: () => React.createElement(TipWidget, { state }),
  });
}

export default function WidgetInputScreen() {
  const C = useColors();
  const params = useLocalSearchParams<{ type: InputType; widgetId: string; current?: string }>();
  const type = params.type ?? 'amount';
  const widgetId = parseInt(params.widgetId ?? '0', 10);

  const [amountText, setAmountText] = useState(
    params.current && parseFloat(params.current) > 0 ? params.current : ''
  );
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (type === 'amount') {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [type]);

  // ── Amount confirm ────────────────────────────────────────────────────────
  const handleAmountConfirm = async () => {
    const amount = parseFloat(amountText.replace(',', '.')) || 0;
    const state = await getWidgetState();
    const next: WidgetState = { ...state, amount };
    const computed = computeTip(next);
    const final = { ...next, ...computed };
    await saveWidgetState(final);
    await refreshWidget(widgetId, final);
    router.back();
  };

  // ── Country select ────────────────────────────────────────────────────────
  const handleCountrySelect = async (continent: ContinentKey, country: string) => {
    const entry = tippingData[continent]?.[country];
    const state = await getWidgetState();
    const next: WidgetState = {
      ...state,
      country,
      continent,
      currency: entry?.currency ?? state.currency,
      isoCode: state.isoCode,
    };
    const computed = computeTip(next);
    const final = { ...next, ...computed };
    await saveWidgetState(final);
    await refreshWidget(widgetId, final);
    router.back();
  };

  const sections = continentKeys.map(k => ({
    key: k,
    title: k.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
    data: Object.entries(tippingData[k]).map(([name, entry]) => ({
      name,
      localizedName: getLocalizedCountryName(name, i18n.language),
      currency: entry.currency,
      continent: k,
    })).sort((a, b) => a.localizedName.localeCompare(b.localizedName, i18n.language)),
  }));

  // ── Amount input screen ───────────────────────────────────────────────────
  if (type === 'amount') {
    return (
      <View style={[styles.overlay, { backgroundColor: 'rgba(0,0,0,0.55)' }]}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.flex}
        >
          <View style={styles.dialogWrap}>
            <View style={[styles.dialog, { backgroundColor: C.white }]}>
              <Text style={[styles.dialogTitle, { color: C.darkSlate }]}>
                Enter bill amount
              </Text>
              <TextInput
                ref={inputRef}
                style={[styles.amountInput, {
                  backgroundColor: C.cream,
                  borderColor: C.lightBorder,
                  color: C.darkSlate,
                }]}
                value={amountText}
                onChangeText={setAmountText}
                keyboardType="decimal-pad"
                placeholder="0.00"
                placeholderTextColor={C.sage}
                returnKeyType="done"
                onSubmitEditing={handleAmountConfirm}
              />
              <View style={styles.dialogBtns}>
                <TouchableOpacity
                  style={[styles.cancelBtn, { borderColor: C.lightBorder }]}
                  onPress={() => router.back()}
                >
                  <Text style={[styles.cancelBtnText, { color: C.sage }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.confirmBtn, { backgroundColor: C.rust }]}
                  onPress={handleAmountConfirm}
                >
                  <Text style={styles.confirmBtnText}>Done</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    );
  }

  // ── Country picker screen ─────────────────────────────────────────────────
  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.cream }]}>
      <View style={[styles.pickerHeader, { borderBottomColor: C.lightBorder }]}>
        <Text style={[styles.pickerTitle, { color: C.darkSlate }]}>Select country</Text>
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Text style={[styles.closeBtn, { color: C.rust }]}>✕</Text>
        </TouchableOpacity>
      </View>

      <SectionList
        sections={sections}
        keyExtractor={(item, i) => `${item.name}-${i}`}
        stickySectionHeadersEnabled={false}
        renderSectionHeader={({ section }) => (
          <View style={[styles.sectionHeader, { backgroundColor: C.cream }]}>
            <Text style={[styles.sectionTitle, { color: C.sage }]}>
              {section.title.toUpperCase()}
            </Text>
          </View>
        )}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.countryRow, {
              backgroundColor: C.white,
              borderBottomColor: C.lightBorder,
            }]}
            onPress={() => handleCountrySelect(item.continent, item.name)}
            activeOpacity={0.7}
          >
            <Text style={[styles.countryName, { color: C.darkSlate }]}>
              {item.localizedName}
            </Text>
            <View style={[styles.currencyBadge, { borderColor: C.lightBorder }]}>
              <Text style={[styles.currencyText, { color: C.sage }]}>{item.currency}</Text>
            </View>
          </TouchableOpacity>
        )}
        contentContainerStyle={{ paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safe: { flex: 1 },
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dialogWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  dialog: {
    width: '100%',
    borderRadius: Radius.md,
    padding: Spacing.lg,
    gap: 16,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  dialogTitle: {
    fontFamily: Typography.serif,
    fontSize: 17,
    fontWeight: '700',
    textAlign: 'center',
  },
  amountInput: {
    fontFamily: Typography.mono,
    fontSize: 28,
    fontWeight: '700',
    borderWidth: 1.5,
    borderRadius: Radius.sm,
    paddingHorizontal: 16,
    paddingVertical: 12,
    textAlign: 'center',
  },
  dialogBtns: {
    flexDirection: 'row',
    gap: 10,
  },
  cancelBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: Radius.md,
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelBtnText: {
    fontFamily: Typography.mono,
    fontSize: 14,
    fontWeight: '600',
  },
  confirmBtn: {
    flex: 2,
    borderRadius: Radius.md,
    paddingVertical: 12,
    alignItems: 'center',
  },
  confirmBtnText: {
    fontFamily: Typography.mono,
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  pickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  pickerTitle: {
    fontFamily: Typography.serif,
    fontSize: 18,
    fontWeight: '700',
  },
  closeBtn: {
    fontFamily: Typography.mono,
    fontSize: 18,
    fontWeight: '600',
  },
  sectionHeader: {
    paddingHorizontal: Spacing.lg,
    paddingTop: 14,
    paddingBottom: 6,
  },
  sectionTitle: {
    fontFamily: Typography.mono,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  countryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: Spacing.lg,
    borderBottomWidth: 1,
  },
  countryName: {
    fontFamily: Typography.serif,
    fontSize: 16,
    flex: 1,
  },
  currencyBadge: {
    borderWidth: 1.5,
    borderRadius: Radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  currencyText: {
    fontFamily: Typography.mono,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
