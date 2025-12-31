import React, { useState, useCallback, useEffect } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, FlatList, Animated, type ViewStyle, type TextStyle } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Settings } from 'lucide-react-native';
import { SpotifyHandCard } from '@/components/SpotifyHandCard';
import { SearchBottomBar } from '@/components/SearchBottomBar';
import { FullResultCard } from '@/components/FullResultCard';
import { LoadingIndicator } from '@/components/LoadingIndicator';
import { ComposeModal } from '@/components/ComposeModal';
import { FloatingChatWidget } from '@/components/FloatingChatWidget';
import CardPicker from '@/components/CardPicker';
import { Onboarding, checkOnboardingComplete } from '@/components/Onboarding';
import { useHandHistory, type StoredHandEntryWithName } from '@/hooks/useHandHistory';
import { useAuth } from '@/contexts/AuthContext';
import { colors } from '@/constants/colors';

const { height: screenHeight } = require('react-native').Dimensions.get('window');

export default function HomeScreen() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();

  // Onboarding state
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isCheckingOnboarding, setIsCheckingOnboarding] = useState(true);

  // Hand history
  const { hands, isLoading, error, refresh, searchQuery, setSearchQuery, submitSearch } = useHandHistory();

  // Selected hand for detail view
  const [selectedHand, setSelectedHand] = useState<StoredHandEntryWithName | null>(null);
  const [slideAnim] = useState(new Animated.Value(screenHeight));

  // Compose modal state
  const [showComposeModal, setShowComposeModal] = useState(false);

  // Card picker state
  const [showCardPicker, setShowCardPicker] = useState(false);

  // Check onboarding - guests always see it, authenticated users can skip
  useEffect(() => {
    async function checkOnboarding() {
      const complete = await checkOnboardingComplete(isAuthenticated);
      setShowOnboarding(!complete);
      setIsCheckingOnboarding(false);
    }
    checkOnboarding();
  }, [isAuthenticated]);

  // Handle hand selection
  const handleSelectHand = useCallback((hand: StoredHandEntryWithName) => {
    setSelectedHand(hand);
    Animated.spring(slideAnim, {
      toValue: 0,
      useNativeDriver: true,
      tension: 50,
      friction: 9,
    }).start();
  }, [slideAnim]);

  // Hide result card
  const hideResultCard = useCallback(() => {
    Animated.spring(slideAnim, {
      toValue: screenHeight,
      useNativeDriver: true,
      tension: 50,
      friction: 9,
    }).start(() => {
      setSelectedHand(null);
    });
  }, [slideAnim]);

  // Handle compose modal options
  const handleComposeText = useCallback(() => {
    setShowComposeModal(false);
    router.push('/poker-chat');
  }, [router]);

  const handleComposeTalk = useCallback(() => {
    setShowComposeModal(false);
    router.push('/analysis');
  }, [router]);

  const handleComposeCards = useCallback(() => {
    setShowComposeModal(false);
    setShowCardPicker(true);
  }, []);

  const handleCardsSelected = useCallback((cards: string[]) => {
    setShowCardPicker(false);
    if (cards.length > 0) {
      // Format cards as a string and pass to poker chat
      const heroHand = cards.join(' ').toUpperCase();
      router.push({
        pathname: '/poker-chat',
        params: { heroHand },
      });
    }
  }, [router]);

  if (isCheckingOnboarding) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <LoadingIndicator variant={2} size="medium" />
        </View>
      </View>
    );
  }

  if (showOnboarding) {
    return <Onboarding onComplete={() => setShowOnboarding(false)} />;
  }

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyTitle}>No hands yet</Text>
      <Text style={styles.emptyText}>
        Your analyzed hands will appear here
      </Text>
    </View>
  );

  const renderErrorState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyTitle}>Something went wrong</Text>
      <Text style={styles.emptyText}>
        {error?.message || 'Failed to load hands'}
      </Text>
      <TouchableOpacity style={styles.retryButton} onPress={refresh}>
        <Text style={styles.retryText}>Try Again</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'PokerGPT',
          headerStyle: {
            backgroundColor: colors.background.primary,
          },
          headerTintColor: colors.accent.primary,
          headerTitleStyle: {
            fontWeight: '700' as const,
            fontSize: 20,
          },
          headerRight: () => (
            <TouchableOpacity
              style={styles.headerButton}
              onPress={() => router.push('/settings')}
            >
              <Settings size={22} color={colors.text.muted} />
            </TouchableOpacity>
          ),
        }}
      />

      <LinearGradient
        colors={[colors.background.secondary, colors.background.primary, '#0D0202']}
        locations={[0, 0.5, 1]}
        style={styles.gradient}
      >
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <LoadingIndicator variant={2} size="medium" text="Loading hands..." />
          </View>
        ) : error ? (
          <View style={styles.content}>
            <Text style={styles.sectionHeader}>Hand History</Text>
            {renderErrorState()}
          </View>
        ) : (
          <View style={styles.content}>
            {/* Section Header */}
            <Text style={styles.sectionHeader}>Hand History</Text>

            <FlatList
              data={hands}
              keyExtractor={(item) => item.handData.id || `hand-${Math.random()}`}
              renderItem={({ item }) => (
                <SpotifyHandCard
                  heroHand={item.handData.heroHand || '?? ??'}
                  handName={item.handName}
                  position={item.handData.heroPosition}
                  villainPosition={item.handData.villainPosition}
                  createdAt={item.createdAt}
                  confidence={item.analysis.confidence}
                  onPress={() => handleSelectHand(item)}
                />
              )}
              contentContainerStyle={[
                styles.listContent,
                hands.length === 0 && styles.emptyListContent,
              ]}
              ListEmptyComponent={renderEmptyState}
              showsVerticalScrollIndicator={false}
            />

            {/* Search Bar */}
            <SearchBottomBar
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmit={submitSearch}
              onCompose={() => setShowComposeModal(true)}
              placeholder="Search"
            />
          </View>
        )}
      </LinearGradient>

      {/* Result Overlay */}
      {selectedHand && (
        <>
          <TouchableOpacity
            style={styles.overlay}
            activeOpacity={1}
            onPress={hideResultCard}
          />
          <Animated.View
            style={[
              styles.resultOverlay,
              {
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            <TouchableOpacity
              style={styles.resultHandle}
              onPress={hideResultCard}
              activeOpacity={0.8}
            >
              <View style={styles.handleBar} />
            </TouchableOpacity>
            <FullResultCard
              analysis={selectedHand.analysis}
              handData={selectedHand.handData}
            />
          </Animated.View>
        </>
      )}

      {/* Floating Chat Widget */}
      <FloatingChatWidget />

      {/* Compose Modal */}
      <ComposeModal
        visible={showComposeModal}
        onClose={() => setShowComposeModal(false)}
        onSelectText={handleComposeText}
        onSelectTalk={handleComposeTalk}
        onSelectCards={handleComposeCards}
      />

      {/* Card Picker */}
      <CardPicker
        visible={showCardPicker}
        onClose={() => setShowCardPicker(false)}
        onSelect={handleCardsSelected}
        maxCards={2}
        title="Select Your Hole Cards"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  } as ViewStyle,
  gradient: {
    flex: 1,
  } as ViewStyle,
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  content: {
    flex: 1,
  } as ViewStyle,
  sectionHeader: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: colors.text.primary,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  } as TextStyle,
  headerButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 8,
  } as ViewStyle,
  listContent: {
    paddingTop: 4,
    paddingBottom: 20,
  } as ViewStyle,
  emptyListContent: {
    flex: 1,
    justifyContent: 'center',
  } as ViewStyle,
  emptyState: {
    alignItems: 'center',
    paddingHorizontal: 40,
  } as ViewStyle,
  emptyTitle: {
    fontSize: 22,
    fontWeight: '600' as const,
    color: colors.text.primary,
    marginBottom: 8,
  } as TextStyle,
  emptyText: {
    fontSize: 16,
    color: colors.text.muted,
    textAlign: 'center',
  } as TextStyle,
  retryButton: {
    marginTop: 20,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: colors.accent.primary,
    borderRadius: 20,
  } as ViewStyle,
  retryText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: colors.text.primary,
  } as TextStyle,
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
  } as ViewStyle,
  resultOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '90%',
    backgroundColor: colors.background.primary,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  } as ViewStyle,
  resultHandle: {
    paddingVertical: 12,
    alignItems: 'center',
  } as ViewStyle,
  handleBar: {
    width: 50,
    height: 5,
    backgroundColor: colors.background.tertiary,
    borderRadius: 3,
  } as ViewStyle,
});
