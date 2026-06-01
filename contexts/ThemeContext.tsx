import React, { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme as useNativeWindColorScheme } from 'nativewind';
import { getSettings, saveSetting } from '../db/settings';

export type ThemeMode = 'light' | 'dark';

interface AppThemeContextValue {
  themeMode: ThemeMode;
  isDark: boolean;
  colors: {
    background: string;
    surface: string;
    surfaceLight: string;
    textPrimary: string;
    textSecondary: string;
    border: string;
    tabBar: string;
  };
  setThemeMode: (mode: ThemeMode) => Promise<void>;
}

const darkColors = {
  background: '#050510',
  surface: '#0f0f23',
  surfaceLight: '#1a1a38',
  textPrimary: '#f8fafc',
  textSecondary: '#94a3b8',
  border: '#2a2a4a',
  tabBar: '#0a0a1e',
};

const lightColors = {
  background: '#f8fafc',
  surface: '#ffffff',
  surfaceLight: '#f1f5f9',
  textPrimary: '#0f172a',
  textSecondary: '#475569',
  border: '#e2e8f0',
  tabBar: '#ffffff',
};

const AppThemeContext = createContext<AppThemeContextValue | undefined>(undefined);

export function AppThemeProvider({ children }: { children: ReactNode }) {
  const { setColorScheme } = useNativeWindColorScheme();
  const [themeModeState, setThemeModeState] = useState<ThemeMode>('dark');

  useEffect(() => {
    let isMounted = true;

    async function loadThemeMode() {
      try {
        const settings = await getSettings();
        const storedMode = settings.theme_mode === 'light' ? 'light' : 'dark';

        if (isMounted) {
          setThemeModeState(storedMode);
          setColorScheme(storedMode);
        }
      } catch (error) {
        console.error('Failed to load theme mode:', error);
      }
    }

    loadThemeMode();

    return () => {
      isMounted = false;
    };
  }, []);

  const setThemeMode = useCallback(async (mode: ThemeMode) => {
    setThemeModeState(mode);
    setColorScheme(mode);
    await saveSetting('theme_mode', mode);
  }, [setColorScheme]);

  const value = useMemo<AppThemeContextValue>(() => {
    const isDark = themeModeState === 'dark';

    return {
      themeMode: themeModeState,
      isDark,
      colors: isDark ? darkColors : lightColors,
      setThemeMode,
    };
  }, [setThemeMode, themeModeState]);

  return (
    <AppThemeContext.Provider value={value}>
      {children}
    </AppThemeContext.Provider>
  );
}

export function useAppTheme() {
  const context = useContext(AppThemeContext);

  if (!context) {
    throw new Error('useAppTheme must be used within AppThemeProvider');
  }

  return context;
}
