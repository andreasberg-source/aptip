import React from 'react';
import { Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Text } from 'react-native';

import { useColors } from '../../hooks/useColors';

function TabIcon({ emoji, focused }: { emoji: string; focused: boolean }) {
  return (
    <Text style={{ fontSize: 22, opacity: focused ? 1 : 0.5 }}>{emoji}</Text>
  );
}

export default function TabLayout() {
  const { t } = useTranslation();
  const C = useColors();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: C.rust,
        tabBarInactiveTintColor: C.sage,
        tabBarStyle: {
          backgroundColor: C.white,
          borderTopColor: C.lightBorder,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontFamily: 'System',
        },
        headerStyle: { backgroundColor: C.cream },
        headerTintColor: C.darkSlate,
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('app.title'),
          tabBarLabel: t('app.title'),
          tabBarIcon: ({ focused }) => <TabIcon emoji="🧮" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="split"
        options={{
          title: t('splitTab.title'),
          tabBarLabel: t('splitTab.title'),
          tabBarIcon: ({ focused }) => <TabIcon emoji="✂️" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="two"
        options={{
          title: t('archive.title'),
          tabBarLabel: t('archive.title'),
          tabBarIcon: ({ focused }) => <TabIcon emoji="🧾" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: t('settings.title'),
          tabBarLabel: t('settings.title'),
          tabBarIcon: ({ focused }) => <TabIcon emoji="⚙️" focused={focused} />,
        }}
      />
    </Tabs>
  );
}
