import { View, Text, StyleSheet, ActivityIndicator, Alert, TouchableOpacity, Switch } from 'react-native';
import React, { useContext, useState } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import PurchasesContext from '@/context/PurchasesContext';
import { useTheme } from '@/context/ThemeContext';
import DemoModeToggle from '@/components/DemoModeToggle';
import { t } from '@/i18n';

export default function ProfileScreen() {
  const router = useRouter();
  const purchasesContext = useContext(PurchasesContext);
  const [isRestoring, setIsRestoring] = useState(false);
  const { colors, toggleTheme, isDark } = useTheme();

  const isSubscribed = purchasesContext?.isSubscribed || false;

  const handleRestorePurchases = async () => {
    if (!purchasesContext?.restorePurchases) {
        Alert.alert(t('common.error'), t('profile.alerts.restoreUnavailable'));
        return;
    };

    setIsRestoring(true);
    try {
      await purchasesContext.restorePurchases();
    } catch (error) {
      console.log("Restore failed (error caught in UI)");
    } finally {
      setIsRestoring(false);
    }
  };

  // Pagalbinė funkcija stilizuotiems mygtukams atvaizduoti
  const renderStyledButton = (
    title: string, 
    onPress: () => void, 
    disabled = false, 
    isSignIn = false,
    icon?: React.ReactNode
  ) => (
    <TouchableOpacity 
      style={[
        styles.styledButton, 
        { backgroundColor: isSignIn ? colors.text : colors.cardBackground },
        disabled && styles.disabledButton
      ]} 
      onPress={onPress} 
      disabled={disabled}
    >
      <View style={styles.buttonContent}>
        {icon && <View style={styles.iconStyle}>{icon}</View>}
        <Text style={[
          styles.styledButtonText, 
          { color: isSignIn ? colors.background : colors.text }
        ]}>
          {title}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        <Text style={[styles.subscriptionStatus, { color: colors.text }]}>
          {t('profile.subscriptionStatus', {
            status: isSubscribed ? t('profile.status.active') : t('profile.status.inactive'),
          })}
        </Text>

        <View style={[styles.settingsSection, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
          <View style={styles.settingsHeader}>
            <MaterialIcons name="settings" size={20} color={colors.accent} />
            <Text style={[styles.settingsTitle, { color: colors.text }]}>{t('profile.settings.title')}</Text>
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <MaterialIcons
                name={isDark ? "dark-mode" : "light-mode"}
                size={20}
                color={colors.subtext}
              />
              <Text style={[styles.settingText, { color: colors.text }]}>
                {isDark ? t('profile.settings.darkMode') : t('profile.settings.lightMode')}
              </Text>
            </View>
            <Switch
              value={isDark}
              onValueChange={toggleTheme}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={isDark ? colors.accent : '#f4f3f4'}
            />
          </View>
        </View>

        {!isSubscribed && (
          <View style={styles.buttonContainer}>
            {renderStyledButton(t('profile.buttons.viewSubscriptions'), () => router.push('/subscriptions-paywall'))}
          </View>
        )}
        <View style={styles.buttonContainer}>
          {isRestoring ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            renderStyledButton(t('profile.buttons.restorePurchases'), handleRestorePurchases, isRestoring)
          )}
        </View>
      </View>

      {/* Demo režimo perjungiklis Apple recenzentams */}
      <DemoModeToggle
        textColor={colors.subtext}
        onDemoModeChange={async (isEnabled) => {
          // Atnaujina prenumeratos būseną pasikeitus demo režimui
          if (purchasesContext?.refreshSubscriptionStatus) {
            await purchasesContext.refreshSubscriptionStatus();
          }
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  content: {
    alignItems: 'center',
    width: '90%',
    paddingVertical: 30,
    paddingHorizontal: 20,
  },
  subscriptionStatus: {
    fontSize: 16,
    marginBottom: 25,
    fontWeight: 'bold',
  },
  buttonContainer: {
    marginVertical: 10,
    width: '85%',
    alignItems: 'center',
  },
  styledButton: {
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 30,
    width: '100%',
    alignItems: 'center',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconStyle: {
    marginRight: 10,
  },
  styledButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  disabledButton: {
    opacity: 0.6,
  },
  settingsSection: {
    width: '85%',
    padding: 16,
    borderWidth: 1,
    borderRadius: 12,
    marginBottom: 20,
  },
  settingsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  settingsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingText: {
    fontSize: 16,
    marginLeft: 12,
  },
});
