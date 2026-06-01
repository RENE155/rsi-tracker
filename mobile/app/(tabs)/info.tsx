import React, { useContext, useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Linking, Animated, TouchableOpacity, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import PurchasesContext from '@/context/PurchasesContext';
import { useTheme } from '@/context/ThemeContext';
import { t } from '@/i18n';

export default function InfoScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const purchasesContext = useContext(PurchasesContext);
  const isSubscribed = purchasesContext?.isSubscribed || false;
  const { colors } = useTheme();
  
  // Animacijos reikšmė pulsuojančiam efektui
  const [pulseAnim] = useState(new Animated.Value(1));

  // Paleidžiama pulsuojanti animacija užrakintiems elementams
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const handleSubscribePress = () => {
    Alert.alert(
      t('info.alerts.premiumFeature.title'),
      t('info.alerts.premiumFeature.message'),
      [
        { text: t('common.notNow'), style: "cancel" },
        { text: t('common.subscribe'), onPress: () => router.push('/subscriptions-paywall') }
      ]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <View style={[styles.header, { backgroundColor: colors.cardBackground, borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>{t('info.headerTitle')}</Text>
      </View>
      
      <View style={styles.contentContainer}>
        {isSubscribed ? (
          // Prenumeratoriai mato visą turinį
          <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent}>
            <View style={[styles.section, { backgroundColor: colors.cardBackground }]}>
              <View style={styles.sectionHeader}>
                <MaterialIcons name="info-outline" size={24} color={colors.accent} />
                <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('info.sections.about.title')}</Text>
              </View>
              <Text style={[styles.paragraph, { color: colors.subtext }]}>
                {t('info.sections.about.body')}
              </Text>
              <View style={styles.bulletContainer}>
                <Text style={[styles.bulletPoint, { color: colors.subtext }]}>
                  • <Text style={[styles.highlight, { color: colors.accent }]}>{t('info.sections.about.bullets.rsiAbove70.label')}</Text>: {t('info.sections.about.bullets.rsiAbove70.text')}
                </Text>
                <Text style={[styles.bulletPoint, { color: colors.subtext }]}>
                  • <Text style={[styles.highlight, { color: colors.accent }]}>{t('info.sections.about.bullets.rsiBelow30.label')}</Text>: {t('info.sections.about.bullets.rsiBelow30.text')}
                </Text>
                <Text style={[styles.bulletPoint, { color: colors.subtext }]}>
                  • <Text style={[styles.highlight, { color: colors.accent }]}>{t('info.sections.about.bullets.rsi4h.label')}</Text>: {t('info.sections.about.bullets.rsi4h.text')}
                </Text>
                <Text style={[styles.bulletPoint, { color: colors.subtext }]}>
                  • <Text style={[styles.highlight, { color: colors.accent }]}>{t('info.sections.about.bullets.rsi1d.label')}</Text>: {t('info.sections.about.bullets.rsi1d.text')}
                </Text>
                <Text style={[styles.bulletPoint, { color: colors.subtext }]}>
                  • <Text style={[styles.highlight, { color: colors.accent }]}>{t('info.sections.about.bullets.rsi50.label')}</Text>: {t('info.sections.about.bullets.rsi50.text')}
                </Text>
              </View>
            </View>

            <View style={[styles.section, { backgroundColor: colors.cardBackground }]}>
              <View style={styles.sectionHeader}>
                <MaterialIcons name="trending-up" size={24} color={colors.accent} />
                <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('info.sections.reading.title')}</Text>
              </View>
              <Text style={[styles.paragraph, { color: colors.subtext }]}>
                {t('info.sections.reading.body')}
              </Text>
              <View style={styles.bulletContainer}>
                <Text style={[styles.bulletPoint, { color: colors.subtext }]}>
                  • <Text style={[styles.highlight, { color: colors.accent }]}>{t('info.sections.reading.bullets.redRsi.label')}</Text>: {t('info.sections.reading.bullets.redRsi.text')}
                </Text>
                <Text style={[styles.bulletPoint, { color: colors.subtext }]}>
                  • <Text style={[styles.highlight, { color: colors.accent }]}>{t('info.sections.reading.bullets.greenRsi.label')}</Text>: {t('info.sections.reading.bullets.greenRsi.text')}
                </Text>
                <Text style={[styles.bulletPoint, { color: colors.subtext }]}>
                  • <Text style={[styles.highlight, { color: colors.accent }]}>{t('info.sections.reading.bullets.day1.label')}</Text>: {t('info.sections.reading.bullets.day1.text')}
                </Text>
                <Text style={[styles.bulletPoint, { color: colors.subtext }]}>
                  • <Text style={[styles.highlight, { color: colors.accent }]}>{t('info.sections.reading.bullets.funding.label')}</Text>: {t('info.sections.reading.bullets.funding.text')}
                </Text>
                <Text style={[styles.bulletPoint, { color: colors.subtext }]}>
                  • <Text style={[styles.highlight, { color: colors.accent }]}>{t('info.sections.reading.bullets.volume.label')}</Text>: {t('info.sections.reading.bullets.volume.text')}
                </Text>
              </View>
            </View>

            <View style={[styles.section, { backgroundColor: colors.cardBackground }]}>
              <View style={styles.sectionHeader}>
                <MaterialIcons name="auto-awesome" size={24} color="#FFA500" />
                <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('info.sections.grok.title')}</Text>
              </View>
              <Text style={[styles.paragraph, { color: colors.subtext }]}>
                {t('info.sections.grok.body')}
              </Text>
              <View style={styles.bulletContainer}>
                <Text style={[styles.bulletPoint, { color: colors.subtext }]}>
                  • <Text style={[styles.highlight, { color: colors.accent }]}>{t('info.sections.grok.bullets.sentiment.label')}</Text>: {t('info.sections.grok.bullets.sentiment.text')}
                </Text>
                <Text style={[styles.bulletPoint, { color: colors.subtext }]}>
                  • <Text style={[styles.highlight, { color: colors.accent }]}>{t('info.sections.grok.bullets.influencer.label')}</Text>: {t('info.sections.grok.bullets.influencer.text')}
                </Text>
                <Text style={[styles.bulletPoint, { color: colors.subtext }]}>
                  • <Text style={[styles.highlight, { color: colors.accent }]}>{t('info.sections.grok.bullets.news.label')}</Text>: {t('info.sections.grok.bullets.news.text')}
                </Text>
                <Text style={[styles.bulletPoint, { color: colors.subtext }]}>
                  • <Text style={[styles.highlight, { color: colors.accent }]}>{t('info.sections.grok.bullets.momentum.label')}</Text>: {t('info.sections.grok.bullets.momentum.text')}
                </Text>
                <Text style={[styles.bulletPoint, { color: colors.subtext }]}>
                  • <Text style={[styles.highlight, { color: colors.accent }]}>{t('info.sections.grok.bullets.confidence.label')}</Text>: {t('info.sections.grok.bullets.confidence.text')}
                </Text>
              </View>
              <Text style={[styles.paragraph, { color: colors.subtext, marginTop: 10 }]}>
                {t('info.sections.grok.footer')}
              </Text>
            </View>

            <View style={[styles.section, { backgroundColor: colors.cardBackground }]}>
              <View style={styles.sectionHeader}>
                <MaterialIcons name="psychology" size={24} color={colors.accent} />
                <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('info.sections.psychology.title')}</Text>
              </View>
              <Text style={[styles.paragraph, { color: colors.subtext }]}>
                {t('info.sections.psychology.body')}
              </Text>
              <View style={styles.bulletContainer}>
                <Text style={[styles.bulletPoint, { color: colors.subtext }]}>
                  • <Text style={[styles.highlight, { color: colors.accent }]}>{t('info.sections.psychology.bullets.rsi80.label')}</Text>: {t('info.sections.psychology.bullets.rsi80.text')}
                </Text>
                <Text style={[styles.bulletPoint, { color: colors.subtext }]}>
                  • <Text style={[styles.highlight, { color: colors.accent }]}>{t('info.sections.psychology.bullets.rsi20.label')}</Text>: {t('info.sections.psychology.bullets.rsi20.text')}
                </Text>
                <Text style={[styles.bulletPoint, { color: colors.subtext }]}>
                  • <Text style={[styles.highlight, { color: colors.accent }]}>{t('info.sections.psychology.bullets.divergence.label')}</Text>: {t('info.sections.psychology.bullets.divergence.text')}
                </Text>
                <Text style={[styles.bulletPoint, { color: colors.subtext }]}>
                  • <Text style={[styles.highlight, { color: colors.accent }]}>{t('info.sections.psychology.bullets.hiddenDivergence.label')}</Text>: {t('info.sections.psychology.bullets.hiddenDivergence.text')}
                </Text>
              </View>
            </View>

            <View style={[styles.section, { backgroundColor: colors.cardBackground }]}>
              <View style={styles.sectionHeader}>
                <MaterialIcons name="school" size={24} color={colors.accent} />
                <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('info.sections.examples.title')}</Text>
              </View>
              <Text style={[styles.paragraph, { color: colors.subtext }]}>
                {t('info.sections.examples.body')}
              </Text>
              <View style={styles.bulletContainer}>
                <Text style={[styles.bulletPoint, { color: colors.subtext }]}>
                  • <Text style={[styles.highlight, { color: colors.accent }]}>{t('info.sections.examples.bullets.bull.label')}</Text>: {t('info.sections.examples.bullets.bull.text')}
                </Text>
                <Text style={[styles.bulletPoint, { color: colors.subtext }]}>
                  • <Text style={[styles.highlight, { color: colors.accent }]}>{t('info.sections.examples.bullets.bear.label')}</Text>: {t('info.sections.examples.bullets.bear.text')}
                </Text>
                <Text style={[styles.bulletPoint, { color: colors.subtext }]}>
                  • <Text style={[styles.highlight, { color: colors.accent }]}>{t('info.sections.examples.bullets.range.label')}</Text>: {t('info.sections.examples.bullets.range.text')}
                </Text>
                <Text style={[styles.bulletPoint, { color: colors.subtext }]}>
                  • <Text style={[styles.highlight, { color: colors.accent }]}>{t('info.sections.examples.bullets.breakout.label')}</Text>: {t('info.sections.examples.bullets.breakout.text')}
                </Text>
              </View>
            </View>

            <View style={[styles.section, { backgroundColor: colors.cardBackground }]}>
              <View style={styles.sectionHeader}>
                <MaterialIcons name="lightbulb-outline" size={24} color={colors.accent} />
                <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('info.sections.strategies.title')}</Text>
              </View>
              <Text style={[styles.paragraph, { color: colors.subtext }]}>
                {t('info.sections.strategies.body')}
              </Text>
              <View style={styles.bulletContainer}>
                <Text style={[styles.bulletPoint, { color: colors.subtext }]}>
                  • <Text style={[styles.highlight, { color: colors.accent }]}>{t('info.sections.strategies.bullets.timeframes.label')}</Text>: {t('info.sections.strategies.bullets.timeframes.text')}
                </Text>
                <Text style={[styles.bulletPoint, { color: colors.subtext }]}>
                  • <Text style={[styles.highlight, { color: colors.accent }]}>{t('info.sections.strategies.bullets.support.label')}</Text>: {t('info.sections.strategies.bullets.support.text')}
                </Text>
                <Text style={[styles.bulletPoint, { color: colors.subtext }]}>
                  • <Text style={[styles.highlight, { color: colors.accent }]}>{t('info.sections.strategies.bullets.trend.label')}</Text>: {t('info.sections.strategies.bullets.trend.text')}
                </Text>
                <Text style={[styles.bulletPoint, { color: colors.subtext }]}>
                  • <Text style={[styles.highlight, { color: colors.accent }]}>{t('info.sections.strategies.bullets.risk.label')}</Text>: {t('info.sections.strategies.bullets.risk.text')}
                </Text>
                <Text style={[styles.bulletPoint, { color: colors.subtext }]}>
                  • <Text style={[styles.highlight, { color: colors.accent }]}>{t('info.sections.strategies.bullets.confluence.label')}</Text>: {t('info.sections.strategies.bullets.confluence.text')}
                </Text>
              </View>
            </View>

            <View style={[styles.section, { backgroundColor: colors.cardBackground }]}>
              <View style={styles.sectionHeader}>
                <MaterialIcons name="warning" size={24} color={colors.accent} />
                <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('info.sections.mistakes.title')}</Text>
              </View>
              <Text style={[styles.paragraph, { color: colors.subtext }]}>
                {t('info.sections.mistakes.body')}
              </Text>
              <View style={styles.bulletContainer}>
                <Text style={[styles.bulletPoint, { color: colors.subtext }]}>
                  • <Text style={[styles.highlight, { color: colors.accent }]}>{t('info.sections.mistakes.bullets.knives.label')}</Text>: {t('info.sections.mistakes.bullets.knives.text')}
                </Text>
                <Text style={[styles.bulletPoint, { color: colors.subtext }]}>
                  • <Text style={[styles.highlight, { color: colors.accent }]}>{t('info.sections.mistakes.bullets.trend.label')}</Text>: {t('info.sections.mistakes.bullets.trend.text')}
                </Text>
                <Text style={[styles.bulletPoint, { color: colors.subtext }]}>
                  • <Text style={[styles.highlight, { color: colors.accent }]}>{t('info.sections.mistakes.bullets.context.label')}</Text>: {t('info.sections.mistakes.bullets.context.text')}
                </Text>
                <Text style={[styles.bulletPoint, { color: colors.subtext }]}>
                  • <Text style={[styles.highlight, { color: colors.accent }]}>{t('info.sections.mistakes.bullets.overtrading.label')}</Text>: {t('info.sections.mistakes.bullets.overtrading.text')}
                </Text>
              </View>
            </View>

            <View style={[styles.section, { backgroundColor: colors.cardBackground }]}>
              <View style={styles.sectionHeader}>
                <MaterialIcons name="notification-important" size={24} color={colors.accent} />
                <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('info.sections.disclaimer.title')}</Text>
              </View>
              <Text style={[styles.disclaimer, { color: colors.error }]}>
                {t('info.sections.disclaimer.body')}
              </Text>
            </View>
          </ScrollView>
        ) : (
          // Neprenumeruojantys vartotojai mato užrakto perdangą
          <View style={styles.lockedContainer}>
            <View style={[styles.previewSection, { backgroundColor: colors.cardBackground }]}>
              <View style={styles.sectionHeader}>
                <MaterialIcons name="info-outline" size={24} color={colors.accent} />
                <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('info.sections.about.title')}</Text>
              </View>
              <Text style={[styles.paragraph, { color: colors.subtext }]}>
                {t('info.preview.about.body')}
              </Text>
              <View style={styles.bulletContainer}>
                <Text style={[styles.bulletPoint, { color: colors.subtext }]}>
                  • {t('info.preview.about.bullets.rsiAbove70')}
                </Text>
                <Text style={[styles.bulletPoint, { color: colors.subtext }]}>
                  • {t('info.preview.about.bullets.rsiBelow30')}
                </Text>
              </View>
            </View>
            
            <Animated.View 
              style={[
                styles.lockOverlay,
                { transform: [{ scale: pulseAnim }] }
              ]}
            >
              <View style={styles.lockContent}>
                <MaterialIcons name="lock" size={50} color="white" />
                <Text style={styles.lockTitle}>{t('info.locked.title')}</Text>
                <Text style={styles.lockText}>
                  {t('info.locked.body')}
                </Text>
                <TouchableOpacity 
                  style={[styles.subscribeButton, { backgroundColor: colors.accent }]}
                  onPress={handleSubscribePress}
                >
                  <Text style={[styles.subscribeButtonText, { color: colors.cardBackground }]}>{t('info.locked.cta')}</Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  contentContainer: {
    flex: 1,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  section: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  lockedContainer: {
    flex: 1,
    position: 'relative',
    padding: 20,
  },
  previewSection: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
    opacity: 0.5, // Padaro peržiūrą šiek tiek išblukusią
  },
  lockOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 16,
  },
  lockContent: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
    width: '85%',
  },
  lockTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 12,
  },
  lockText: {
    color: '#A0AEC0',
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  subscribeButton: {
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 8,
    marginTop: 10,
  },
  subscribeButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  paragraph: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 10,
  },
  bulletContainer: {
    marginLeft: 6,
  },
  bulletPoint: {
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 8,
  },
  highlight: {
    fontWeight: '600',
  },
  disclaimer: {
    fontSize: 14,
    lineHeight: 20,
    fontStyle: 'italic',
  },
}); 
