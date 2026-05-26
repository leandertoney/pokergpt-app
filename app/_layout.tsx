import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import * as Updates from "expo-updates";
import React, { useEffect, useState, useCallback } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { StatusBar } from "expo-status-bar";
import { Alert } from "react-native";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { PokerFlowProvider } from "@/hooks/usePokerFlow";
import { SplashFlow } from "@/components/SplashFlow";
import { colors } from "@/constants/colors";
import { initializeRevenueCat } from "@/services/revenueCat";
import {
  setupNotificationResponseListener,
  getInitialNotification,
  clearBadge,
  registerExpoPushToken,
  syncPushTokenToSupabase,
} from "@/services/notificationService";

SplashScreen.preventAutoHideAsync().catch(() => {});

// Initialize RevenueCat early
initializeRevenueCat().catch((error) => {
  console.warn('RevenueCat initialization failed:', error);
});

const queryClient = new QueryClient();

function useProtectedRoute() {
  const { isAuthenticated, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === 'auth';

    // Only redirect away from auth screens if already authenticated
    // Allow unauthenticated users to explore the app freely
    if (isAuthenticated && inAuthGroup) {
      // Redirect to home if authenticated but in auth flow
      router.replace('/');
    }
  }, [isAuthenticated, isLoading, segments, router]);
}

function RootLayoutNav() {
  useProtectedRoute();
  const router = useRouter();

  // Set up notification handlers
  useEffect(() => {
    // Handle notification taps
    const unsubscribe = setupNotificationResponseListener();

    // Check if app was opened via notification
    getInitialNotification().then((data) => {
      if (data?.screen) {
        router.push(data.screen as any);
      }
    });

    // Clear badge when app opens
    clearBadge();

    // Register push token and sync to Supabase
    registerExpoPushToken().then((token) => {
      if (token) {
        syncPushTokenToSupabase(token);
      }
    });

    return unsubscribe;
  }, [router]);

  return (
    <Stack
      screenOptions={{
        headerBackTitle: "Back",
        headerStyle: {
          backgroundColor: colors.background.primary,
        },
        headerTintColor: colors.text.primary,
        headerTitleStyle: {
          color: colors.text.primary,
        },
        contentStyle: {
          backgroundColor: colors.background.primary,
        },
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          headerShown: false,
          title: "PokerPro AI",
        }}
      />
      <Stack.Screen
        name="auth/login"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="auth/signup"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="auth/forgot-password"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="chat"
        options={{
          headerShown: true,
          title: "New Hand",
          presentation: 'modal',
        }}
      />
      <Stack.Screen
        name="poker-chat"
        options={{
          headerShown: true,
          title: "Text Analysis",
          presentation: 'modal',
        }}
      />
      <Stack.Screen
        name="history"
        options={{
          headerShown: true,
          title: "Hand History",
        }}
      />
      <Stack.Screen
        name="analysis"
        options={{
          headerShown: true,
          title: "Analysis",
        }}
      />
      <Stack.Screen
        name="settings"
        options={{
          headerShown: true,
          title: "Settings",
          presentation: 'modal',
        }}
      />
      <Stack.Screen
        name="voice-settings"
        options={{
          headerShown: true,
          title: "Voice Settings",
          presentation: 'modal',
        }}
      />
      <Stack.Screen
        name="profile"
        options={{
          headerShown: true,
          title: "Profile",
        }}
      />
      <Stack.Screen
        name="daily-review"
        options={{
          headerShown: true,
          title: "Daily Review",
          presentation: 'modal',
        }}
      />
      <Stack.Screen
        name="notification-settings"
        options={{
          headerShown: true,
          title: "Daily Reminders",
          presentation: 'modal',
        }}
      />
      <Stack.Screen
        name="paywall"
        options={{
          headerShown: false,
          presentation: 'modal',
        }}
      />
      <Stack.Screen
        name="+not-found"
        options={{
          headerShown: true,
          title: "Not Found",
        }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    // Hide the native splash screen once our custom splash takes over
    SplashScreen.hideAsync().catch(() => {
      // Ignore error if splash screen isn't registered yet
    });

    // Check for OTA updates on launch
    async function checkForUpdates() {
      if (__DEV__) {
        console.log('🚫 Skipping update check - in development mode');
        return; // Skip in development
      }

      try {
        console.log('🔍 Checking for updates...');
        const currentInfo = {
          updateId: Updates.updateId,
          isEmbeddedLaunch: Updates.isEmbeddedLaunch,
          runtimeVersion: Updates.runtimeVersion,
        };
        console.log('📱 Current update info:', currentInfo);

        const update = await Updates.checkForUpdateAsync();
        console.log('✅ Update check result:', update);

        // Show debug alert for testing
        Alert.alert(
          'Update Check',
          `Runtime: ${currentInfo.runtimeVersion}\nUpdate ID: ${Updates.updateId?.slice(0, 8)}...\nEmbedded: ${currentInfo.isEmbeddedLaunch}\nAvailable: ${update.isAvailable}`,
          [{ text: 'OK' }]
        );

        if (update.isAvailable) {
          console.log('📥 Downloading update...');
          await Updates.fetchUpdateAsync();
          console.log('🔄 Reloading with new update...');
          await Updates.reloadAsync();
        } else {
          console.log('✨ App is up to date!');
        }
      } catch (error) {
        // Silently fail - updates will be applied next launch
        console.error('❌ Update check failed:', error);
        Alert.alert('Update Error', String(error));
      }
    }

    checkForUpdates();
  }, []);

  const handleSplashComplete = useCallback(() => {
    setShowSplash(false);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.background.primary }}>
          <StatusBar style="light" />
          <PokerFlowProvider>
            <RootLayoutNav />
            {showSplash && <SplashFlow onComplete={handleSplashComplete} />}
          </PokerFlowProvider>
        </GestureHandlerRootView>
      </AuthProvider>
    </QueryClientProvider>
  );
}
