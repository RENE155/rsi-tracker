import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Linking, Alert } from 'react-native';
import { t } from '@/i18n';

interface LegalLinksProps {
  textColor?: string;
  fontSize?: number;
  style?: any;
}

const LegalLinks: React.FC<LegalLinksProps> = ({ 
  textColor = '#888', 
  fontSize = 14, 
  style 
}) => {
  const handlePrivacyPolicyPress = async () => {
    const url = 'https://raw.githubusercontent.com/RENE155/policy/refs/heads/main/privacy_policy.txt';
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert(t('common.error'), t('legal.errors.privacy'));
      }
    } catch (error) {
      Alert.alert(t('common.error'), t('legal.errors.privacy'));
    }
  };

  const handleTermsOfUsePress = async () => {
    const url = 'https://raw.githubusercontent.com/RENE155/policy/refs/heads/main/terms_of_use.txt';
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert(t('common.error'), t('legal.errors.terms'));
      }
    } catch (error) {
      Alert.alert(t('common.error'), t('legal.errors.terms'));
    }
  };

  return (
    <View style={[styles.container, style]}>
      <Text style={[styles.text, { color: textColor, fontSize }]}>
        {t('legal.text.prefix')}
      </Text>
      <TouchableOpacity onPress={handleTermsOfUsePress}>
        <Text style={[styles.linkText, { color: textColor, fontSize }]}>
          {t('legal.text.terms')}
        </Text>
      </TouchableOpacity>
      <Text style={[styles.text, { color: textColor, fontSize }]}>{t('legal.text.and')}</Text>
      <TouchableOpacity onPress={handlePrivacyPolicyPress}>
        <Text style={[styles.linkText, { color: textColor, fontSize }]}>
          {t('legal.text.privacy')}
        </Text>
      </TouchableOpacity>
      <Text style={[styles.text, { color: textColor, fontSize }]}>{t('legal.text.suffix')}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: 15,
    marginBottom: 10,
  },
  text: {
    textAlign: 'center',
  },
  linkText: {
    textDecorationLine: 'underline',
    fontWeight: '500',
  },
});

export default LegalLinks; 
