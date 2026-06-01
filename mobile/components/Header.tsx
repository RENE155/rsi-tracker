import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { t } from '@/i18n';

interface HeaderProps {
  isConnected: boolean;
  refreshing: boolean;
}

const Header: React.FC<HeaderProps> = ({ isConnected, refreshing }) => {
  const router = useRouter();

  return (
    <View style={styles.headerContainer}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('header.title')}</Text>
        <View style={styles.headerRightContent}>
          <MaterialIcons
            name={isConnected ? "wifi" : "wifi-off"}
            size={24}
            color={isConnected ? "#34C759" : "#FF3B30"}
            style={styles.connectionIcon}
          />
          <TouchableOpacity onPress={() => router.push('/profile')} style={styles.profileIcon}>
            <MaterialIcons name="account-circle" size={30} color="#A9B4FC" />
          </TouchableOpacity>
        </View>
      </View>
      <Text style={styles.headerSubtitle}>{t('header.subtitle')}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    paddingTop: 10,
    paddingBottom: 15,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(169, 180, 252, 0.2)',
    backgroundColor: '#121829', // Pridėta fono spalva
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  headerRightContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#A0AEC0',
    marginTop: 2,
  },
  profileIcon: {
    padding: 5,
  },
  refreshIndicator: {
    marginRight: 12,
  },
  connectionIcon: {
    marginRight: 12,
  },
});

export default Header; 
