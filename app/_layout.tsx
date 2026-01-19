import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect, useState, useCallback } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { StatusBar } from "expo-status-bar";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { PokerFlowProvider } from "@/hooks/usePokerFlow";
import { SplashFlow } from "@/components/SplashFlow";
import { colors } from "@/constants/colors";
import { initializeRevenueCat } from "@/services/revenueCat";

SplashScreen.preventAutoHideAsync();

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
          headerShown: true,
          title: "PokerGPT",
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
