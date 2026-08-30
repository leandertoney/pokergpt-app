import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, type ViewStyle, type TextStyle } from 'react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react-native';
import { FullResultCard } from '@/components/FullResultCard';
import { LoadingIndicator } from '@/components/LoadingIndicator';
import { trackScreen } from '@/services/appAnalytics';
import { getHandHistory } from '@/services/storageService';
import { colors } from '@/constants/colors';

export default function AnalysisScreen() {
  useEffect(() => {
    trackScreen('analysis');
  }, []);

  const router = useRouter();
  const { handId } = useLocalSearchParams<{ handId: string }>();
  const insets = useSafeAreaInsets();

  const { data: hands, isLoading } = useQuery({
    queryKey: ['handHistory'],
    queryFn: getHandHistory,
  });

  const hand = hands?.find(h => h.handData.id === handId);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Stack.Screen
          options={{
            title: 'Analysis',
            headerStyle: {
              backgroundColor: colors.background.primary,
            },
            headerTintColor: colors.accent.primary,
          }}
        />
        <LoadingIndicator variant={4} size="medium" text="Loading analysis..." />
      </View>
    );
  }

  if (!hand) {
    return (
      <View style={styles.errorContainer}>
        <Stack.Screen
          options={{
            title: 'Analysis',
            headerStyle: {
              backgroundColor: colors.background.primary,
            },
            headerTintColor: colors.accent.primary,
          }}
        />
        <Text style={styles.errorText}>Hand not found</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={20} color={colors.text.dark} />
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <Stack.Screen
        options={{
          title: 'Hand Analysis',
          headerStyle: {
            backgroundColor: colors.background.primary,
          },
          headerTintColor: colors.accent.primary,
          headerTitleStyle: {
            fontWeight: '700' as const,
          },
        }}
      />
      <FullResultCard analysis={hand.analysis} handData={hand.handData} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  } as ViewStyle,
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background.primary,
  } as ViewStyle,
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background.primary,
    padding: 20,
  } as ViewStyle,
  errorText: {
    fontSize: 18,
    color: colors.error,
    marginBottom: 20,
  } as TextStyle,
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.accent.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  } as ViewStyle,
  backButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: colors.text.primary,
  } as TextStyle,
});
