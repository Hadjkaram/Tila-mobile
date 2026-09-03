import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ThemeMode = 'system' | 'light' | 'dark';

export interface ThemeColors {
  bg: string;
  bgSecondary: string;
  card: string;
  cardSecondary: string;
  border: string;
  borderSubtle: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  primary: string;
  primaryLight: string;
  secondary: string;
  secondaryLight: string;
  danger: string;
  dangerLight: string;
  inputBg: string;
  iconBg: string;
  headerBg: string;
  headerText: string;
  statusBar: 'light' | 'dark';
}

const lightColors: ThemeColors = {
  bg: '#ffffff',
  bgSecondary: '#f8fafc',
  card: '#ffffff',
  cardSecondary: '#f1f5f9',
  border: '#e2e8f0',
  borderSubtle: '#f1f5f9',
  text: '#0f172a',
  textSecondary: '#64748b',
  textMuted: '#94a3b8',
  primary: '#00A651',
  primaryLight: '#ecfdf5',
  secondary: '#F58220',
  secondaryLight: '#fff7ed',
  danger: '#ef4444',
  dangerLight: '#fef2f2',
  inputBg: '#f8fafc',
  iconBg: '#f1f5f9',
  headerBg: '#ffffff',
  headerText: '#0f172a',
  statusBar: 'dark',
};

const darkColors: ThemeColors = {
  bg: '#0b1120',
  bgSecondary: '#0f172a',
  card: '#1e293b',
  cardSecondary: '#141e30',
  border: '#334155',
  borderSubtle: '#1e293b',
  text: '#f8fafc',
  textSecondary: '#94a3b8',
  textMuted: '#64748b',
  primary: '#00A651',
  primaryLight: '#064e3b',
  secondary: '#F58220',
  secondaryLight: '#431407',
  danger: '#f87171',
  dangerLight: '#450a0a',
  inputBg: '#1e293b',
  iconBg: '#1e293b',
  headerBg: '#0f172a',
  headerText: '#f8fafc',
  statusBar: 'light',
};

interface ThemeContextType {
  mode: ThemeMode;
  isDark: boolean;
  colors: ThemeColors;
  setThemeMode: (mode: ThemeMode) => Promise<void>;
}

const THEME_STORAGE_KEY = '@tila_theme_mode';

const ThemeContext = createContext<ThemeContextType>({
  mode: 'system',
  isDark: false,
  colors: lightColors,
  setThemeMode: async () => {},
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const systemScheme = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>('system');
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const savedMode = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (savedMode === 'light' || savedMode === 'dark' || savedMode === 'system') {
          setModeState(savedMode);
        }
      } catch (e) {
        console.error('Error loading theme mode:', e);
      } finally {
        setIsReady(true);
      }
    })();
  }, []);

  const setThemeMode = async (newMode: ThemeMode) => {
    try {
      setModeState(newMode);
      await AsyncStorage.setItem(THEME_STORAGE_KEY, newMode);
    } catch (e) {
      console.error('Error saving theme mode:', e);
    }
  };

  const isDark =
    mode === 'dark' ? true : mode === 'light' ? false : systemScheme === 'dark';

  const colors = isDark ? darkColors : lightColors;

  return (
    <ThemeContext.Provider value={{ mode, isDark, colors, setThemeMode }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
