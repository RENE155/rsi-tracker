import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

type OnboardingContextValue = {
  hasCompletedOnboarding: boolean;
  loading: boolean;
  markOnboardingComplete: () => Promise<void>;
  resetOnboarding: () => Promise<void>;
};

const STORAGE_KEY = '@onboarding_complete_v1';

const OnboardingContext = createContext<OnboardingContextValue>({
  hasCompletedOnboarding: false,
  loading: true,
  markOnboardingComplete: async () => {},
  resetOnboarding: async () => {},
});

export const OnboardingProvider = ({ children }: { children: ReactNode }) => {
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const loadState = async () => {
      try {
        const storedCompletion = await AsyncStorage.getItem(STORAGE_KEY);
        if (isMounted) {
          setHasCompletedOnboarding(storedCompletion === 'true');
        }
      } catch (error) {
        console.error('Failed to load onboarding state', error);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadState();

    return () => {
      isMounted = false;
    };
  }, []);

  const markOnboardingComplete = async () => {
    try {
      setHasCompletedOnboarding(true);
      await AsyncStorage.setItem(STORAGE_KEY, 'true');
    } catch (error) {
      console.error('Failed to mark onboarding as complete', error);
    }
  };

  const resetOnboarding = async () => {
    try {
      setHasCompletedOnboarding(false);
      await AsyncStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.error('Failed to reset onboarding state', error);
    }
  };

  return (
    <OnboardingContext.Provider
      value={{
        hasCompletedOnboarding,
        loading,
        markOnboardingComplete,
        resetOnboarding,
      }}
    >
      {children}
    </OnboardingContext.Provider>
  );
};

export const useOnboarding = () => useContext(OnboardingContext);
