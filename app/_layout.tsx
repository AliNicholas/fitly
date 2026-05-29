import '../global.css';
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { View, ActivityIndicator, Text } from 'react-native';
import { initDb } from '../db/database';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { configureReanimatedLogger, ReanimatedLogLevel } from 'react-native-reanimated';
import { CustomDialogProvider } from '../components/CustomDialog';

// Suppress strict-mode warnings from react-navigation internals reading shared values during render
configureReanimatedLogger({
  level: ReanimatedLogLevel.warn,
  strict: false,
});

export {
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [dbLoaded, setDbLoaded] = useState(false);
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  // Catch any errors during font loading
  useEffect(() => {
    if (fontError) throw fontError;
  }, [fontError]);

  // Initialize SQLite database
  useEffect(() => {
    async function setupDatabase() {
      try {
        await initDb();
        setDbLoaded(true);
      } catch (e) {
        console.error('Failed to initialize database:', e);
        // Even if DB fails, let app load so we show error screen or fallback
        setDbLoaded(true);
      }
    }
    setupDatabase();
  }, []);

  // Hide splash screen when fonts and database are ready
  useEffect(() => {
    if (fontsLoaded && dbLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, dbLoaded]);

  if (!fontsLoaded || !dbLoaded) {
    return (
      <View className="flex-1 bg-[#020617] items-center justify-center">
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text className="text-[#94a3b8] font-medium mt-4">Setting up your workout vault...</Text>
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <CustomDialogProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        </Stack>
      </CustomDialogProvider>
    </SafeAreaProvider>
  );
}
