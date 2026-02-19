import { DarkTheme, DefaultTheme, ThemeProvider as NavThemeProvider, type Theme } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { LanguageProvider } from '@/components/LanguageContext';
import { ThemeProvider, useTheme } from '@/components/ThemeContext';

export const unstable_settings = {
  anchor: '(tabs)',
};

const appLightTheme: Theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: '#ea580c',
    background: '#f8fafc',
    card: '#ffffff',
    text: '#0f172a',
    border: '#dbe3ee',
    notification: '#ea580c',
  },
};

const appDarkTheme: Theme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: '#fb923c',
    background: '#0b1220',
    card: '#111827',
    text: '#e2e8f0',
    border: '#1f2937',
    notification: '#fb923c',
  },
};

function InnerLayout() {
  const { isDark } = useTheme();

  return (
    <NavThemeProvider value={isDark ? appDarkTheme : appLightTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="literature" options={{ headerShown: false }} />
        <Stack.Screen name="literature-file" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
      </Stack>
      <StatusBar style={isDark ? 'light' : 'dark'} />
    </NavThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <InnerLayout />
      </LanguageProvider>
    </ThemeProvider>
  );
}

