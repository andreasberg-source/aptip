import { Linking } from 'react-native';
import { updateWidgetById } from 'react-native-android-widget';
import type { WidgetTaskHandlerProps } from 'react-native-android-widget';
import React from 'react';

import { TipWidget } from './TipWidget';
import {
  WidgetState,
  Satisfaction,
  ServiceType,
  WIDGET_NAME,
  getWidgetState,
  saveWidgetState,
  computeTip,
  detectCountry,
} from './widgetUtils';

async function renderWidget(widgetId: number, state: WidgetState) {
  await updateWidgetById({
    widgetId,
    widgetName: WIDGET_NAME,
    renderWidget: () => React.createElement(TipWidget, { state }),
  });
}

async function updateAndRender(widgetId: number, updates: Partial<WidgetState>) {
  const current = await getWidgetState();
  const next: WidgetState = { ...current, ...updates };
  const computed = computeTip(next);
  const final: WidgetState = { ...next, ...computed };
  await saveWidgetState(final);
  await renderWidget(widgetId, final);
}

export async function widgetTaskHandler(props: WidgetTaskHandlerProps) {
  const { widgetAction, widgetInfo } = props;
  const widgetId = widgetInfo.widgetId;

  switch (widgetAction) {
    case 'WIDGET_ADDED': {
      // Try GPS on first placement
      const state = await getWidgetState();
      const location = await detectCountry();
      const merged: WidgetState = location
        ? { ...state, ...location, locationGranted: true }
        : state;
      const computed = computeTip(merged);
      const final = { ...merged, ...computed };
      await saveWidgetState(final);
      await renderWidget(widgetId, final);
      break;
    }

    case 'WIDGET_UPDATE':
    case 'WIDGET_RESIZED': {
      const state = await getWidgetState();
      await renderWidget(widgetId, state);
      break;
    }

    case 'WIDGET_DELETED':
      break;

    case 'REFRESH_LOCATION': {
      const location = await detectCountry();
      if (location) {
        await updateAndRender(widgetId, { ...location, locationGranted: true });
      } else {
        // Re-render unchanged (shows current state)
        const state = await getWidgetState();
        await renderWidget(widgetId, state);
      }
      break;
    }

    case 'OPEN_AMOUNT': {
      const state = await getWidgetState();
      await Linking.openURL(
        `tipapp://widget-input?type=amount&widgetId=${widgetId}&current=${state.amount}`
      );
      break;
    }

    case 'OPEN_COUNTRY': {
      await Linking.openURL(
        `tipapp://widget-input?type=country&widgetId=${widgetId}`
      );
      break;
    }

    case 'SAT_poor':
    case 'SAT_ok':
    case 'SAT_excellent': {
      const sat = widgetAction.replace('SAT_', '') as Satisfaction;
      await updateAndRender(widgetId, { satisfaction: sat });
      break;
    }

    case 'SVC_restaurants':
    case 'SVC_taxis':
    case 'SVC_shops':
    case 'SVC_services': {
      const svc = widgetAction.replace('SVC_', '') as ServiceType;
      await updateAndRender(widgetId, { serviceType: svc });
      break;
    }
  }
}
