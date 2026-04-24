import React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';

import {
  WidgetState,
  Satisfaction,
  ServiceType,
  SATISFACTION_EMOJI,
  SERVICE_EMOJI,
  isoToFlag,
} from './widgetUtils';

// ── Colour palette (mirrors app theme, hardcoded — no hooks in widget context) ─
const C = {
  rust: '#b04632',
  sage: '#7a9e9f',
  darkSlate: '#0d1b2a',
  cream: '#f5f0e8',
  white: '#ffffff',
  lightBorder: '#e0d8cc',
  selected: 'rgba(176,70,50,0.15)',
};

interface Props {
  state: WidgetState;
}

export function TipWidget({ state }: Props) {
  const flag = isoToFlag(state.isoCode);
  const tipText = state.amount > 0 ? state.tipAmount.toFixed(2) : '—';
  const totalText = state.amount > 0 ? state.total.toFixed(2) : '—';
  const amountText = state.amount > 0 ? state.amount.toFixed(2) : '0.00';

  return (
    <FlexWidget
      style={{
        height: 'match_parent',
        width: 'match_parent',
        flexDirection: 'column',
        backgroundColor: C.white,
        borderRadius: 16,
      }}
    >
      {/* ── Row 1: country | amount | satisfaction ── */}
      <FlexWidget
        style={{
          flexDirection: 'row',
          flex: 1,
          alignItems: 'center',
          paddingHorizontal: 10,
          paddingTop: 8,
          gap: 6,
          borderBottomWidth: 1,
          borderBottomColor: C.lightBorder,
        }}
      >
        {/* Country zone */}
        <FlexWidget
          style={{
            flex: 3,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
          }}
          clickAction="OPEN_COUNTRY"
        >
          <TextWidget
            text={`${flag} ${state.currency}`}
            style={{ fontSize: 13, fontWeight: 'bold', color: C.darkSlate }}
          />
          <TextWidget
            text="↻"
            style={{ fontSize: 13, color: C.sage }}
            clickAction="REFRESH_LOCATION"
          />
        </FlexWidget>

        {/* Amount zone */}
        <FlexWidget
          style={{
            flex: 3,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: C.cream,
            borderRadius: 8,
            paddingVertical: 4,
            paddingHorizontal: 6,
          }}
          clickAction="OPEN_AMOUNT"
        >
          <TextWidget
            text={amountText}
            style={{
              fontSize: 15,
              fontWeight: 'bold',
              color: C.darkSlate,
              textAlign: 'center',
            }}
          />
        </FlexWidget>

        {/* Satisfaction zone */}
        <FlexWidget
          style={{ flex: 4, flexDirection: 'row', justifyContent: 'flex-end', gap: 2 }}
        >
          {(['poor', 'ok', 'excellent'] as Satisfaction[]).map(sat => (
            <FlexWidget
              key={sat}
              style={{
                borderRadius: 14,
                paddingHorizontal: 4,
                paddingVertical: 2,
                backgroundColor: state.satisfaction === sat ? C.selected : 'transparent',
              }}
              clickAction={`SAT_${sat}`}
            >
              <TextWidget
                text={SATISFACTION_EMOJI[sat]}
                style={{ fontSize: 18 }}
              />
            </FlexWidget>
          ))}
        </FlexWidget>
      </FlexWidget>

      {/* ── Row 2: service type | tip + total ── */}
      <FlexWidget
        style={{
          flexDirection: 'row',
          flex: 1,
          alignItems: 'center',
          paddingHorizontal: 10,
          paddingBottom: 8,
          paddingTop: 6,
          gap: 6,
        }}
      >
        {/* Service type chips */}
        <FlexWidget
          style={{ flex: 4, flexDirection: 'row', gap: 2, alignItems: 'center' }}
        >
          {(['restaurants', 'taxis', 'shops', 'services'] as ServiceType[]).map(svc => (
            <FlexWidget
              key={svc}
              style={{
                borderRadius: 12,
                paddingHorizontal: 3,
                paddingVertical: 2,
                backgroundColor: state.serviceType === svc ? C.selected : 'transparent',
              }}
              clickAction={`SVC_${svc}`}
            >
              <TextWidget
                text={SERVICE_EMOJI[svc]}
                style={{ fontSize: 16 }}
              />
            </FlexWidget>
          ))}
        </FlexWidget>

        {/* Stacked tip + total */}
        <FlexWidget
          style={{
            flex: 5,
            flexDirection: 'column',
            justifyContent: 'center',
            gap: 1,
          }}
        >
          <TextWidget
            text={`Tip: ${tipText} ${state.currency}`}
            style={{ fontSize: 11, color: C.sage, fontWeight: 'bold' }}
          />
          <TextWidget
            text={`Total: ${totalText} ${state.currency}`}
            style={{ fontSize: 13, color: C.rust, fontWeight: 'bold' }}
          />
        </FlexWidget>
      </FlexWidget>
    </FlexWidget>
  );
}
