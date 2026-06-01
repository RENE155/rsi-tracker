import React, { useContext, useState, useEffect } from 'react';
import { View, Text, StyleSheet, SectionList, TouchableOpacity, ActivityIndicator, Alert, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import PurchasesContext from '@/context/PurchasesContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStatus } from '@/app/_layout';
import { useTheme } from '@/context/ThemeContext';
import { useOnboarding } from '@/context/OnboardingContext';
import { t } from '@/i18n';

// --- Įrašų tipai apibrėžiami lokaliai (jei neeksportuoti iš _layout) ---
// Užtikrinkite, kad jie atitiktų apibrėžimus _layout.tsx faile, arba juos importuokite
interface RsiEntry {
    symbol: string;
    rsi: number | null;
    funding_rate?: number | null;
    funding_rate_percent?: string | null;
    daily_rsi?: number | null;
}

interface FundingEntry {
    symbol: string;
    rsi?: number | null;
    daily_rsi?: number | null;
    funding_rate: number | null;
    funding_rate_percent: string | null;
}

// Apibrėžiama StatusData sąsaja su reikalingomis savybėmis
interface StatusData {
    top_5_rsi?: RsiEntry[];
    bottom_5_rsi?: RsiEntry[];
    highest_5_funding?: FundingEntry[];
    lowest_5_funding?: FundingEntry[];
    status?: string;
    websocket_status?: string;
    websocket_connected?: boolean;
    tracked_symbol_count?: number;
    subscribed_symbol_count?: number;
    rsi_calculated_count?: number;
    reconnect_attempts?: number;
    funding_rates_count?: number;
    ticker_subscribed_count?: number;
    [key: string]: any; // Leidžia kitas savybes
}

// Sąjungos tipas SectionList elementams
type ListItem =
  | { type: 'rsi'; data: RsiEntry }
  | { type: 'funding'; data: FundingEntry };

// SectionList sekcijų tipas
interface DataSection {
  title: string;
  type: 'rsi-high' | 'rsi-low' | 'funding-high' | 'funding-low';
  data: ListItem[];
}

export default function RsiTrackerScreen() {
  const router = useRouter();
  const purchasesContext = useContext(PurchasesContext);
  const isSubscribed = purchasesContext?.isSubscribed || false;
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { loading: onboardingLoading, hasCompletedOnboarding } = useOnboarding();

  // --- Būsenos duomenys gaunami iš konteksto su aiškiu tipu ---
  const { statusData, refreshing, isConnected } = useStatus() as {
    statusData: StatusData | null,
    refreshing: boolean,
    isConnected: boolean
  };

  // Animacijos reikšmė pulsuojančiam efektui
  const [pulseAnim] = useState(new Animated.Value(1));

  // Paruošiami duomenys SectionList
  const sections: DataSection[] = React.useMemo(() => {
    const s: DataSection[] = [];

    // Aukštas RSI
    const rsiHigh = statusData?.top_5_rsi || [];
    if (rsiHigh.length > 0) {
      s.push({
        title: t('home.sections.rsiHigh'),
        type: 'rsi-high',
        data: rsiHigh.map((item: RsiEntry) => ({ type: 'rsi', data: item })),
      });
    }

    // Žemas RSI
    const rsiLow = statusData?.bottom_5_rsi || [];
    if (rsiLow.length > 0) {
      s.push({
        title: t('home.sections.rsiLow'),
        type: 'rsi-low',
        // Apverčiama tvarka rodymui
        data: [...rsiLow].reverse().map((item: RsiEntry) => ({ type: 'rsi', data: item })),
      });
    }

    // Aukštas funding
    const fundingHigh = statusData?.highest_5_funding || [];
    if (fundingHigh.length > 0) {
        s.push({
            title: t('home.sections.fundingHigh'),
            type: 'funding-high',
            data: [...fundingHigh].reverse().map((item: FundingEntry) => ({ type: 'funding', data: item })),
        });
    }

    // Žemas funding
    const fundingLow = statusData?.lowest_5_funding || [];
    if (fundingLow.length > 0) {
        s.push({
            title: t('home.sections.fundingLow'),
            type: 'funding-low',
            // Rodoma didėjančia tvarka, kad mažiausias (labiausiai neigiamas) būtų pirmas
            data: fundingLow.map((item: FundingEntry) => ({ type: 'funding', data: item })),
        });
    }

    return s;
  }, [statusData]); // Perskaičiuojama, kai pasikeičia statusData

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

  const handleLockedItemPress = () => {
    Alert.alert(
      t('home.premium.title'),
      t('home.premium.message'),
      [
        { text: t('common.notNow'), style: "cancel" },
        { text: t('common.subscribe'), onPress: () => router.push('/subscriptions-paywall') }
      ]
    );
  };

  const renderSectionHeader = ({ section }: { section: DataSection }) => {
    return (
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionHeaderText, { color: colors.accent }]}>{section.title}</Text>
      </View>
    );
  };
  
  // --- Pagalbinė funkcija RSI spalvai ---
  const getRsiColor = (rsi: number | null): string => {
      if (rsi === null || typeof rsi !== 'number') return '#A0AEC0'; // Numatytoji pilka null/netinkamoms reikšmėms
      if (rsi >= 70) return '#FF3B30'; // Perpirkta - raudona
      if (rsi <= 30) return '#34C759'; // Perparduota - žalia
      return '#007AFF'; // Įprasta - mėlyna
  };

  // --- Pagalbinė funkcija Funding Rate spalvai (tvarko undefined) ---
  const getFundingRateColor = (rate: number | null | undefined): string => {
      if (rate === null || rate === undefined || typeof rate !== 'number') return '#A0AEC0'; // Numatytoji pilka
      if (rate > 0) return '#34C759'; // Teigiama - žalia
      if (rate < 0) return '#FF3B30'; // Neigiama - raudona
      return '#A0AEC0'; // Nulis - pilka
  };

  const renderItem = ({ item, index, section }: { item: ListItem, index: number, section: DataSection }) => {
    const symbol = item.data.symbol;
    const isLocked = !isSubscribed;
    
    return (
      <TouchableOpacity
        style={styles.itemWrapper}
        onPress={() => isLocked ? handleLockedItemPress() : router.push(`/stock/${symbol}` as any)}
      >
        <View style={[
          styles.itemContainer,
          { 
            backgroundColor: colors.cardBackground,
            opacity: isLocked ? 0.65 : 1,
          } 
        ]}>
          <View style={styles.itemContent}>
            {/* Kairė pusė: simbolis ir dienos RSI (jei taikoma) */}
            <View style={styles.symbolWrapper}>
              <Text style={[styles.symbolText, { color: colors.text }]}>{symbol}</Text>
              {item.data.daily_rsi !== undefined && typeof item.data.daily_rsi === 'number' && (
                <View style={[
                  styles.d1RsiBadge, 
                  { backgroundColor: getRsiColor(item.data.daily_rsi) }
                ]}>
                  <Text style={styles.d1RsiText}>
                    {t('home.labels.oneDayValue', { value: item.data.daily_rsi.toFixed(1) })}
                  </Text>
                </View>
              )}
              {item.data.daily_rsi === null && (
                <View style={[styles.d1RsiBadge, { backgroundColor: colors.border }]}>
                  <Text style={styles.d1RsiText}>{t('home.labels.noOneDay')}</Text>
                </View>
              )}
            </View>

            {/* Dešinė pusė: RSI arba Funding Rate */}
            <View style={styles.valueWrapper}>
              {item.type === 'rsi' && (
                  <>
                      <Text style={[styles.valueLabel, { color: colors.subtext }]}>{t('home.labels.rsi4h')}</Text>
                      <Text style={[styles.valueText, { color: getRsiColor(item.data.rsi) }]}>
                          {typeof item.data.rsi === 'number' ? item.data.rsi.toFixed(1) : t('common.na')}
                      </Text>
                  </>
              )}
              {item.type === 'funding' && (
                  <>
                      <Text style={[styles.valueLabel, { color: colors.subtext }]}>{t('home.labels.funding')}</Text>
                      <Text style={[styles.valueText, { color: getFundingRateColor(item.data.funding_rate) }]}>
                          {item.data.funding_rate_percent ?? t('common.na')}
                      </Text>
                  </>
              )}
               {/* Pageidaujant funding rate gali būti rodomas ir RSI elementams */}
               {item.type === 'rsi' && item.data.funding_rate_percent && (
                   <>
                       <Text style={[styles.secondaryValueLabel, { color: colors.subtext }]}>{t('home.labels.funding')}</Text>
                       <Text style={[styles.secondaryValueText, { color: getFundingRateColor(item.data.funding_rate) }]}>
                           {item.data.funding_rate_percent}
                       </Text>
                   </>
               )}
               
               {/* Funding elementams RSI rodomas kaip antrinė informacija */}
               {item.type === 'funding' && item.data.rsi !== undefined && (
                   <>
                       <Text style={[styles.secondaryValueLabel, { color: colors.subtext }]}>{t('home.labels.rsi4h')}</Text>
                       <Text style={[styles.secondaryValueText, { color: getRsiColor(item.data.rsi) }]}>
                           {typeof item.data.rsi === 'number' ? item.data.rsi.toFixed(1) : t('common.na')}
                       </Text>
                   </>
               )}
            </View>
          </View>

          {isLocked && (
            <Animated.View 
              style={[
                styles.lockOverlay,
                { transform: [{ scale: pulseAnim }] }
              ]}
            >
              <MaterialIcons name="lock" size={24} color="white" />
              <Text style={styles.lockText}>{t('home.premium.badge')}</Text>
            </Animated.View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  // Nustatoma įkėlimo/klaidos būsena
  const isLoading = statusData === null && refreshing;
  const hasData = sections.length > 0;

  if (onboardingLoading || !hasCompletedOnboarding) {
    return <View style={[styles.blockingContainer, { backgroundColor: colors.background }]} />;
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>      
      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.text }]}>{t('home.loading.title')}</Text>
          <Text style={[styles.loadingSubText, { color: colors.subtext }]}>{t('home.loading.subtitle')}</Text>
        </View>
      ) : !hasData ? (
        <View style={styles.centered}>
          {isConnected ? (
            <>
              <MaterialIcons name="signal-cellular-nodata" size={48} color={colors.primary} />
              <Text style={[styles.noDataText, { color: colors.text }]}>{t('home.noData.title')}</Text>
              <Text style={[styles.noDataSubText, { color: colors.subtext }]}>{t('home.noData.subtitle')}</Text>
            </>
          ) : (
            <>
              <MaterialIcons name="signal-wifi-off" size={48} color={colors.error} />
              <Text style={[styles.errorText, { color: colors.error }]}>{t('home.error.connection')}</Text>
            </>
          )}
        </View>
      ) : (
        <SectionList
          sections={sections}
          renderItem={renderItem}
          renderSectionHeader={renderSectionHeader}
          keyExtractor={(item, index) => `${item.type}-${item.data.symbol}-${index}`}
          contentContainerStyle={styles.listContent}
          stickySectionHeadersEnabled={false} // Neprivaloma: antraštės slenka kartu su turiniu
          extraData={isSubscribed} // Perpiešia elementus, jei pasikeičia prenumeratos būsena
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 15,
    paddingTop: 10,
    paddingBottom: 100,
  },
  itemWrapper: {
    marginBottom: 12,
    borderRadius: 14,
  },
  itemContainer: {
    borderRadius: 14,
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  itemContent: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  symbolWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1, // Leidžia simbolio sričiai prireikus susitraukti
    marginRight: 10, // Prideda tarpą tarp simbolio ir reikšmės
  },
  symbolText: {
    fontSize: 18, // Šiek tiek mažesnis
    fontWeight: '600',
    letterSpacing: 0.3,
    marginRight: 8, // Tarpas prieš ženkliuką
  },
  valueWrapper: {
    alignItems: 'flex-end', // Lygiuoja reikšmes į dešinę
    minWidth: 80, // Užtikrina minimalų plotį lygiavimui
  },
  valueLabel: {
    fontSize: 11,
    fontWeight: '500',
    marginBottom: 2,
  },
  valueText: {
    fontSize: 17, // Šiek tiek mažesnis
    fontWeight: '700',
    textAlign: 'right',
  },
  secondaryValueLabel: {
      fontSize: 9,
      marginTop: 3, // Tarpas virš funding rate etiketės
      marginBottom: 1,
      textAlign: 'right',
  },
  secondaryValueText: {
      fontSize: 12, // Mažesnis šriftas antrinei informacijai
      fontWeight: '600',
      textAlign: 'right',
  },
  lockOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  lockText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  d1RsiBadge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 10,
    marginLeft: 5, // Sumažintas tarpas
  },
  d1RsiText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    textAlign: 'center',
    fontSize: 16,
    marginTop: 12,
  },
  noDataText: {
    textAlign: 'center',
    fontSize: 16,
    marginTop: 12,
  },
   noDataSubText: {
    textAlign: 'center',
    fontSize: 13,
    marginTop: 6,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  loadingSubText: {
    marginTop: 6,
    fontSize: 13,
    fontStyle: 'italic',
  },
  sectionHeader: {
    // backgroundColor: 'rgba(26, 34, 56, 0.8)',
    paddingVertical: 8,
    paddingHorizontal: 5, // Sumažintas horizontalus vidinis tarpas
    marginTop: 15, // Daugiau tarpo virš sekcijos antraštės
    marginBottom: 8,
    // borderRadius: 8,
    // borderLeftWidth: 3,
    // borderLeftColor: '#A9B4FC',
    borderBottomWidth: 1,
    borderBottomColor: '#2A3A5F',
  },
  sectionHeaderText: {
    fontSize: 14,
    fontWeight: 'bold',
    textTransform: 'uppercase', // Išryškina antraštę
    letterSpacing: 0.5,
  },
  blockingContainer: {
    flex: 1,
  },
});
