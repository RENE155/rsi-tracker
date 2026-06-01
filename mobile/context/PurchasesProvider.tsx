// context/PurchasesProvider.tsx
import React, { useEffect, useState, useRef } from "react";
import PurchasesContext from "./PurchasesContext";
import Purchases, {
  CustomerInfo,
  LOG_LEVEL,
  PurchasesOffering,
  PurchasesPackage,
} from "react-native-purchases";
import { Platform, AppState, AppStateStatus } from "react-native";
import { Alert } from "react-native";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { t } from '@/i18n';

type PurchasesProviderProps = {
  children: JSX.Element | JSX.Element[];
};

const androidApiKey = process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_ANDROID!;
const iosApiKey = process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_IOS!;
const STATIC_LIFETIME_PRODUCT_IDS = new Set<string>(['com.renaldas.tst2.lifetime']);
//qq
const PurchasesProvider: React.FC<PurchasesProviderProps> = ({ children }) => {
  const [initialized, setInitialized] = useState(false);
  const [offering, setOffering] = useState<PurchasesOffering | null>(null);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo>();
  const [isDemoMode, setIsDemoMode] = useState(false);

  const appState = useRef(AppState.currentState);
  const customerInfoListener = useRef<any>(null); // Sekamas klausytojas išvalymui

  const init = async () => {
    try {
      // Išplėsta derinimo informacija
      const apiKey = Platform.OS === "android" ? androidApiKey : iosApiKey;
      const maskedKey = apiKey ? `${apiKey.substring(0, 6)}...${apiKey.substring(apiKey.length - 4)}` : "undefined";
      console.log(`Initializing RevenueCat for ${Platform.OS} with key: ${maskedKey}`);
      console.log(`Environment variables loaded: ${!!process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_ANDROID} (Android), ${!!process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_IOS} (iOS)`);
      
      // Įsitikinama, kad API raktas egzistuoja
      if (!apiKey || apiKey === "[YOUR_EXPO_PUBLIC_REVENUECAT_API_KEY_IOS]") {
        throw new Error(`Invalid or missing API key for ${Platform.OS}. Please check your .env file.`);
      }
      
      console.log("About to configure Purchases...");
      Purchases.configure({
        apiKey: apiKey,
      });
      console.log("Purchases configured successfully");

      if (__DEV__) {
        console.log("Setting log level to DEBUG");
        Purchases.setLogLevel(LOG_LEVEL.DEBUG);
      }

      console.log("Fetching offerings...");
      await getOfferings();
      console.log("Offerings fetched successfully");

      // Pridedamas klausytojas, atnaujinantis customerInfo state, kai pasikeičia kliento informacija
      console.log("Setting up customer info listener");

      // Pašalinamas esamas klausytojas, jei jis yra
      if (customerInfoListener.current) {
        console.log("🦁 Removing existing customer info listener");
        customerInfoListener.current();
        customerInfoListener.current = null;
      }

      // Pridedamas naujas klausytojas ir išsaugoma išvalymo funkcija
      const removeListener = Purchases.addCustomerInfoUpdateListener((customerInfo) => {
        console.log(`🦁 Customer info updated. User ID: ${customerInfo?.originalAppUserId}`);
        setCustomerInfo(customerInfo);
      });
      
      customerInfoListener.current = removeListener;

      setInitialized(true);
      console.log("RevenueCat initialized successfully");
    } catch (error: any) {
      console.error("Error initializing RevenueCat:", error);
      // Išsamus klaidų registravimas
      if (error.message) console.error("Error message:", error.message);
      if (error.code) console.error("Error code:", error.code);
      if (error.underlyingErrorMessage) console.error("Underlying error message:", error.underlyingErrorMessage);
      if (error.readableErrorCode) console.error("Readable error code:", error.readableErrorCode);
      if (error.info) console.error("Error info:", JSON.stringify(error.info));

      // Vis tiek nustatoma initialized į true, kad programa galėtų veikti
      setInitialized(true);
    }
  };

  /**
   * Gauna dabartinius pasiūlymus iš RevenueCat
   */
  const getOfferings = async () => {
    try {
      console.log("Getting offerings from RevenueCat");
      const offerings = await Purchases.getOfferings();
      console.log(`🦁 Offerings received. Current offering ID: ${offerings.current?.identifier}`);
      console.log(`🦁 Available packages count: ${offerings.current?.availablePackages?.length || 0}`);
      
      let currentOffering = offerings.current;

      // Platformai būdinga atsarginė logika
      if (!currentOffering || currentOffering.availablePackages.length === 0) {
        console.log(`🦁 Default offering empty for ${Platform.OS}, checking platform-specific offerings...`);

        if (Platform.OS === 'android') {
          // Kaip atsarginį variantą bandomi Android būdingi pasiūlymai
          const androidOfferings = ['def_off', 'def_offer', 'weekly', 'weekly2'];
          for (const offeringId of androidOfferings) {
            const fallbackOffering = offerings.all[offeringId];
            if (fallbackOffering && fallbackOffering.availablePackages.length > 0) {
              console.log(`🦁 Using fallback offering for Android: ${offeringId} (${fallbackOffering.availablePackages.length} packages)`);
              currentOffering = fallbackOffering;
              break;
            }
          }
        } else if (Platform.OS === 'ios') {
          // iOS turėtų naudoti rsi_pro_plans, bet prireikus pereinama prie kitų
          const iosOfferings = ['rsi_pro_plans', 'def_off', 'weekly'];
          for (const offeringId of iosOfferings) {
            const fallbackOffering = offerings.all[offeringId];
            if (fallbackOffering && fallbackOffering.availablePackages.length > 0) {
              console.log(`🦁 Using fallback offering for iOS: ${offeringId} (${fallbackOffering.availablePackages.length} packages)`);
              currentOffering = fallbackOffering;
              break;
            }
          }
        }
      }
      
      console.log(`🦁 Final offering selected: ${currentOffering?.identifier || 'none'} with ${currentOffering?.availablePackages?.length || 0} packages`);
      setOffering(currentOffering);
    } catch (error) {
      console.error("Error getting offerings:", error);
    }
  };

  /**
   *
   * @param purchasedPackage Įsigyjamas paketas
   * @returns Pirkimo rezultatas
   */
  const purchasePackage = async (purchasedPackage: PurchasesPackage) => {
    try {
      console.log("Attempting to purchase package:", purchasedPackage.identifier);
      const result = await Purchases.purchasePackage(purchasedPackage);
      console.log(`🦁 Purchase successful for package: ${purchasedPackage.identifier}. User ID: ${result.customerInfo.originalAppUserId}`);
      return result;
    } catch (error: any) {
      console.error("Purchase error:", error);

      // Patobulintas klaidų tvarkymas geresnei vartotojo patirčiai
      if (error.userCancelled || error.code === 2) { // PURCHASE_CANCELLED
        console.log("🦁 User cancelled purchase - this is normal behavior");
        // Atšaukimo atveju išmetama speciali klaida, kuri nerodo pranešimų
        const cancellationError = new Error("Purchase was cancelled by user");
        (cancellationError as any).userCancelled = true;
        (cancellationError as any).code = error.code;
        throw cancellationError;
      }
      
      // Registruojama išsami klaidos informacija derinimui
      console.error("🦁 Purchase error details:", {
        code: error.code,
        message: error.message,
        underlyingErrorMessage: error.underlyingErrorMessage,
        userCancelled: error.userCancelled
      });

      // Sukuriamas vartotojui suprantamesnis klaidos pranešimas
      let userMessage = "Unable to complete purchase. Please try again.";

      if (error.code === 2) { // PURCHASE_CANCELLED
        userMessage = "Purchase was cancelled.";
      } else if (error.code === 6) { // PRODUCT_NOT_AVAILABLE_FOR_PURCHASE
        userMessage = "This subscription is currently unavailable. Please try again later.";
      } else if (error.code === 7) { // PURCHASE_NOT_ALLOWED
        userMessage = "Purchases are not allowed on this device. Please check your device settings.";
      } else if (error.code === 8) { // PAYMENT_PENDING
        userMessage = "Payment is pending. Please wait for confirmation.";
      } else if (error.code === 9) { // INVALID_RECEIPT
        userMessage = "There was an issue with your purchase receipt. Please contact support.";
      } else if (error.code === 12) { // NETWORK_ERROR
        userMessage = "Network error. Please check your internet connection and try again.";
      } else if (error.message && error.message.includes("sandbox")) {
        userMessage = "Subscription service is temporarily unavailable. Please try again later.";
      }

      // Sukuriamas patobulintas klaidos objektas su vartotojui suprantamu pranešimu
      const enhancedError = new Error(userMessage);
      (enhancedError as any).originalError = error;
      (enhancedError as any).userCancelled = error.userCancelled;
      (enhancedError as any).code = error.code;
      
      throw enhancedError;
    }
  };

  /**
   * Gauna kliento informaciją iš RevenueCat
   */
  const getCustomerInfo = async () => {
    try {
      console.log("Getting customer info");
      const customerInfo = await Purchases.getCustomerInfo();
      console.log(`🦁 Customer info received. User ID: ${customerInfo?.originalAppUserId}`);
      setCustomerInfo(customerInfo);
    } catch (error) {
      console.error("Error getting customer info:", error);
    }
  };

  /**
   * Patikrina demo režimo būseną
   */
  const checkDemoMode = async () => {
    try {
      const demoModeStatus = await AsyncStorage.getItem('demo_mode_enabled');
      const isDemo = demoModeStatus === 'true';
      console.log(`🍎 Demo mode check: AsyncStorage value = '${demoModeStatus}', isDemo = ${isDemo}`);
      setIsDemoMode(isDemo);
      return isDemo;
    } catch (error) {
      console.error('Error checking demo mode:', error);
      return false;
    }
  };

  /**
   * Patikrina, ar vartotojas turi premium prieigą (prenumeratą, teisę ar viso gyvenimo pirkimą)
   * @returns True, jei vartotojas turi premium prieigą
   */
  const checkIfUserIsSubscribed = async () => {
    // Pirmiausia patikrinamas demo režimas - net jei nėra visiškai inicializuota
    const isDemo = await checkDemoMode();
    console.log(`🦁 Demo mode status: ${isDemo}`);

    // Jei demo režimas aktyvus, vartotojas turi prieigą prie visų funkcijų
    if (isDemo) {
      console.log("🦁 Demo mode active - setting isSubscribed to true");
      setIsSubscribed(true);
      return;
    }

    // Įprastam prenumeratos patikrinimui reikia customerInfo
    if (!initialized || !customerInfo) {
      console.log("🦁 Normal subscription check skipped: not initialized or no customer info");
      setIsSubscribed(false);
      return;
    }

    // Įprastas prenumeratos patikrinimas
    const lifetimeProductIds = new Set(STATIC_LIFETIME_PRODUCT_IDS);
    offering?.availablePackages?.forEach((pkg) => {
      if (pkg.packageType === 'LIFETIME' && pkg.product?.identifier) {
        lifetimeProductIds.add(pkg.product.identifier);
      }
    });

    const hasActiveEntitlements = Object.keys(customerInfo.entitlements?.active ?? {}).length > 0;
    const hasActiveSubscriptions = customerInfo.activeSubscriptions.length > 0;
    const hasKnownLifetimePurchase =
      customerInfo.allPurchasedProductIdentifiers.some((id) => lifetimeProductIds.has(id)) ||
      customerInfo.nonSubscriptionTransactions.some((transaction) =>
        lifetimeProductIds.has(transaction.productIdentifier)
      );
    const hasLifetimePurchase =
      lifetimeProductIds.size > 0 ? hasKnownLifetimePurchase : customerInfo.nonSubscriptionTransactions.length > 0;

    const isPro = hasActiveEntitlements || hasActiveSubscriptions || hasLifetimePurchase;
    console.log(
      `🦁 Normal access check: entitlements=${hasActiveEntitlements}, activeSubs=${hasActiveSubscriptions} (${customerInfo.activeSubscriptions.length}), lifetime=${hasLifetimePurchase}`
    );
    setIsSubscribed(isPro);
  };

  /**
   * Gauna ne prenumeratos pirkimą pagal nurodytą identifikatorių
   * @param identifier Gaunamo produkto identifikatorius
   * @returns Ne prenumeratos pirkimas su nurodytu identifikatoriumi
   */
  const getNonSubscriptionPurchase = async (identifier: string) => {
    if (!initialized || !customerInfo) return null;

    const item = customerInfo.nonSubscriptionTransactions.find(
      (t) => t.productIdentifier === identifier
    );

    return item;
  };

  /**
   * Pirkimų atkūrimo funkcija
   */
  const restorePurchases = async () => {
    try {
      console.log("Attempting to restore purchases...");
      const restoredCustomerInfo = await Purchases.restorePurchases();
      console.log(`🦁 Purchases restored successfully. User ID: ${restoredCustomerInfo?.originalAppUserId}`);
      // Purchases klausytojas (`addCustomerInfoUpdateListener`) turėtų automatiškai
      // atnaujinti customerInfo state, sukeldamas sąsajos atnaujinimą.
      // Jei taip nenutinka, čia gali tekti rankiniu būdu iškviesti setCustomerInfo:
      // setCustomerInfo(restoredCustomerInfo);
      return restoredCustomerInfo;
    } catch (error: any) {
      console.error("Error restoring purchases:", error);
      // Apsvarstykite galimybę parodyti pranešimą vartotojui
      Alert.alert(t('purchases.restoreFailed.title'), t('purchases.restoreFailed.message'));
      throw error; // Iš naujo išmetama klaida, jei iškviečiantis kodas turi ją apdoroti
    }
  };

  /**
   * Rankiniu būdu atnaujina prenumeratos būseną (naudinga, kai keičiasi demo režimas)
   */
  const refreshSubscriptionStatus = async () => {
    console.log("🦁 Manually refreshing subscription status...");
    await checkIfUserIsSubscribed();
  };

  useEffect(() => {
    const initialize = async () => {
      console.log("🦁 Provider Mounting: Starting initialization...");
      try {
        console.log("🦁 Provider Mounting: >> Calling init()...");
        await init();
        console.log("🦁 Provider Mounting: << init() finished.");
      } catch (error) {
        console.error("🦁 Provider Mounting: !! Error during init() call.", error);
        // Užtikrinama, kad inicializavimo būsena būtų sutvarkyta, net jei init netikėtai sugenda
        setInitialized(true);
      }

      try {
        console.log("🦁 Provider Mounting: >> Calling getCustomerInfo()...");
        await getCustomerInfo();
        console.log("🦁 Provider Mounting: << getCustomerInfo() finished.");
      } catch (error) {
        console.error("🦁 Provider Mounting: !! Error during getCustomerInfo() call.", error);
      }

      // Inicializavimo metu patikrinamas demo režimas
      try {
        console.log("🦁 Provider Mounting: >> Checking demo mode...");
        await checkDemoMode();
        console.log("🦁 Provider Mounting: << Demo mode check finished.");
      } catch (error) {
        console.error("🦁 Provider Mounting: !! Error during demo mode check.", error);
      }

      console.log("🦁 Provider Mounting: Initialization sequence complete.");
    };

    initialize();

    // AppState klausytojas
    const handleAppStateChange = async (nextAppState: AppStateStatus) => {
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        console.log('🦁 App has come to the foreground! Fetching latest CustomerInfo...');
        try {
          // Naudojama esama getCustomerInfo funkcija
          await getCustomerInfo();
          console.log('🦁 Fetched CustomerInfo on foreground.');

          // Taip pat patikrinamas demo režimas, kai programa grįžta į priekinį planą
          await checkDemoMode();
          console.log('🦁 Checked demo mode on foreground.');
        } catch (error) {
          console.error('🦁 Error fetching CustomerInfo/demo mode on foreground:', error);
        }
      }
      appState.current = nextAppState;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    // Klausytojai išvalomi atjungiant komponentą
    return () => {
      subscription.remove();

      // Pašalinamas RevenueCat kliento informacijos klausytojas
      if (customerInfoListener.current) {
        console.log("🦁 Cleanup: Removing customer info listener");
        customerInfoListener.current();
        customerInfoListener.current = null;
      }
    };
  }, []); // Priklausomybių masyvas paliekamas tuščias

  useEffect(() => {
    // Patikrinama, ar vartotojas prenumeruoja bet kurį pasiūlymą, pasikeitus kliento informacijai
    checkIfUserIsSubscribed();
  }, [initialized, customerInfo, isDemoMode, offering]);

  // PAKEITIMAS: vaikiniai elementai visada atvaizduojami, net kai neinicializuota
  return (
    <PurchasesContext.Provider
      value={{
        currentOffering: offering,
        purchasePackage,
        customerInfo,
        isSubscribed,
        getNonSubscriptionPurchase,
        restorePurchases,
        refreshSubscriptionStatus,
      }}
    >
      {children}
    </PurchasesContext.Provider>
  );
};

export default PurchasesProvider;
