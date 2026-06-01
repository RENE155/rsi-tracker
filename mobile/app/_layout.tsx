import React, { useState, useEffect, useCallback, createContext, useContext } from 'react';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, useRouter, useSegments, type Router } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import PurchasesProvider from "@/context/PurchasesProvider";
import { Platform, StatusBar, SafeAreaView, StyleSheet, View, ActivityIndicator } from 'react-native';
import { setBackgroundColorAsync } from 'expo-system-ui';
import { AuthProvider } from '@/context/AuthContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Header from '@/components/Header';
import Toast from 'react-native-toast-message';
import { ThemeProvider as CustomThemeProvider } from '@/context/ThemeContext';
import { OnboardingProvider, useOnboarding } from '@/context/OnboardingContext';

import { useColorScheme } from '@/components/useColorScheme';


export {
  // Pagauna visas Layout komponento išmestas klaidas.
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  // Užtikrina, kad perkraunant `/modal` išliktų atgalinis mygtukas.
  // initialRouteName: '(tabs)', // Removed this line
};

// Neleidžia užsklandos ekranui automatiškai pasislėpti, kol nebaigtas išteklių įkėlimas.
SplashScreen.preventAutoHideAsync();

// Būsenos duomenų sąsaja (perkelta iš index.tsx)
// --- Apibrėžiama RsiEntry lokaliai, jei neimportuota arba neapibrėžta globaliai ---
interface RsiEntry {
    symbol: string;
    rsi: number | null;
    funding_rate?: number | null; // Neprivalomas skaičius
    funding_rate_percent?: string | null; // Neprivaloma eilutė
    daily_rsi?: number | null; // 1D RSI laukas iš API
    // Pašalinta section savybė, prireikus bus tvarkoma kitaip
}

// Funding Rate įrašų sąsaja
interface FundingEntry {
    symbol: string;
    rsi?: number | null;
    daily_rsi?: number | null;
    funding_rate: number | null;
    funding_rate_percent: string | null;
}

interface StatusData {
  status?: string;
  websocket_status?: string;
  websocket_connected?: boolean;
  last_message_time_ago_s?: number | null;
  tracked_symbol_count?: number;
  subscribed_symbol_count?: number;
  ticker_subscribed_count?: number;
  rsi_calculated_count?: number;
  funding_rates_count?: number;
  reconnect_attempts?: number;
  top_5_rsi?: RsiEntry[]; 
  bottom_5_rsi?: RsiEntry[]; 
  highest_5_funding?: FundingEntry[]; // Updated property name
  lowest_5_funding?: FundingEntry[]; // Updated property name
}

// Backend URL ir apklausos intervalas (perkelta iš index.tsx)
const BACKEND_STATUS_URL = 'https://rsi-ve57.onrender.com/status';
const POLLING_INTERVAL_MS = 10000;

// --- Konteksto apibrėžimas ---
interface StatusContextProps {
  statusData: StatusData | null;
  refreshing: boolean;
  isConnected: boolean;
  fetchStatus: () => Promise<void>; // Atskleidžia gavimo funkciją
}

// Sukuriamas kontekstas su numatytąja reikšme
const StatusContext = createContext<StatusContextProps>({
  statusData: null,
  refreshing: false,
  isConnected: false,
  fetchStatus: async () => {}, // Numatytoji tuščia funkcija
});

// Custom hook, skirtas naudoti StatusContext
export const useStatus = () => useContext(StatusContext);

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    ...FontAwesome.font,
  });

  // Ryšio būsenos ir atnaujinimo state
  const [statusData, setStatusData] = useState<StatusData | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const isConnected = statusData?.websocket_connected ?? false;

  // Būsenos gavimo logika
  const fetchStatus = useCallback(async () => {
      // refreshing nustatomas į true tik tada, jei dar nevyksta gavimas (kad nebūtų greito perjungimo)
      // Naudojamas state kintamasis sekti, ar gavimas šiuo metu vyksta
      // Šis patikrinimas išvengia kelių vienalaikių gavimų, kuriuos sukelia apklausa ar rankinis atnaujinimas
      // if (refreshing) return; // Prevent re-entrancy

      setRefreshing(true); // Nurodo, kad gavimas prasidėjo
      try {
        const response = await fetch(BACKEND_STATUS_URL);
        if (!response.ok) {
          console.warn(`HTTP error fetching status: ${response.status}`);
          // Ar laikinai įvykus klaidai išsaugoti esamus duomenis? Galbūt nustatyti isConnected į false?
          // setStatusData(prev => ({ ...prev, websocket_connected: false })); // Example
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data: StatusData = await response.json();
        setStatusData(data); // Atnaujina state su visais naujais duomenimis
      } catch (err: any) {
        console.error("Error fetching status in layout:", err);
        // Išvalyti duomenis ar nustatyti konkrečią klaidos būseną gavimui nepavykus
        // setStatusData(null);
        // Įvykus klaidai nurodo atjungtą būseną
        setStatusData(prev => ({ ...(prev ?? {}), websocket_connected: false, websocket_status: 'error' }));
      } finally {
        setRefreshing(false); // Nurodo, kad gavimas baigtas
      }
    // Ar įtraukti refreshing į priklausomybes? Ne, tai sukelia ciklus. Paliekama tuščia.
    }, []);

  // Expo Router naudoja Error Boundaries klaidoms navigacijos medyje pagauti.
  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  // Apklausa būsenos atnaujinimams
  useEffect(() => {
    fetchStatus(); // Pradinis gavimas
    const intervalId = setInterval(fetchStatus, POLLING_INTERVAL_MS);
    return () => clearInterval(intervalId); // Išvalo intervalą atjungiant komponentą
  }, [fetchStatus]); // fetchStatus yra stabilus dėl useCallback []

  if (!loaded) {
    return null;
  }

  // Pateikiama būsenos konteksto reikšmė
  const contextValue = {
    statusData, // Perduodamas visas būsenos duomenų objektas
    refreshing,
    isConnected, // Išvedama iš statusData.websocket_connected
    fetchStatus, // Perduodama gavimo funkcija
  };

  return (
    <StatusContext.Provider value={contextValue}>
      <OnboardingProvider>
        <RootLayoutNav />
      </OnboardingProvider>
    </StatusContext.Provider>
  );
}

// Pašalinamas props perdavimas isConnected, refreshing reikšmėms
function RootLayoutNav() {
  const colorScheme = useColorScheme();
  const { top } = useSafeAreaInsets();
  const router = useRouter();
  const segments = useSegments();
  // Čia naudojamas kontekstas, kad būtų perduotas į Header
  const { isConnected, refreshing } = useStatus();
  const { loading: onboardingLoading, hasCompletedOnboarding } = useOnboarding();

  const firstSegment = Array.isArray(segments) && segments.length > 0 ? segments[0] : undefined;
  const allowedWhileIncomplete = new Set(['onboarding', 'subscriptions-paywall']);
  const isOnboardingRoute = firstSegment === 'onboarding';
  const isAllowedWhileIncomplete = firstSegment ? allowedWhileIncomplete.has(firstSegment) : false;

  useEffect(() => {
    if (onboardingLoading) {
      return;
    }

    if (!hasCompletedOnboarding && !isAllowedWhileIncomplete) {
      router.replace('/onboarding');
    }
  }, [hasCompletedOnboarding, onboardingLoading, isAllowedWhileIncomplete, router]);

  const shouldBlockUI = onboardingLoading || (!hasCompletedOnboarding && !isAllowedWhileIncomplete);

  return (
    <AuthProvider router={router}>
      <PurchasesProvider>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <CustomThemeProvider>
            <SafeAreaView style={[styles.safeArea, { paddingTop: top }]}>
              <StatusBar barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'} />
              {/* Header paslėptas onboarding metu, kad būtų galima pilno ekrano meninė kompozicija */}
              {!isOnboardingRoute && <Header isConnected={isConnected} refreshing={refreshing} />}
              <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="onboarding" />
                <Stack.Screen name="(tabs)" />
                {/* <Stack.Screen name="modal" options={{ presentation: 'modal' }} /> */}
                <Stack.Screen name="subscriptions-paywall" />
                {/* Prireikus užtikrinama, kad būtų ir kiti reikalingi ekranai, pvz., stock/[symbol] */}
              </Stack>
              {shouldBlockUI && (
                <View style={styles.blockingOverlay}>
                  <ActivityIndicator size="large" color={colorScheme === 'dark' ? '#ffffff' : '#000000'} />
                </View>
              )}
            </SafeAreaView>
          </CustomThemeProvider>
        </ThemeProvider>
        <Toast />
      </PurchasesProvider>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    // Fono spalvą dabar tvarko tėvinis View
  },
  blockingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#04070F',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
});
