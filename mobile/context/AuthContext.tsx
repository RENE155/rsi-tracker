import React, { createContext, useState, useEffect, useContext, useRef } from 'react';
import { createClient, Session, SignInWithPasswordCredentials, SignUpWithPasswordCredentials } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert, Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import Purchases from 'react-native-purchases';
import * as Notifications from 'expo-notifications';
import { type Router } from 'expo-router';
import * as AppleAuthentication from 'expo-apple-authentication';
import { t } from '@/i18n';

// Raktas veiksmui po prisijungimo išsaugoti
const POST_SIGN_IN_ACTION_KEY = 'postSignInAction';

// Inicializuojamas Supabase
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

// Sukuriamas globalus Supabase kliento egzempliorius
export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  })
  : null;

// --- Push pranešimų registracija ---
async function registerForPushNotificationsAsync() {
  if (!supabase) {
    console.error("Supabase client not available for push registration.");
    return;
  }
  if (!Platform.OS) {
    console.warn("Platform OS not available, skipping push registration.");
    return; // Įprastoje RN aplinkoje neturėtų nutikti
  }
  // Pastaba: push pranešimams testuoti reikalingas fizinis įrenginys.
  // Simuliatoriuose / emuliatoriuose jie gali veikti nepatikimai.

  console.log("📱 Checking push notification permissions...");
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    console.log("📱 Requesting push notification permissions...");
    // Apsvarstykite galimybę prieš šią eilutę paaiškinti, *kodėl* reikia leidimų,
    // pageidaujant naudojant pasirinktinį modalą ar pranešimą.
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.warn("📱 Push notification permission not granted:", finalStatus);
    // Pageidaujant informuokite vartotoją, kad jis negaus pranešimų
    // Alert.alert('Notification Permission', 'You will not receive push notifications without granting permission.');
    return;
  }

  console.log("📱 Getting Expo Push Token...");
  try {
    // Naudokite getExpoPushTokenAsync token gauti
    // Apsvarstykite galimybę nurodyti savo projectId, jei naudojate EAS Build/Submit
    // const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    // if (!projectId) {
    //   console.warn("EAS projectId not found, push token might be device-specific.");
    // }
    const tokenData = await Notifications.getExpoPushTokenAsync({
      // projectId: projectId, // Uncomment if you have projectId configured
    });
    const expoPushToken = tokenData.data;
    console.log("📱 Expo Push Token:", expoPushToken);

    // Gaunamas dabartinis vartotojas iš Supabase Auth būsenos (anoniminiams vartotojams gali būti null)
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      console.warn("📱 User not logged in, registering anon push token.");
      const { error } = await supabase
        .from('push_tokens')
        .insert({ user_id: null, token: expoPushToken });

      if (error && error.code !== '23505') {
        console.error("📱 Error inserting anon push token:", error);
        throw error;
      }

      console.log("📱 Anon push token registered (or already exists).");
      return;
    }

    console.log(`📱 Registering token for user ${user.id}...`);

    // Token įterpiamas arba atnaujinamas Supabase 'push_tokens' lentelėje (token turėtų būti globaliai unikalus)
    const { error } = await supabase
      .from('push_tokens')
      .upsert(
        { user_id: user.id, token: expoPushToken },
        { onConflict: 'token' }
      );

    if (error) {
      console.error("📱 Error upserting push token to Supabase:", error);
      // Pageidaujant informuokite vartotoją, kad registracija nepavyko
      // Alert.alert('Error', 'Failed to register for push notifications. Please try again later.');
      throw error; // Iš naujo išmetama, jei reikia kitur
    }

    console.log("📱 Push token registered successfully in Supabase!");

  } catch (error) {
    console.error("📱 Error during push notification registration process:", error);
    // Alert.alert('Error', 'An error occurred while setting up push notifications.');
  }

  // Konfigūruojamas elgesys pranešimams, gaunamiems, kai programa yra priekiniame plane (neprivaloma)
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true, // Rodyti pranešimą, net jei programa atidaryta
      shouldPlaySound: true, // Groti garsą
      shouldSetBadge: false, // Automatiškai nekeisti ženkliuko skaičiaus
    }),
  });
}

// Apibrėžiamas konteksto tipas
type AuthContextType = {
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithApple: () => Promise<void>;
  signInWithEmail: (credentials: SignInWithPasswordCredentials) => Promise<void>;
  signUpWithEmail: (credentials: SignUpWithPasswordCredentials) => Promise<void>;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  refreshSession: () => Promise<void>;
  handleDeepLink: (url: string) => Promise<void>;
  processingDeepLink: boolean;
};

// Sukuriamas kontekstas
export const AuthContext = createContext<AuthContextType | null>(null);

// --- Provider props tipas ---
interface AuthProviderProps {
  children: React.ReactNode;
  router: Router; // Pridedamas router props
}

// Provider komponentas
export const AuthProvider: React.FC<AuthProviderProps> = ({ children, router }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [previousSessionState, setPreviousSessionState] = useState<Session | null>(null); // Sekama ankstesnė sesijos būsena
  const [isLoading, setIsLoading] = useState(true);
  const [processingDeepLink, setProcessingDeepLink] = useState(false);
  // Refs pranešimų klausytojams
  const notificationListener = useRef<Notifications.Subscription | null>(null);
  const deepLinkProcessed = useRef<boolean>(false); // Sekama, ar deep link jau buvo apdorota
  const responseListener = useRef<Notifications.Subscription | null>(null);
  const pushRegistrationAttempted = useRef<boolean>(false);

  // Patikrinama, ar vartotojas autentifikuotas
  const isAuthenticated = !!session;

  // Sesijos atnaujinimo funkcija
  const refreshSession = async () => {
    if (!supabase) return;
    
    try {
      console.log("🔐 Refreshing session...");
      setIsLoading(true);
      const { data, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error("🔐 Error refreshing session:", error);
      } else {
        console.log("🔐 Session refreshed:", data.session ? "Active" : "None");
        setSession(data.session);
      }
    } catch (err) {
      console.error("🔐 Unexpected error refreshing session:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Tvarkoma autentifikacija per Google
  const signInWithGoogle = async () => {
    if (!supabase) {
      console.error("🔐❌ Supabase client not initialized");
      Alert.alert(t('common.error'), t('auth.errors.supabaseNotInitialized'));
      return;
    }
    
    setIsLoading(true);
    // Atstatoma deep link apdorojimo vėliavėlė naujam prisijungimo bandymui
    deepLinkProcessed.current = false;
    console.log("🔐🚀 ===== GOOGLE SIGN-IN START =====");
    console.log("🔐📊 Current session state:", session ? "EXISTS" : "NULL");
    console.log("🔐📊 Current loading state:", isLoading);
    console.log("🔐📊 Current processing deep link:", processingDeepLink);
    
    try {
      console.log("🔐➡️ Starting Google Sign-In flow");
      console.log("🔐🔧 Supabase URL:", supabaseUrl ? "SET" : "MISSING");
      console.log("🔐🔧 Supabase Anon Key:", supabaseAnonKey ? "SET" : "MISSING");
      
      // Inicializuojama WebBrowser sesija
      console.log("🔐🌐 Attempting to complete any existing auth sessions");
      WebBrowser.maybeCompleteAuthSession();
      
      console.log("🔐🔄 Requesting OAuth URL from Supabase");
      console.log("🔐🔄 OAuth provider: google");
      console.log("🔐🔄 Redirect URL: myapp://auth");
      console.log("🔐🔄 Skip browser redirect: true");
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: 'myapp://auth',
          skipBrowserRedirect: true,
          queryParams: {
            prompt: 'select_account',
            access_type: 'offline',
          },
        },
      });
      
      console.log("🔐📥 OAuth response received");
      console.log("🔐📥 Has data:", !!data);
      console.log("🔐📥 Has error:", !!error);
      
      if (error) {
        console.error("🔐❌ Supabase OAuth error:", error);
        console.error("🔐❌ Error message:", error.message);
        console.error("🔐❌ Error status:", error.status);
        console.error("🔐❌ Full error object:", JSON.stringify(error, null, 2));
        throw error;
      }
      
      if (data?.url) {
        const urlParts = data.url.split('?');
        console.log("🔐✅ Got OAuth URL base:", urlParts[0]); 
        console.log("🔐✅ OAuth URL has params:", urlParts.length > 1 ? "YES" : "NO");
        console.log("🔐✅ Full URL length:", data.url.length);
        console.log("🔐🌐 Opening browser for authentication...");
        console.log("🔐🌐 WebBrowser options:", {
          showInRecents: false,
          preferEphemeralSession: true,
        });
        
        const result = await WebBrowser.openAuthSessionAsync(
          data.url,
          'myapp://auth',
          {
            showInRecents: false,
            preferEphemeralSession: true,
          }
        );
        
        console.log("🔐📱 WebBrowser session result received");
        console.log("🔐📱 Result type:", result.type);
        console.log("🔐📱 Full result:", JSON.stringify(result, null, 2));
        
        if (result.type === 'success') {
          console.log("🔐✅ Auth session completed successfully!");
          console.log("🔐⏳ Waiting for deep link handler to process...");
          console.log("🔐⏳ Expected deep link format: myapp://auth#access_token=...");
          
          // RANKINĖ ATSARGINĖ PRIEMONĖ: jei deep link klausytojas neveikia, URL apdorojamas tiesiogiai
          if (result.url && result.url.includes('myapp://auth')) {
            console.log("🔐🔧 MANUAL FALLBACK: Checking if deep link was already processed...");

            // Trumpam palaukiama, kad būtų matyti, ar deep link klausytojas jau tai apdorojo
            await new Promise(resolve => setTimeout(resolve, 500));

            // Rankinė atsarginė priemonė vykdoma tik jei deep link dar nebuvo apdorota
            if (!deepLinkProcessed.current) {
              console.log("🔐🔧 MANUAL FALLBACK: Deep link listener didn't work, processing manually...");
              console.log("🔐🔧 WebBrowser returned URL:", result.url);
              await handleDeepLink(result.url);
            } else {
              console.log("🔐✅ MANUAL FALLBACK: Deep link already processed successfully, skipping manual fallback");
            }
          }
        } else if (result.type === 'cancel') {
          console.log("🔐❌ Auth session was cancelled by user");
          Alert.alert(t('auth.titles.authentication'), t('auth.messages.signInCancelled'));
        } else if (result.type === 'dismiss') {
          console.log("🔐❌ Auth session was dismissed");
          Alert.alert(t('auth.titles.authentication'), t('auth.messages.signInDismissed'));
        } else {
          console.log("🔐❌ Auth session failed with type:", result.type);
          Alert.alert(t('auth.titles.authentication'), t('auth.messages.signInFailed'));
        }
      } else {
        console.error("🔐❌ No OAuth URL received from Supabase");
        console.error("🔐❌ Data object:", JSON.stringify(data, null, 2));
      }
    } catch (error: any) {
      console.error("🔐❌ CATCH BLOCK: Error in Google Sign-In");
      console.error("🔐❌ Error type:", typeof error);
      console.error("🔐❌ Error name:", error?.name);
      console.error("🔐❌ Error message:", error?.message);
      console.error("🔐❌ Error code:", error?.code);
      console.error("🔐❌ Error status:", error?.status);
      console.error("🔐❌ Full error object:", JSON.stringify(error, null, 2));
      console.error("🔐❌ Error stack trace:", error?.stack);
      Alert.alert(t('common.error'), error?.message || t('auth.errors.googleSignInFailed'));
    } finally {
      console.log("🔐🔄 FINALLY BLOCK: Cleaning up auth session...");
      console.log("🔐🔄 Setting loading to false...");
      setIsLoading(false);
      console.log("🔐🔄 Completing auth session...");
      WebBrowser.maybeCompleteAuthSession();
      console.log("🔐🏁 ===== GOOGLE SIGN-IN END =====");
    }
  };

  // Tvarkoma autentifikacija per Apple
  const signInWithApple = async () => {
    if (!supabase) {
      console.error("🔐❌ Supabase client not initialized");
      Alert.alert(t('common.error'), t('auth.errors.supabaseNotInitialized'));
      return;
    }

    if (!AppleAuthentication.isAvailableAsync()) {
      Alert.alert(t('common.error'), t('auth.errors.appleUnavailable'));
      return;
    }

    setIsLoading(true);
    try {
      console.log("🍎 Starting Apple Sign-In flow");
      
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      if (credential.identityToken) {
        console.log("🍎 Apple credential received, signing in with Supabase");
        
        const { data, error } = await supabase.auth.signInWithIdToken({
          provider: 'apple',
          token: credential.identityToken,
        });

        if (error) {
          console.error("🍎❌ Supabase Apple Sign-In error:", error);
          Alert.alert(t('common.error'), error.message || t('auth.errors.appleSignInFailed'));
          throw error;
        }

        if (data.session) {
          console.log("🍎✅ Apple Sign-In successful, session created.");
          setSession(data.session);
          await handleSuccessfulAuthRedirect(true);
        } else {
          console.warn("🍎⚠️ Apple Sign-In succeeded but no session returned");
          Alert.alert(t('auth.titles.loginIssue'), t('auth.messages.sessionMissing'));
        }
      } else {
        console.warn("🍎⚠️ No identity token received from Apple");
        Alert.alert(t('common.error'), t('auth.errors.appleTokenFailed'));
      }
    } catch (error: any) {
      console.error("🍎❌ Apple Sign-In error:", error);
      if (error.code === 'ERR_REQUEST_CANCELED') {
        console.log("🍎 User canceled Apple Sign-In");
        // Vartotojui atšaukus, klaida nerodoma
      } else {
        Alert.alert(t('common.error'), error.message || t('auth.errors.appleSignInFailed'));
      }
    } finally {
      setIsLoading(false);
      console.log("🍎🏁 Apple Sign-In flow completed");
    }
  };

  // Registracija su el. paštu ir slaptažodžiu
  const signUpWithEmail = async (credentials: SignUpWithPasswordCredentials) => {
    if (!supabase) {
      console.error("🔐❌ Supabase client not initialized");
      Alert.alert(t('common.error'), t('auth.errors.supabaseNotInitialized'));
      return;
    }

    setIsLoading(true);
    try {
      console.log("🔐➡️ Starting Email Sign-Up flow");
      const { data, error } = await supabase.auth.signUp(credentials);

      if (error) {
        console.error("🔐❌ Supabase Sign-Up error:", error);
        // Jei įmanoma, pateikiamas konkretesnis atsakas
        if (error.message.includes('User already registered')) {
          Alert.alert(t('auth.titles.signUpFailed'), t('auth.errors.signUpEmailExists'));
        } else {
          Alert.alert(t('auth.titles.signUpFailed'), error.message || t('auth.errors.signUpGeneric'));
        }
        throw error; // Iš naujo išmetama galimam apdorojimui kitur
      }

      if (data.session) {
         console.log("🔐✅ Email Sign-Up successful, session created.");
         setSession(data.session); // Sesija nustatoma iškart, jei grąžinta
         // Pageidaujant po registracijos čia taip pat galima paleisti push registraciją, jei reikia
         if (data.session.user.id) {
           console.log("📱 Triggering push notification registration after sign up...");
           registerForPushNotificationsAsync();
         }
         Alert.alert(t('auth.titles.signUpSuccess'), t('auth.messages.signUpCheckEmail')); // Informuojamas vartotojas apie patvirtinimą
      } else if (data.user && !data.session) {
        // Vartotojas egzistuoja, bet reikia patvirtinimo, MFA ir pan.
         console.log("🔐✅ Email Sign-Up successful, user created but requires verification/action.");
         Alert.alert(t('auth.titles.signUpSuccess'), t('auth.messages.signUpCheckEmail'));
         // Sesija dar nenustatoma, laukiama patvirtinimo ar kitų žingsnių
      } else {
        // Tvarkomi netikėti scenarijai
        console.warn("🔐❓ Sign-Up completed but no session or user data returned.");
         Alert.alert(t('auth.titles.signUpPending'), t('auth.messages.signUpPending'));
      }

    } catch (error: any) {
      // Pagaunamos iš naujo išmestos arba netikėtos klaidos
      console.error("🔐❌ Error in Email Sign-Up:", error);
      // Vengiama dvigubo pranešimo, jei jau apdorota
      if (!error.message?.includes('already registered')) {
         Alert.alert(t('common.error'), error.message || t('auth.errors.signUpEmailFailed'));
      }
    } finally {
      setIsLoading(false);
      console.log("🔐✅ Email Sign-Up flow completed");
    }
  };

  // Prisijungimas su el. paštu ir slaptažodžiu
  const signInWithEmail = async (credentials: SignInWithPasswordCredentials) => {
    if (!supabase) {
      console.error("🔐❌ Supabase client not initialized");
      Alert.alert(t('common.error'), t('auth.errors.supabaseNotInitialized'));
      return;
    }

    setIsLoading(true);
    try {
      console.log("🔐➡️ Starting Email Sign-In flow");
      const { data, error } = await supabase.auth.signInWithPassword(credentials);

      if (error) {
        console.error("🔐❌ Supabase Sign-In error:", error);
         // Pateikiamas konkretesnis atsakas
        if (error.message.includes('Invalid login credentials')) {
            Alert.alert(t('auth.titles.loginFailed'), t('auth.errors.invalidCredentials'));
        } else if (error.message.includes('Email not confirmed')) {
            Alert.alert(t('auth.titles.loginFailed'), t('auth.errors.emailNotVerified'));
        } else {
            Alert.alert(t('auth.titles.loginFailed'), error.message || t('auth.errors.loginGeneric'));
        }
        throw error; // Iš naujo išmetama galimam apdorojimui kitur
      }

      if (data.session) {
        console.log("🔐✅ Email Sign-In successful!");
        setSession(data.session); // Sesija nustatoma sėkmingai prisijungus
        // Push registraciją paprastai paleidžia onAuthStateChange/useEffect,
        // bet prireikus ją galima aiškiai iškviesti čia iškart.
      } else {
         // Tvarkomas netikėtas scenarijus, kai prisijungimas pavyksta, bet sesija negrąžinama
         console.warn("🔐❓ Sign-In successful but no session data returned.");
         Alert.alert(t('auth.titles.loginIssue'), t('auth.messages.sessionMissing'));
      }

    } catch (error: any) {
      // Pagaunamos iš naujo išmestos arba netikėtos klaidos
      console.error("🔐❌ Error in Email Sign-In:", error);
      // Vengiama dvigubo pranešimo, jei jau apdorota
      if (!error.message?.includes('Invalid login credentials') && !error.message?.includes('Email not confirmed')) {
         Alert.alert(t('common.error'), error.message || t('auth.errors.signInEmailFailed'));
      }
    } finally {
      setIsLoading(false);
      console.log("🔐✅ Email Sign-In flow completed");
    }
  };

  // Atsijungimo funkcija
  const signOut = async (): Promise<void> => {
    return new Promise(async (resolve, reject) => {
      if (!supabase) return reject(new Error("Supabase not initialized"));
      
      setIsLoading(true);
      try {
        console.log("🔐 Signing out...");
        const { error } = await supabase.auth.signOut();
        
        if (error) {
          console.error("🔐 Error signing out:", error);
          Alert.alert(t('common.error'), t('auth.errors.signOutFailed'));
          reject(error); // Įvykus klaidai promise atmetamas
        } else {
          console.log("🔐 Successfully signed out");
          setSession(null);
          // Promise išsprendžiamas *po* to, kai sesija nustatoma į null
          resolve();
        }
      } catch (err) {
        console.error("🔐 Unexpected error signing out:", err);
        reject(err); // Atmetama įvykus netikėtoms klaidoms
      } finally {
        // Užtikrinama, kad isLoading būtų nustatytas į false, net jei promise išspręstas/atmestas anksčiau
        setIsLoading(false);
      }
    });
  };

  const deleteAccount = async (): Promise<void> => {
    if (!supabase || !supabaseUrl || !supabaseAnonKey) {
      throw new Error(t('auth.errors.accountDeletionUnavailable'));
    }
    if (!session) {
      throw new Error(t('auth.errors.deleteRequiresSignIn'));
    }

    console.log("🔐🗑️ Initiating account deletion flow for user:", session.user.id);
    setIsLoading(true);
    try {
      // Geriausiomis pastangomis pašalinami push pranešimų token, kad neliktų našlaičių įrašų.
      try {
        await supabase
          .from('push_tokens')
          .delete()
          .eq('user_id', session.user.id);
        console.log("🔐🗑️ Removed push tokens for user:", session.user.id);
      } catch (cleanupError) {
        console.warn("🔐🗑️ Failed to cleanup push tokens (non-blocking):", cleanupError);
      }

      const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          apikey: supabaseAnonKey,
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("🔐🗑️ Account deletion request failed:", errorText);
        throw new Error(errorText || t('auth.errors.deleteFailed'));
      }

      console.log("🔐🗑️ Account deletion completed, signing user out locally.");
      await supabase.auth.signOut();
      setSession(null);
    } catch (error) {
      console.error("🔐🗑️ Error deleting account:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to delete account.";
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Funkcija nukreipimui po sėkmingos autentifikacijos tvarkyti (perkelta iš AuthStateListener)
  const handleSuccessfulAuthRedirect = async (triggerSignInToast = false) => {
    let navigationAction = { pathname: '/', params: {} as Record<string, any> }; // Numatytoji navigacija
    
    try {
      const storedActionString = await AsyncStorage.getItem(POST_SIGN_IN_ACTION_KEY);
      if (storedActionString) {
        console.log(`🔐 Found post-sign-in action string: ${storedActionString}`);
        const storedAction = JSON.parse(storedActionString);
        
        await AsyncStorage.removeItem(POST_SIGN_IN_ACTION_KEY);
        console.log(`🔐 Cleared post-sign-in action.`);

        if (storedAction.redirectPath) {
          navigationAction.pathname = storedAction.redirectPath;
          if (storedAction.redirectPath === '/subscriptions-paywall' && storedAction.packageId) {
            console.log(`🔐 Will redirect to paywall with package ID: ${storedAction.packageId}`);
            navigationAction.params = { autoPurchasePackageId: storedAction.packageId };
          } else {
            console.log(`🔐 Will redirect to: ${storedAction.redirectPath} (no package ID or not paywall)`);
            navigationAction.params = {}; 
          }
        } else {
           console.log("🔐 Stored action missing redirectPath, using default.");
        }
      } else {
        console.log("🔐 No specific redirect action found, using default.");
      }
    } catch (e) {
      console.error("🚨 Failed to read, parse, or clear post-sign-in action:", e);
      navigationAction = { pathname: '/', params: {} }; 
    }
    
    if (triggerSignInToast) {
      navigationAction.params.signedIn = 'true';
    }

    console.log(`🔐 Redirecting to:`, navigationAction);
    // Konvertuojama į any, kad atitiktų router.replace tipą
    router.replace(navigationAction as any);
  };

  // Tvarkomas deep link URL autentifikacijai
  const handleDeepLink = async (url: string): Promise<void> => {
    console.log("🔐🌟 ===== DEEP LINK HANDLER START =====");
    console.log("🔐📝 URL received:", url);
    console.log("🔐📊 Has Supabase:", !!supabase);
    console.log("🔐📊 Has URL:", !!url);
    console.log("🔐📊 Is processing:", processingDeepLink);
    
    if (!supabase || !url || processingDeepLink) {
      console.log("🔐❌ Deep link handler skipped:", {
        hasSupabase: !!supabase,
        hasUrl: !!url,
        isProcessing: processingDeepLink
      });
      return;
    }
    
    console.log("🔐➡️ Starting deep link processing");
    console.log("🔐🔍 Full deep link URL received:", url); // Registruojamas visas URL derinimui
    console.log("🔐🔍 URL length:", url.length);
    console.log("🔐🔍 URL protocol:", url.split('://')[0]);
    setProcessingDeepLink(true);
    
    // Deep link NEDELSIANT pažymima kaip apdorojama, kad būtų išvengta rankinės atsarginės priemonės
    deepLinkProcessed.current = true;
    console.log("🔐🚀 Deep link processing flag set to prevent duplicate execution");
    
    try {
      let accessToken = null;
      let refreshToken = null;
      let errorParam = null;
      let errorDescription = null;
      
      // Pirmiausia patikrinama, ar nėra klaidų
      if (url.includes('error=')) {
        console.log("🔐🚨 ERROR DETECTED in URL");
        const urlParams = new URLSearchParams(url.split('?')[1] || url.split('#')[1] || '');
        errorParam = urlParams.get('error');
        errorDescription = urlParams.get('error_description');
        console.error("🔐❌ OAuth Error:", errorParam);
        console.error("🔐❌ Error Description:", errorDescription);
      }
      
      // Pirmiausia bandoma išgauti token iš URL fragmento (#access_token=...)
      const hashIndex = url.indexOf('#');
      console.log("🔐🔍 Hash index position:", hashIndex);
      
      if (hashIndex !== -1) {
        console.log("🔐🔍 Found URL fragment, checking for tokens...");
        const fragment = url.substring(hashIndex + 1);
        console.log("🔐🔍 Fragment content length:", fragment.length);
        console.log("🔐🔍 Fragment preview:", fragment.substring(0, 100) + "...");
        
        const fragmentParams = new URLSearchParams(fragment);
        console.log("🔐🔍 Fragment params count:", Array.from(fragmentParams.entries()).length);
        
        // Registruojami visi fragmento parametrai (saugiai)
        for (const [key, value] of fragmentParams.entries()) {
          if (key === 'access_token' || key === 'refresh_token') {
            console.log(`🔐🔑 Fragment param ${key}:`, value ? `${value.substring(0, 10)}...` : "EMPTY");
          } else {
            console.log(`🔐🔑 Fragment param ${key}:`, value);
          }
        }
        
        accessToken = fragmentParams.get('access_token');
        refreshToken = fragmentParams.get('refresh_token');
        
        console.log("🔐🔑 Fragment tokens extraction result:", { 
          accessToken: accessToken ? `LENGTH=${accessToken.length}, START=${accessToken.substring(0, 10)}...` : "Missing",
          refreshToken: refreshToken ? `LENGTH=${refreshToken.length}, START=${refreshToken.substring(0, 10)}...` : "Missing"
        });
      } else {
        console.log("🔐🔍 No hash fragment found in URL");
      }
      
      // Jei fragmente token nėra, bandomi query parametrai (?access_token=...)
      if (!accessToken && !refreshToken) {
        console.log("🔐🔍 No tokens in fragment, checking query parameters...");
        const questionIndex = url.indexOf('?');
        console.log("🔐🔍 Question mark index:", questionIndex);
        
        if (questionIndex !== -1) {
          const queryString = url.substring(questionIndex + 1);
          // Pašalinama fragmento dalis, jei ji yra
          const cleanQueryString = queryString.split('#')[0];
          console.log("🔐🔍 Query string length:", cleanQueryString.length);
          console.log("🔐🔍 Query string preview:", cleanQueryString.substring(0, 100) + "...");
          
          const queryParams = new URLSearchParams(cleanQueryString);
          console.log("🔐🔍 Query params count:", Array.from(queryParams.entries()).length);
          
          // Registruojami visi query parametrai (saugiai)
          for (const [key, value] of queryParams.entries()) {
            if (key === 'access_token' || key === 'refresh_token') {
              console.log(`🔐🔑 Query param ${key}:`, value ? `${value.substring(0, 10)}...` : "EMPTY");
            } else {
              console.log(`🔐🔑 Query param ${key}:`, value);
            }
          }
          
          accessToken = queryParams.get('access_token');
          refreshToken = queryParams.get('refresh_token');
          
          console.log("🔐🔑 Query tokens extraction result:", { 
            accessToken: accessToken ? `LENGTH=${accessToken.length}, START=${accessToken.substring(0, 10)}...` : "Missing",
            refreshToken: refreshToken ? `LENGTH=${refreshToken.length}, START=${refreshToken.substring(0, 10)}...` : "Missing"
          });
        } else {
          console.log("🔐🔍 No query parameters found in URL");
        }
      }
      
      if (accessToken && refreshToken) {
        console.log("🔐💾 Both tokens found! Setting session...");
        console.log("🔐💾 Access token valid:", !!accessToken && accessToken.length > 0);
        console.log("🔐💾 Refresh token valid:", !!refreshToken && refreshToken.length > 0);
        
        // Sesija nustatoma su išgautais token
        const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken
        });
        
        console.log("🔐💾 setSession completed");
        console.log("🔐💾 Has session data:", !!sessionData);
        console.log("🔐💾 Has session error:", !!sessionError);
        
        if (sessionError) {
          console.error("🔐❌ Error setting session:", sessionError);
          console.error("🔐❌ Session error message:", sessionError.message);
          console.error("🔐❌ Session error status:", sessionError.status);
          console.error("🔐❌ Full session error:", JSON.stringify(sessionError, null, 2));
          Alert.alert(t('common.error'), t('auth.errors.setSessionFailed'));
        } else {
          console.log("🔐✅ Session set successfully via deep link!");
          console.log("🔐✅ Session details:", {
            hasSession: !!sessionData.session,
            userEmail: sessionData.session?.user?.email,
            userId: sessionData.session?.user?.id,
            userMetadata: sessionData.session?.user?.user_metadata,
            expiresAt: sessionData.session?.expires_at
          });

          console.log("🔐✅ Deep link session set complete - auth state listener will handle redirect and push notifications");
        }
      } else {
        console.error("🔐❌ MISSING TOKENS!");
        console.error("🔐❌ Access token present:", !!accessToken);
        console.error("🔐❌ Refresh token present:", !!refreshToken);
        console.error("🔐❌ URL structure may be incorrect");
        console.error("🔐❌ Expected format: myapp://auth#access_token=...&refresh_token=...");
        
        if (errorParam) {
          Alert.alert(
            t('auth.titles.authenticationError'),
            t('auth.errors.authErrorWithDescription', {
              error: errorParam,
              description: errorDescription || t('common.unknownError'),
            })
          );
        } else {
          Alert.alert(t('auth.titles.authenticationError'), t('auth.errors.authTokenExtractionFailed'));
        }
      }
    } catch (error) {
      console.error("🔐❌ CATCH BLOCK: Error processing deep link");
      console.error("🔐❌ Error type:", typeof error);
      console.error("🔐❌ Error message:", error instanceof Error ? error.message : String(error));
      console.error("🔐❌ Error stack:", error instanceof Error ? error.stack : undefined);
      console.error("🔐❌ Full error object:", JSON.stringify(error, null, 2));
      Alert.alert(t('auth.titles.authenticationError'), t('auth.errors.authUnexpected'));
    } finally {
      console.log("🔐🔄 FINALLY BLOCK: Deep link processing cleanup");
      console.log("🔐🔄 Setting processingDeepLink to false...");
      setProcessingDeepLink(false);
      console.log("🔐🏁 ===== DEEP LINK HANDLER END =====");
    }
  };

  // Klausomasi autentifikacijos būsenos pokyčių ir nustatomi pranešimų klausytojai
  useEffect(() => {
    if (!supabase) return;

    // Inicializuojama autentifikacijos būsena
    refreshSession();

    // Registruojamasi push pranešimams programos paleidimo metu (saugu anonimams)
    if (!pushRegistrationAttempted.current) {
      pushRegistrationAttempted.current = true;
      registerForPushNotificationsAsync();
    }

    // Užsiprenumeruojami autentifikacijos būsenos pokyčiai
    const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, currentAuthSession) => {
      console.log("🔐 Auth state changed:", { event: _event, hasSession: !!currentAuthSession });

      // Atnaujinama ankstesnė sesijos būsena *prieš* nustatant naują
      setPreviousSessionState(session);

      // Atnaujinama dabartinė sesijos būsena
      setSession(currentAuthSession);
      setIsLoading(false);

      // ---> PALEIDŽIAMAS NUKREIPIMAS PRISIJUNGUS (SIGN_IN) <---
      // Nukreipiama tik jei įvykis yra SIGNED_IN ir sesijos būsena *buvo* null prieš šį atnaujinimą.
      // Naudojama aukščiau užfiksuota būsena.
      if (_event === 'SIGNED_IN' && previousSessionState === null) {
        console.log("🔐 SIGNED_IN event detected (and previous session was null), triggering redirect...");
        await handleSuccessfulAuthRedirect(true); // Paleidžiamas nukreipimas su toast

        // ---> REGISTRUOJAMASI PUSH PRANEŠIMAMS PRISIJUNGUS (SIGN_IN) <---
        if (currentAuthSession?.user?.id) {
          console.log("📱🔔 Registering push notifications after successful sign-in...");
          registerForPushNotificationsAsync();
        }
      }
      
      // === RevenueCat integracija ===
      try {
        if (currentAuthSession) {
          // Vartotojas prisijungė arba sesija atnaujinta
          console.log(`🦁 Attempting RevenueCat login with App User ID: ${currentAuthSession.user.id}`);
          console.log(`🦁 >> Calling Purchases.logIn now...`);
          const { customerInfo, created } = await Purchases.logIn(currentAuthSession.user.id);
          console.log(`🦁 << Purchases.logIn finished.`);
          console.log(
            `🦁 RevenueCat login ${created ? "created new user" : "successful"}: CustomerInfo User ID: ${customerInfo.originalAppUserId}`
          );
        } else {
          // Vartotojas atsijungė
          console.log("🦁 Attempting RevenueCat logout...");
          console.log("🦁 >> Calling Purchases.logOut now...");
          const customerInfo = await Purchases.logOut();
          console.log("🦁 << Purchases.logOut finished.");
          console.log("🦁 RevenueCat logout successful", customerInfo.originalAppUserId);
        }
      } catch (error: any) {
        // Patikrinama dėl konkrečios nekenksmingos „jau anoniminis“ atsijungimo klaidos
        const isHarmlessLogoutError = !currentAuthSession && error.code?.toString() === "22";

        if (isHarmlessLogoutError) {
          console.log("🦁 RevenueCat logout reported 'user already anonymous', which is expected.");
        } else {
          // Kitos prisijungimo/atsijungimo klaidos registruojamos įprastai
          console.error(`🦁 RevenueCat ${currentAuthSession ? 'login' : 'logout'} error:`, {
            code: error.code,
            message: error.message,
            underlyingErrorMessage: error.underlyingErrorMessage,
          });
        }
      }
      // ===========================
    });

    // --- Nustatomi pranešimų klausytojai ---
    console.log("📱 Setting up notification listeners...");

    // Klausytojas, kai pranešimas gaunamas programai veikiant
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      console.log('📱🔔 Notification Received (App Running):', JSON.stringify(notification, null, 2));
      // Čia galėtumėte atnaujinti programos būseną pagal pranešimą
    });

    // Klausytojas, kai vartotojas sąveikauja su pranešimu (jį paliečia)
    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('📱👆 Notification Interaction (Tapped):', JSON.stringify(response, null, 2));
      // Čia galėtumėte nukreipti į konkretų ekraną pagal atsakymą
      // const screen = response.notification.request.content.data?.screen;
      // if (screen) { /* navigate... */ }
    });

    console.log("📱 Notification listeners set up.");
    // ------------------------------------

    // Išvalymo funkcija
    return () => {
      console.log("🔐 Cleaning up auth and notification listeners...");
      // Atsisakoma autentifikacijos pokyčių prenumeratos
      authListener.subscription.unsubscribe();

      // Pašalinami pranešimų klausytojai
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(notificationListener.current);
        console.log("📱 Removed notification received listener.");
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
        console.log("📱 Removed notification response listener.");
      }
    };
  }, []); // Tuščias priklausomybių masyvas užtikrina, kad tai įvyks tik kartą prijungiant komponentą

  const value = {
    session,
    isLoading,
    isAuthenticated,
    signInWithGoogle,
    signInWithApple,
    signInWithEmail,
    signUpWithEmail,
    signOut,
    deleteAccount,
    refreshSession,
    handleDeepLink,
    processingDeepLink,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Custom hook, skirtas naudoti auth kontekstą
export const useAuth = () => {
  const context = useContext(AuthContext);
  
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  
  return context;
}; 
