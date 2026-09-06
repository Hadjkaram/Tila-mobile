import 'react-native-gesture-handler';
import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { QueryClient } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { 
  useFonts,
  Montserrat_400Regular,
  Montserrat_500Medium,
  Montserrat_600SemiBold,
  Montserrat_700Bold
} from '@expo-google-fonts/montserrat';
import * as SplashScreen from 'expo-splash-screen';

import { NetworkBanner } from '../components/NetworkBanner';
import { preloadService } from '../services/preloadService';
import { referentialCache } from '../services/referentialCache';

// Prevent auto hide while fonts are loading
SplashScreen.preventAutoHideAsync();

const asyncStoragePersister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: 'TILA_REACT_QUERY_OFFLINE_CACHE',
  throttleTime: 1000,
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: 1000 * 60 * 60 * 24 * 7, // 7 jours de persistance hors-ligne
      staleTime: 1000 * 60 * 5, // 5 minutes de validité
      networkMode: 'offlineFirst',
      retry: 1,
    },
    mutations: {
      networkMode: 'offlineFirst',
    },
  },
});

import { StatusBar } from 'expo-status-bar';
import { ThemeProvider, useTheme } from '../context/ThemeContext';
import { notificationService } from '../services/notificationService';

function ThemedAppContent() {
  const { colors, isDark } = useTheme();

  return (
    <SafeAreaProvider style={{ flex: 1, backgroundColor: colors.bg }}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <NetworkBanner />
      <Stack
        screenOptions={{
          headerShown: false,
          gestureEnabled: false,
          contentStyle: { backgroundColor: colors.bg },
          animation: 'fade',
        }}
      >
        <Stack.Screen name="(patient)" options={{ gestureEnabled: false }} />
        <Stack.Screen name="(specialist)" options={{ gestureEnabled: false }} />
        <Stack.Screen name="(supervisor)" options={{ gestureEnabled: false }} />
        <Stack.Screen name="(health-agent)" options={{ gestureEnabled: false }} />
        <Stack.Screen name="(field-agent)" options={{ gestureEnabled: false }} />
        <Stack.Screen name="(census-agent)" options={{ gestureEnabled: false }} />
        <Stack.Screen name="(ong-manager)" options={{ gestureEnabled: false }} />
        <Stack.Screen name="(program-agent)" options={{ gestureEnabled: false }} />
      </Stack>
    </SafeAreaProvider>
  );
}

export default function RootLayout() {
  const [fontsLoaded, error] = useFonts({
    Montserrat_400Regular,
    Montserrat_500Medium,
    Montserrat_600SemiBold,
    Montserrat_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || error) {
      SplashScreen.hideAsync();
      // Silently preload local offline data and sync referentials
      preloadService.preloadAllData(queryClient);
      referentialCache.syncReferentials();
      // Initialiser les notifications push / locales
      notificationService.initialize();
    }
  }, [fontsLoaded, error]);

  if (!fontsLoaded && !error) {
    return null;
  }

  return (
    <ThemeProvider>
      <PersistQueryClientProvider
        client={queryClient}
        persistOptions={{ persister: asyncStoragePersister }}
      >
        <ThemedAppContent />
      </PersistQueryClientProvider>
    </ThemeProvider>
  );
}
