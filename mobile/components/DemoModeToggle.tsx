import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { t } from '@/i18n';

const DEMO_MODE_KEY = 'demo_mode_enabled';
const DEMO_MODE_SECRET = 'apple_reviewer_demo_2025';

interface DemoModeToggleProps {
  onDemoModeChange?: (isEnabled: boolean) => void;
  textColor?: string;
}

const DemoModeToggle: React.FC<DemoModeToggleProps> = ({ 
  onDemoModeChange, 
  textColor = '#666' 
}) => {
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [tapCount, setTapCount] = useState(0);
  const [lastTapTime, setLastTapTime] = useState(0);

  useEffect(() => {
    checkDemoMode();
  }, []);

  const checkDemoMode = async () => {
    try {
      const demoModeStatus = await AsyncStorage.getItem(DEMO_MODE_KEY);
      const isEnabled = demoModeStatus === 'true';
      setIsDemoMode(isEnabled);
      onDemoModeChange?.(isEnabled);
    } catch (error) {
      console.error('Error checking demo mode:', error);
    }
  };

  const handleTap = () => {
    const currentTime = Date.now();
    
    // Atstatomas palietimų skaičius, jei praėjo daugiau nei 2 sekundės
    if (currentTime - lastTapTime > 2000) {
      setTapCount(1);
    } else {
      setTapCount(prev => prev + 1);
    }
    
    setLastTapTime(currentTime);

    // Jei vartotojas greitai paliečia 7 kartus, parodomas demo režimo užklausimas
    if (tapCount >= 6) {
      showDemoModePrompt();
      setTapCount(0);
    }
  };

  const showDemoModePrompt = () => {
    Alert.prompt(
      t('demoMode.prompt.title'),
      t('demoMode.prompt.message'),
      [
        {
          text: t('common.cancel'),
          style: 'cancel',
        },
        {
          text: t('demoMode.prompt.enable'),
          onPress: (password) => {
            if (password === DEMO_MODE_SECRET) {
              enableDemoMode();
            } else {
              Alert.alert(t('demoMode.invalidPassword.title'), t('demoMode.invalidPassword.message'));
            }
          },
        },
      ],
      'secure-text'
    );
  };

  const enableDemoMode = async () => {
    try {
      await AsyncStorage.setItem(DEMO_MODE_KEY, 'true');
      setIsDemoMode(true);
      onDemoModeChange?.(true);
      Alert.alert(
        t('demoMode.enabled.title'),
        t('demoMode.enabled.message')
      );
    } catch (error) {
      console.error('Error enabling demo mode:', error);
      Alert.alert(t('common.error'), t('demoMode.enabled.error'));
    }
  };

  const disableDemoMode = async () => {
    Alert.alert(
      t('demoMode.disable.title'),
      t('demoMode.disable.message'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.disable'),
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.removeItem(DEMO_MODE_KEY);
              setIsDemoMode(false);
              onDemoModeChange?.(false);
              Alert.alert(t('demoMode.disabled.title'), t('demoMode.disabled.message'));
            } catch (error) {
              console.error('Error disabling demo mode:', error);
              Alert.alert(t('common.error'), t('demoMode.disabled.error'));
            }
          },
        },
      ]
    );
  };

  if (!isDemoMode) {
    return (
      <TouchableOpacity onPress={handleTap} style={styles.hiddenButton}>
        <Text style={[styles.versionText, { color: textColor }]}>
          v1.0.0
        </Text>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.demoContainer}>
      <TouchableOpacity onPress={disableDemoMode} style={styles.demoButton}>
        <Text style={styles.demoText}>{t('demoMode.badge.title')}</Text>
        <Text style={styles.demoSubtext}>{t('demoMode.badge.subtitle')}</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  hiddenButton: {
    padding: 10,
    alignItems: 'center',
  },
  versionText: {
    fontSize: 12,
    opacity: 0.5,
  },
  demoContainer: {
    padding: 10,
    alignItems: 'center',
  },
  demoButton: {
    backgroundColor: '#FF6B35',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    alignItems: 'center',
  },
  demoText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  demoSubtext: {
    color: 'white',
    fontSize: 10,
    opacity: 0.8,
  },
});

export default DemoModeToggle; 
