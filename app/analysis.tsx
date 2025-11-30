import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, type ViewStyle, type TextStyle } from 'react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react-native';
import { FullResultCard } from '@/components/FullResultCard';
import { getHandHistory } from '@/services/storageService';

export default function AnalysisScreen() {
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
              backgroundColor: '#000000',
            },
            headerTintColor: '#D4AF37',
          }} 
        />
        <Text style={styles.loadingText}>Loading analysis...</Text>
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
              backgroundColor: '#000000',
            },
            headerTintColor: '#D4AF37',
          }} 
        />
        <Text style={styles.errorText}>Hand not found</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={20} color="#000" />
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
            backgroundColor: '#000000',
          },
          headerTintColor: '#D4AF37',
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
    backgroundColor: '#000000',
  } as ViewStyle,
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000000',
  } as ViewStyle,
  loadingText: {
    fontSize: 16,
    color: '#999',
  } as TextStyle,
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000000',
    padding: 20,
  } as ViewStyle,
  errorText: {
    fontSize: 18,
    color: '#FF5555',
    marginBottom: 20,
  } as TextStyle,
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#D4AF37',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  } as ViewStyle,
  backButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#000',
  } as TextStyle,
});
