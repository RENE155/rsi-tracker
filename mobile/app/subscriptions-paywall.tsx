import React, { useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import PurchasesContext from '@/context/PurchasesContext';
import { PurchasesPackage } from 'react-native-purchases';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import LegalLinks from '@/components/LegalLinks';
import { t } from '@/i18n';

const PLAN_ORDER = ['QUARTERLY', 'MONTHLY', 'ANNUAL', 'WEEKLY', 'LIFETIME'];

const AnimatedLinearGradient = Animated.createAnimatedComponent(LinearGradient);

export default function SubscriptionsPaywall() {
  const router = useRouter();
  const params = useLocalSearchParams<{ autoPurchasePackageId?: string }>();
  const purchasesContext = useContext(PurchasesContext);

  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const halo = useRef(new Animated.Value(0)).current;
  const planMeta: Record<string, { tagline: string; badge?: string }> = {
    QUARTERLY: {
      tagline: t('paywall.planMeta.quarterly.tagline'),
      badge: t('paywall.planMeta.quarterly.badge'),
    },
    MONTHLY: { tagline: t('paywall.planMeta.monthly.tagline') },
    ANNUAL: {
      tagline: t('paywall.planMeta.annual.tagline'),
      badge: t('paywall.planMeta.annual.badge'),
    },
    WEEKLY: { tagline: t('paywall.planMeta.weekly.tagline') },
    LIFETIME: { tagline: t('paywall.planMeta.lifetime.tagline') },
  };
  const limitedPoints = [t('paywall.comparison.limited.one')];
  const premiumPoints = [
    t('paywall.comparison.premium.one'),
    t('paywall.comparison.premium.two'),
    t('paywall.comparison.premium.three'),
  ];
  const benefits = [
    t('paywall.benefits.one'),
    t('paywall.benefits.two'),
    t('paywall.benefits.three'),
    t('paywall.benefits.four'),
  ];
  const getPeriodLabel = (type: string) => {
    switch (type) {
      case 'WEEKLY':
        return t('paywall.period.week');
      case 'MONTHLY':
        return t('paywall.period.month');
      case 'QUARTERLY':
        return t('paywall.period.quarter');
      case 'ANNUAL':
        return t('paywall.period.year');
      case 'LIFETIME':
        return t('paywall.period.lifetime');
      default:
        return t('paywall.period.term');
    }
  };

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(halo, { toValue: 1, duration: 2500, useNativeDriver: true }),
        Animated.timing(halo, { toValue: 0, duration: 2500, useNativeDriver: true }),
      ])
    ).start();
  }, [halo]);

  useEffect(() => {
    const autoPurchasePackageId = params.autoPurchasePackageId;

    if (
      autoPurchasePackageId &&
      purchasesContext?.currentOffering &&
      purchasesContext?.purchasePackage
    ) {
      const match = purchasesContext.currentOffering.availablePackages.find(
        (pkg) => pkg.identifier === autoPurchasePackageId
      );
      if (match) {
        purchasesContext.purchasePackage(match).catch((error) => {
          if (!error.userCancelled) {
            Alert.alert(
              t('paywall.alerts.purchaseFailedTitle'),
              error.message || t('paywall.alerts.purchaseFailedMessage')
            );
          }
        });
      }
      router.setParams({ autoPurchasePackageId: undefined });
    }
  }, [
    params.autoPurchasePackageId,
    purchasesContext?.currentOffering,
    purchasesContext?.purchasePackage,
    router,
  ]);

  if (!purchasesContext) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>{t('paywall.loading.subscriptionInfo')}</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.replace('/(tabs)')}>
          <Text style={styles.backButtonText}>{t('common.goBack')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const { currentOffering, purchasePackage, isSubscribed } = purchasesContext;

  const packages = useMemo(() => {
    const available = currentOffering?.availablePackages ?? [];
    return [...available].sort((a, b) => {
      const orderA = PLAN_ORDER.indexOf(a.packageType as string);
      const orderB = PLAN_ORDER.indexOf(b.packageType as string);
      return (orderA === -1 ? PLAN_ORDER.length : orderA) - (orderB === -1 ? PLAN_ORDER.length : orderB);
    });
  }, [currentOffering?.availablePackages]);

  useEffect(() => {
    if (!packages.length) {
      setSelectedPlanId(null);
      return;
    }
    setSelectedPlanId((prev) => {
      if (prev && packages.some((pkg) => pkg.identifier === prev)) {
        return prev;
      }
      const preferred = packages.find((pkg) => pkg.packageType === 'QUARTERLY') || packages[0];
      return preferred.identifier;
    });
  }, [packages]);

  const selectedPackage = packages.find((pkg) => pkg.identifier === selectedPlanId);

  const handlePurchase = async (pkg: PurchasesPackage) => {
    try {
      await purchasePackage(pkg);
      Alert.alert(t('paywall.alerts.purchaseSuccessTitle'), t('paywall.alerts.purchaseSuccessMessage'));
      router.replace('/(tabs)');
    } catch (error: any) {
      if (error.userCancelled) {
        return;
      }
      Alert.alert(
        t('paywall.alerts.purchaseFailedTitle'),
        error.message || t('paywall.alerts.purchaseFailedMessage')
      );
    }
  };

  if (isSubscribed) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>{t('paywall.loading.alreadySubscribed')}</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.replace('/(tabs)')}>
          <Text style={styles.backButtonText}>{t('common.goBack')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!currentOffering || !packages.length) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>{t('paywall.loading.noOptions')}</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.replace('/(tabs)')}>
          <Text style={styles.backButtonText}>{t('common.goBack')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.heroWrapper}>
        <Animated.View
          pointerEvents="none"
          style={[
            styles.heroHalo,
            {
              opacity: halo.interpolate({ inputRange: [0, 1], outputRange: [0.4, 0.9] }),
              transform: [
                {
                  scale: halo.interpolate({ inputRange: [0, 1], outputRange: [0.95, 1.05] }),
                },
              ],
            },
          ]}
        />
        <AnimatedLinearGradient
          colors={['#0C1325', '#080E1C']}
          style={styles.heroCard}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Text style={styles.heroLabel}>{t('paywall.hero.label')}</Text>
          <Text style={styles.heroTitle}>{t('paywall.hero.title')}</Text>
          <Text style={styles.heroSubtitle}>
            {t('paywall.hero.subtitle')}
          </Text>
          <View style={styles.heroStatsRow}>
            <View style={styles.heroStat}>
              <Text style={styles.heroStatValue}>12,400+</Text>
              <Text style={styles.heroStatLabel}>{t('paywall.hero.stats.alerts')}</Text>
            </View>
            <View style={styles.heroStat}>
              <Text style={styles.heroStatValue}>58</Text>
              <Text style={styles.heroStatLabel}>{t('paywall.hero.stats.countries')}</Text>
            </View>
            <View style={styles.heroStat}>
              <Text style={styles.heroStatValue}>500+</Text>
              <Text style={styles.heroStatLabel}>{t('paywall.hero.stats.pairs')}</Text>
            </View>
          </View>
        </AnimatedLinearGradient>
      </View>

      <View style={styles.comparisonCard}>
        <Text style={styles.comparisonTitle}>{t('paywall.comparison.title')}</Text>
        <View style={styles.comparisonColumns}>
          <View style={styles.comparisonColumn}>
            {limitedPoints.map((point) => (
              <View key={point} style={styles.comparisonRow}>
                <Ionicons name="time-outline" color="#F87171" size={18} />
                <Text style={styles.comparisonText}>{point}</Text>
              </View>
            ))}
          </View>
          <View style={styles.comparisonDivider} />
          <View style={styles.comparisonColumn}>
            {premiumPoints.map((point) => (
              <View key={point} style={styles.comparisonRow}>
                <Ionicons name="flash-outline" color="#5DEEC3" size={18} />
                <Text style={styles.comparisonText}>{point}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>

      <Text style={styles.sectionHeading}>{t('paywall.plan.choose')}</Text>
      {packages.map((pkg) => {
        const meta = planMeta[pkg.packageType] || { tagline: t('paywall.plan.fallbackTagline') };
        const isActive = selectedPlanId === pkg.identifier;
        return (
          <TouchableOpacity
            key={pkg.identifier}
            style={[styles.planCard, isActive && styles.planCardActive]}
            onPress={() => setSelectedPlanId(pkg.identifier)}
            activeOpacity={0.9}
          >
            <View style={styles.planHeader}>
              <Text style={styles.planName}>{pkg.product.title || pkg.packageType}</Text>
              {meta.badge && (
                <View style={styles.planBadge}>
                  <Text style={styles.planBadgeText}>{meta.badge}</Text>
                </View>
              )}
            </View>
            <Text style={styles.planPrice}>
              {pkg.product.priceString}
              <Text style={styles.planPeriod}>/{getPeriodLabel(pkg.packageType)}</Text>
            </Text>
            <Text style={styles.planTagline}>{meta.tagline}</Text>
            <View style={styles.planPerkRow}>
              <Ionicons name="checkmark-circle" color="#5DEEC3" size={16} />
              <Text style={styles.planPerkText}>{t('paywall.plan.perks.priorityFeed')}</Text>
            </View>
            <View style={styles.planPerkRow}>
              <Ionicons name="checkmark-circle" color="#5DEEC3" size={16} />
              <Text style={styles.planPerkText}>{t('paywall.plan.perks.unlimitedPairs')}</Text>
            </View>
          </TouchableOpacity>
        );
      })}

      <View style={styles.benefitCard}>
        <Text style={styles.sectionHeading}>{t('paywall.benefits.title')}</Text>
        {benefits.map((benefit) => (
          <View key={benefit} style={styles.planPerkRow}>
            <Ionicons name="shield-checkmark" size={18} color="#5DEEC3" />
            <Text style={styles.planPerkText}>{benefit}</Text>
          </View>
        ))}
      </View>

      <TouchableOpacity
        style={[styles.primaryButton, !selectedPackage && styles.disabledButton]}
        disabled={!selectedPackage}
        onPress={() => selectedPackage && handlePurchase(selectedPackage)}
      >
        <Text style={styles.primaryButtonText}>{t('paywall.primaryCta.title')}</Text>
        {selectedPackage && (
          <Text style={styles.primarySubtext}>
            {t('paywall.primaryCta.subtext', {
              price: selectedPackage.product.priceString,
              period: getPeriodLabel(selectedPackage.packageType),
            })}
          </Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity style={styles.secondaryButton} onPress={() => router.replace('/(tabs)')}>
        <Text style={styles.secondaryText}>{t('paywall.secondaryCta')}</Text>
      </TouchableOpacity>

      <LegalLinks textColor="#7F859F" fontSize={12} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#04070F',
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 80,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#04070F',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    color: '#E8ECFF',
    fontSize: 16,
    marginBottom: 16,
    textAlign: 'center',
  },
  backButton: {
    borderWidth: 1,
    borderColor: '#1F2436',
    paddingVertical: 10,
    paddingHorizontal: 30,
    borderRadius: 12,
  },
  backButtonText: {
    color: '#9AA0B9',
  },
  heroWrapper: {
    marginBottom: 24,
  },
  heroHalo: {
    position: 'absolute',
    top: -10,
    left: -10,
    right: -10,
    bottom: -10,
    borderRadius: 32,
    backgroundColor: '#5DEEC3',
  },
  heroCard: {
    borderRadius: 32,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  heroLabel: {
    color: '#5DEEC3',
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontSize: 12,
  },
  heroTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '700',
    marginTop: 12,
  },
  heroSubtitle: {
    color: '#C8CEE3',
    marginTop: 8,
    fontSize: 15,
  },
  heroStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 18,
  },
  heroStat: {
    alignItems: 'flex-start',
  },
  heroStatValue: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  heroStatLabel: {
    color: '#9AA0B9',
    fontSize: 12,
    marginTop: 4,
  },
  comparisonCard: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 24,
    padding: 18,
    marginBottom: 20,
  },
  comparisonTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  comparisonColumns: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  comparisonColumn: {
    flex: 1,
  },
  comparisonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  comparisonText: {
    color: '#C8CEE3',
    marginLeft: 8,
    fontSize: 13,
    flex: 1,
  },
  comparisonDivider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginHorizontal: 14,
  },
  sectionHeading: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  planCard: {
    backgroundColor: '#0A0F1F',
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    marginBottom: 16,
  },
  planCardActive: {
    borderColor: '#5DEEC3',
    shadowColor: '#5DEEC3',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  planName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  planBadge: {
    backgroundColor: '#5DEEC3',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  planBadgeText: {
    color: '#0B0F19',
    fontSize: 10,
    fontWeight: '700',
  },
  planPrice: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '700',
  },
  planPeriod: {
    color: '#9AA0B9',
    fontSize: 14,
    marginLeft: 4,
  },
  planTagline: {
    color: '#9AA0B9',
    marginTop: 4,
    marginBottom: 10,
  },
  planPerkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  planPerkText: {
    color: '#E8ECFF',
    marginLeft: 8,
    fontSize: 13,
    flex: 1,
  },
  benefitCard: {
    backgroundColor: '#0A0F1F',
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    marginBottom: 20,
  },
  primaryButton: {
    backgroundColor: '#5DEEC3',
    borderRadius: 20,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  disabledButton: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: '#04070F',
    fontSize: 16,
    fontWeight: '700',
  },
  primarySubtext: {
    color: '#04070F',
    fontSize: 12,
    marginTop: 4,
  },
  secondaryButton: {
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  secondaryText: {
    color: '#7F859F',
    textAlign: 'center',
    fontSize: 13,
  },
});
