import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

type Theme = 'dark' | 'light';

interface ThemeColors {
  primary: string;
  background: string;
  cardBackground: string;
  text: string;
  subtext: string;
  accent: string;
  border: string;
  error: string;
  success: string;
  warning: string;
}

interface ThemeContextType {
  theme: Theme;
  colors: ThemeColors;
  toggleTheme: () => void;
  isDark: boolean;
}

const darkColors: ThemeColors = {
  primary: '#4ECDC4',
  background: '#121829',
  cardBackground: '#1A2238',
  text: '#FFFFFF',
  subtext: '#A0AEC0',
  accent: '#A9B4FC',
  border: '#2D3748',
  error: '#FF9494',
  success: '#4ECDC4',
  warning: '#FFB84D',
};

const lightColors: ThemeColors = {
  primary: '#2B9084',
  background: '#F7FAFC',
  cardBackground: '#FFFFFF',
  text: '#1A202C',
  subtext: '#4A5568',
  accent: '#6B73FF',
  border: '#E2E8F0',
  error: '#E53E3E',
  success: '#38A169',
  warning: '#D69E2E',
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = 'app_theme';

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<Theme>('dark'); // Numatytoji tamsi tema

  useEffect(() => {
    loadTheme();
  }, []);

  const loadTheme = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem(THEME_STORAGE_KEY);
      if (savedTheme && (savedTheme === 'dark' || savedTheme === 'light')) {
        setTheme(savedTheme);
      }
    } catch (error) {
      console.error('Failed to load theme:', error);
    }
  };

  const toggleTheme = async () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, newTheme);
    } catch (error) {
      console.error('Failed to save theme:', error);
    }
  };

  const colors = theme === 'dark' ? darkColors : lightColors;
  const isDark = theme === 'dark';

  return (
    <ThemeContext.Provider value={{ theme, colors, toggleTheme, isDark }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export default ThemeContext; 