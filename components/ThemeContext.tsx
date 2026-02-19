import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useState } from 'react';

type ThemeContextType = {
  isDark: boolean;
  toggleDarkMode: () => void;
  colors: {
    background: string;
    card: string;
    text: string;
    textSecondary: string;
    border: string;
    tint: string;
    accent: string;
    headerBg: string;
    inputBg: string;
    tableHeaderBg: string;
  };
};

const lightColors = {
  background: '#f8fafc',
  card: '#f8fafc',
  text: '#0f172a',
  textSecondary: '#6b7280',
  border: '#dbe3ee',
  tint: '#ea580c',
  accent: '#ea580c',
  headerBg: '#eef2f9',
  inputBg: '#f8fafc',
  tableHeaderBg: '#eef2f9',
};

const darkColors = {
  background: '#0f172a',
  card: '#1e293b',
  text: '#e2e8f0',
  textSecondary: '#94a3b8',
  border: '#334155',
  tint: '#fb923c',
  accent: '#fb923c',
  headerBg: '#1e293b',
  inputBg: '#1e293b',
  tableHeaderBg: '#1e293b',
};

const ThemeContext = createContext<ThemeContextType>({
  isDark: false,
  toggleDarkMode: () => {},
  colors: lightColors,
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem('darkMode').then((val) => {
      if (val === 'true') setIsDark(true);
    });
  }, []);

  const toggleDarkMode = () => {
    setIsDark((prev) => {
      const next = !prev;
      AsyncStorage.setItem('darkMode', next ? 'true' : 'false');
      return next;
    });
  };

  return (
    <ThemeContext.Provider
      value={{
        isDark,
        toggleDarkMode,
        colors: isDark ? darkColors : lightColors,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
