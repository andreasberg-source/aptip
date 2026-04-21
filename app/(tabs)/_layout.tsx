import React from 'react';
import { Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';
import { BottomTabBar } from '@react-navigation/bottom-tabs';

import { useColors } from '../../hooks/useColors';
import AdBanner from '../../components/AdBanner';

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
      tabBar={props => (
        <View>
          <AdBanner />
          <BottomTabBar {...props} />
        </View>
      )}
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
        name="trips"
        options={{
          title: t('tripsTab.title'),
          tabBarLabel: t('tripsTab.title'),
          tabBarIcon: ({ focused }) => <TabIcon emoji="✈️" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="two"
        options={{
          href: null,
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
