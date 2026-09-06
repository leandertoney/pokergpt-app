import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import * as Updates from "expo-updates";
import React, { useEffect, useState, useCallback } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { View, Text, StyleSheet } from "react-native";
import { StatusBar } from "expo-status-bar";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { PokerFlowProvider } from "@/hooks/usePokerFlow";
import { SplashFlow } from "@/components/SplashFlow";
import { colors } from "@/constants/colors";
import { initializeRevenueCat, identifyUser } from "@/services/revenueCat";
import { getOrCreateUser } from "@/services/supabaseStorage";
import { trackAppEvent } from "@/services/appAnalytics";
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


/**
 * Header title that names the app above the screen name.
 *
 * Two lines rather than one so the screen keeps its own label: "Analysis"
 * still reads as Analysis, it just sits under "Poker Hands Coach" in gold.
 * Screens that pass no title render the app name alone.
 */
function BrandedHeaderTitle({ title }: { title: string }) {
  return (
    <View style={headerStyles.wrap}>
      <Text style={headerStyles.brand} numberOfLines={1}>
        Poker Hands Coach
      </Text>
      {!!title && (
        <Text style={headerStyles.screen} numberOfLines={1}>
          {title}
        </Text>
      )}
    </View>
  );
}

const headerStyles = StyleSheet.create({
  wrap: { alignItems: 'center' },
  brand: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.accent.gold,
    letterSpacing: 0.2,
  },
  screen: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text.primary,
    marginTop: 1,
  },
});

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

    // One event per cold start. Without this, "have they opened the app since
    // subscribing?" can only be answered by inference from whether they
    // happened to save a hand, which is not the same question.
    trackAppEvent('app_opened');

    // Register push token and sync to Supabase
    registerExpoPushToken().then((token) => {
      if (token) {
        syncPushTokenToSupabase(token);
      }
    });

    // Join the RevenueCat customer to the Supabase user.
    //
    // identifyUser has existed since the SDK was added and was never called, so
    // every subscriber to date is an anonymous RevenueCat id that can only be
    // tied back to a person by matching timestamps by hand. Calling it here
    // also gives cross-device restore, which anonymous ids cannot do.
    getOrCreateUser()
      .then((user) => {
        if (user?.id) return identifyUser(user.id);
      })
      .catch(() => {});

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
        // Every screen names the app above its own title.
        //
        // Screen recordings are the content: a clip of "Hand History" or
        // "Analysis" could be any poker app, and a video where the app is
        // never named converts at roughly nothing. Home and the voice coach
        // already carried the name; this puts it on the other eight screens
        // without changing what each one is called.
        headerTitle: ({ children }) => <BrandedHeaderTitle title={String(children ?? '')} />,
        contentStyle: {
          backgroundColor: colors.background.primary,
        },
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          headerShown: false,
          title: "Poker Hands Coach: AI Trainer",
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
      {/* Was never registered, so it fell through to a default header and
          rendered the raw route name. */}
      <Stack.Screen
        name="full-hand-review"
        options={{
          headerShown: true,
          title: "Hand Review",
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

        if (update.isAvailable) {
          console.log('📥 Downloading update...');
          await Updates.fetchUpdateAsync();
          console.log('🔄 Reloading with new update...');
          await Updates.reloadAsync();
        } else {
          console.log('✨ App is up to date!');
        }
      } catch (error) {
        // Silently fail — an update that cannot be fetched is applied on a
        // later launch, and there is nothing the user can do about it now.
        console.error('❌ Update check failed:', error);
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
