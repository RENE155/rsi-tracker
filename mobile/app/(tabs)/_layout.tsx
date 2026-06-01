import React from 'react';
import { Tabs } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { Platform } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { t } from '@/i18n';

export default function TabLayout() {
  const { colors, isDark } = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false, // Header tvarko šakninis layout
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.subtext,
        tabBarStyle: {
          backgroundColor: colors.cardBackground,
          borderTopWidth: 0.5,
          borderTopColor: colors.border,
          elevation: 2,
          shadowOpacity: 0,
          shadowOffset: { width: 0, height: 0 },
          shadowRadius: 0,
          height: Platform.OS === 'ios' ? 55 : 45, // Ypač kompaktiška
          paddingBottom: Platform.OS === 'ios' ? 5 : 2,
          paddingTop: 1,
        },
        tabBarLabelStyle: {
          fontSize: 9, // Mažytis tekstas
          fontWeight: '500', 
          marginTop: -1,
          letterSpacing: 0,
        },
        tabBarIconStyle: {
          marginTop: -1,
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: t('tabs.dashboard'),
          tabBarIcon: ({ color, size, focused }) => (
            <MaterialIcons 
              name={focused ? "dashboard" : "dashboard"} 
              color={color} 
              size={focused ? size + 4 : size + 2} // Didesnės piktogramos, kai aktyvu
            />
          ),
        }}
      />
      <Tabs.Screen
        name="info"
        options={{
          title: t('tabs.guide'),
          tabBarIcon: ({ color, size, focused }) => (
            <MaterialIcons 
              name={focused ? "help-outline" : "help-outline"} 
              color={color} 
              size={focused ? size + 4 : size + 2}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t('tabs.profile'),
          tabBarIcon: ({ color, size, focused }) => (
            <MaterialIcons 
              name={focused ? "account-circle" : "account-circle"} 
              color={color} 
              size={focused ? size + 4 : size + 2}
            />
          ),
        }}
      />
      {/* Pridedamas akcijos detalių ekranas, bet jis paslepiamas nuo skirtukų juostos */}
      <Tabs.Screen
        name="stock/[symbol]"
        options={{ href: null }}
      />
      {/* Prireikus čia pridedami kiti skirtukų ekranai */}
    </Tabs>
  );
} 
