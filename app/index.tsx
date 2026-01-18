import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, FlatList, Animated, KeyboardAvoidingView, Platform, type ViewStyle, type TextStyle } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Settings, MessageCircle, Star } from 'lucide-react-native';
import { SpotifyHandCard } from '@/components/SpotifyHandCard';
import { ChatCard } from '@/components/ChatCard';
import { SwipeableRow } from '@/components/SwipeableRow';
import { FilterChips, type FilterOption } from '@/components/FilterChips';
import { SearchBottomBar } from '@/components/SearchBottomBar';
import { FullResultCard } from '@/components/FullResultCard';
import { LoadingIndicator } from '@/components/LoadingIndicator';
import CardPicker from '@/components/CardPicker';
import { OnboardingV2, checkOnboardingComplete } from '@/components/OnboardingV2';
import { DailyReviewCard } from '@/components/DailyReviewCard';
import { useHandHistory, type StoredHandEntryWithName } from '@/hooks/useHandHistory';
import { useChatHistory } from '@/hooks/useChatHistory';
import { useFavorites } from '@/hooks/useFavorites';
import { useAuth } from '@/contexts/AuthContext';
import { colors } from '@/constants/colors';
import type { HandData, AnalysisResult } from '@/types/poker';
import type { ChatConversation } from '@/types/chat';

// Type for combined list items (hands + chats)
type CombinedListItem =
  | { type: 'hand'; data: StoredHandEntryWithName; timestamp: number }
  | { type: 'chat'; data: ChatConversation; timestamp: number };

const { height: screenHeight } = require('react-native').Dimensions.get('window');
const OPENAI_API_KEY = process.env.EXPO_PUBLIC_OPENAI_API_KEY || '';

// Demo hand to show when user has no hands yet
const DEMO_HAND: { handData: HandData; analysis: AnalysisResult; handName: string } = {
  handData: {
    id: 'demo-hand',
    heroHand: 'As Ks',
    heroPosition: 'CO',
    villainPosition: 'BTN',
    action: '3-bets to $35',
    potSize: 55,
    effectiveStack: 200,
    flop: ['Kh', '7d', '2c'],
  },
  analysis: {
    recommendedAction: 'Call',
    confidence: 78,
    reasoning: 'Strong suited broadway hand with position. Calling keeps villain\'s bluffs in while maintaining playability postflop.',
    gtoLine: 'Call and play in position postflop',
    exploitLine: 'Consider 4-betting vs aggressive opponents',
    // Math education fields
    equity: 72,
    potOdds: 2.6,
    outs: 5,
    outBreakdown: 'Top pair with 5 outs to improve: 2 aces to trips, 3 kings to two pair',
    riskLevel: 'medium',
  },
  handName: '3-Bet Pot with AKs',
};

export default function HomeScreen() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();

  // Onboarding state
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isCheckingOnboarding, setIsCheckingOnboarding] = useState(true);

  // Hand history
  const { hands, isLoading, isRefreshing, error, refresh, searchQuery, setSearchQuery, submitSearch, deleteHand } = useHandHistory();

  // Chat history
  const {
    chats,
    isRefreshing: isChatsRefreshing,
    refresh: refreshChats,
    deleteChat,
  } = useChatHistory();

  // Favorites
  const { isFavorite, toggleFavorite, getFavoriteHandIds, getFavoriteChatIds } = useFavorites();

  // Active filter state
  const [activeFilter, setActiveFilter] = useState<FilterOption>('all');

  // Selected hand for detail view
  const [selectedHand, setSelectedHand] = useState<StoredHandEntryWithName | null>(null);
  const [slideAnim] = useState(new Animated.Value(screenHeight));

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

  // Handle demo hand selection (must be before early returns to avoid hooks violation)
  const handleDemoHandPress = useCallback(() => {
    setSelectedHand({
      handData: DEMO_HAND.handData,
      analysis: DEMO_HAND.analysis,
      handName: DEMO_HAND.handName,
      createdAt: new Date().toISOString(),
    });
    Animated.spring(slideAnim, {
      toValue: 0,
      useNativeDriver: true,
      tension: 50,
      friction: 9,
    }).start();
  }, [slideAnim]);

  // Handle chat selection - navigate to continue conversation
  const handleSelectChat = useCallback((chat: ChatConversation) => {
    router.push({
      pathname: '/poker-chat',
      params: { chatId: chat.id },
    });
  }, [router]);

  // Handle filter change
  const handleFilterChange = useCallback((filter: FilterOption) => {
    setActiveFilter(filter);
  }, []);

  // Get filtered content based on active filter
  const getFilteredContent = useMemo((): CombinedListItem[] => {
    const favoriteHandIds = getFavoriteHandIds();
    const favoriteChatIds = getFavoriteChatIds();

    switch (activeFilter) {
      case 'all': {
        // Combine hands and chats, sorted by date
        const handItems: CombinedListItem[] = hands.map(h => ({
          type: 'hand' as const,
          data: h,
          timestamp: h.createdAt ? new Date(h.createdAt).getTime() : 0,
        }));
        const chatItems: CombinedListItem[] = chats.map(c => ({
          type: 'chat' as const,
          data: c,
          timestamp: c.updatedAt,
        }));
        return [...handItems, ...chatItems].sort((a, b) => b.timestamp - a.timestamp);
      }
      case 'hands':
        return hands.map(h => ({
          type: 'hand' as const,
          data: h,
          timestamp: h.createdAt ? new Date(h.createdAt).getTime() : 0,
        }));
      case 'chats':
        return chats.map(c => ({
          type: 'chat' as const,
          data: c,
          timestamp: c.updatedAt,
        }));
      case 'favorites': {
        // Only favorited items
        const favoriteHands: CombinedListItem[] = hands
          .filter(h => h.handData.id && favoriteHandIds.has(h.handData.id))
          .map(h => ({
            type: 'hand' as const,
            data: h,
            timestamp: h.createdAt ? new Date(h.createdAt).getTime() : 0,
          }));
        const favoriteChats: CombinedListItem[] = chats
          .filter(c => favoriteChatIds.has(c.id))
          .map(c => ({
            type: 'chat' as const,
            data: c,
            timestamp: c.updatedAt,
          }));
        return [...favoriteHands, ...favoriteChats].sort((a, b) => b.timestamp - a.timestamp);
      }
      default:
        return [];
    }
  }, [activeFilter, hands, chats, getFavoriteHandIds, getFavoriteChatIds]);

  // Filter counts for badges
  const filterCounts = useMemo(() => {
    const favoriteHandIds = getFavoriteHandIds();
    const favoriteChatIds = getFavoriteChatIds();
    return {
      all: hands.length + chats.length,
      hands: hands.length,
      chats: chats.length,
      favorites: hands.filter(h => h.handData.id && favoriteHandIds.has(h.handData.id)).length +
                 chats.filter(c => favoriteChatIds.has(c.id)).length,
    };
  }, [hands, chats, getFavoriteHandIds, getFavoriteChatIds]);

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
    return <OnboardingV2 onComplete={() => setShowOnboarding(false)} />;
  }

  const renderHandsEmptyState = () => (
    <View style={styles.emptyStateContainer}>
      {/* Demo hand with EXAMPLE badge */}
      <View style={styles.demoHandWrapper}>
        <View style={styles.exampleBadge}>
          <Text style={styles.exampleBadgeText}>EXAMPLE</Text>
        </View>
        <SpotifyHandCard
          heroHand={DEMO_HAND.handData.heroHand || 'A♠ K♠'}
          handName={DEMO_HAND.handName}
          position={DEMO_HAND.handData.heroPosition}
          villainPosition={DEMO_HAND.handData.villainPosition}
          createdAt={new Date().toISOString()}
          onPress={handleDemoHandPress}
        />
      </View>

      {/* Helper text */}
      <Text style={styles.emptyHintText}>
        Tap the card above to see what analysis looks like
      </Text>
      <Text style={styles.emptySubtext}>
        Your hands will appear here after analysis
      </Text>
    </View>
  );

  const renderChatsEmptyState = () => (
    <View style={styles.emptyStateContainer}>
      <View style={styles.chatEmptyIcon}>
        <MessageCircle size={48} color={colors.accent.primary} />
      </View>
      <Text style={styles.emptyTitle}>No Conversations Yet</Text>
      <Text style={styles.emptySubtext}>
        Start a chat with the poker assistant to get strategy advice
      </Text>
      <TouchableOpacity
        style={styles.startChatButton}
        onPress={() => router.push('/poker-chat')}
      >
        <Text style={styles.startChatText}>Start a Chat</Text>
      </TouchableOpacity>
    </View>
  );

  const renderFavoritesEmptyState = () => (
    <View style={styles.emptyStateContainer}>
      <View style={styles.favoritesEmptyIcon}>
        <Star size={48} color={colors.accent.gold} />
      </View>
      <Text style={styles.emptyTitle}>No Favorites Yet</Text>
      <Text style={styles.emptySubtext}>
        Tap the star on any hand or chat to save it here
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
          headerTintColor: colors.onboarding.gold,
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

      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
      >
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
              {/* Daily Review Card */}
              <DailyReviewCard />

              {/* Filter Chips */}
              <FilterChips
                activeFilter={activeFilter}
                onFilterChange={handleFilterChange}
                counts={filterCounts}
              />

              {/* Content based on active filter */}
              <FlatList
                data={getFilteredContent}
                keyExtractor={(item) =>
                  item.type === 'hand'
                    ? item.data.handData.id || `hand-${item.timestamp}`
                    : item.data.id
                }
                renderItem={({ item }) => {
                  if (item.type === 'hand') {
                    const hand = item.data;
                    const handId = hand.handData.id || '';
                    return (
                      <SwipeableRow onDelete={() => deleteHand(handId)}>
                        <SpotifyHandCard
                          heroHand={hand.handData.heroHand || '?? ??'}
                          handName={hand.handName}
                          position={hand.handData.heroPosition}
                          villainPosition={hand.handData.villainPosition}
                          createdAt={hand.createdAt}
                          onPress={() => handleSelectHand(hand)}
                          isFavorite={isFavorite(handId, 'hand')}
                          onToggleFavorite={() => toggleFavorite(handId, 'hand')}
                        />
                      </SwipeableRow>
                    );
                  } else {
                    const chat = item.data;
                    return (
                      <SwipeableRow onDelete={() => deleteChat(chat.id)}>
                        <ChatCard
                          id={chat.id}
                          title={chat.title}
                          preview={chat.preview}
                          messageCount={chat.messageCount}
                          createdAt={chat.createdAt}
                          updatedAt={chat.updatedAt}
                          onPress={() => handleSelectChat(chat)}
                          isFavorite={isFavorite(chat.id, 'chat')}
                          onToggleFavorite={() => toggleFavorite(chat.id, 'chat')}
                        />
                      </SwipeableRow>
                    );
                  }
                }}
                contentContainerStyle={[
                  styles.listContent,
                  getFilteredContent.length === 0 && styles.emptyListContent,
                ]}
                ListEmptyComponent={
                  activeFilter === 'favorites'
                    ? renderFavoritesEmptyState
                    : activeFilter === 'chats'
                      ? renderChatsEmptyState
                      : renderHandsEmptyState
                }
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                refreshing={isRefreshing || isChatsRefreshing}
                onRefresh={() => {
                  refresh();
                  refreshChats();
                }}
              />

              {/* Search Bar with Speak Button */}
              <SearchBottomBar
                value={searchQuery}
                onChangeText={setSearchQuery}
                onSubmit={submitSearch}
                openaiApiKey={OPENAI_API_KEY}
              />
            </View>
          )}
        </LinearGradient>
      </KeyboardAvoidingView>

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
  keyboardAvoid: {
    flex: 1,
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
  emptyStateContainer: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
  } as ViewStyle,
  demoHandWrapper: {
    width: '100%',
    position: 'relative',
    opacity: 0.85,
  } as ViewStyle,
  exampleBadge: {
    position: 'absolute',
    top: 8,
    right: 28,
    backgroundColor: colors.onboarding.gold,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    zIndex: 10,
  } as ViewStyle,
  exampleBadgeText: {
    fontSize: 10,
    fontWeight: '800' as const,
    color: '#000',
    letterSpacing: 1,
  } as TextStyle,
  emptyHintText: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: colors.text.secondary,
    marginTop: 16,
    textAlign: 'center',
  } as TextStyle,
  emptySubtext: {
    fontSize: 13,
    color: colors.text.muted,
    marginTop: 4,
    textAlign: 'center',
  } as TextStyle,
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
  chatEmptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 58, 58, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  } as ViewStyle,
  favoritesEmptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(232, 184, 74, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  } as ViewStyle,
  startChatButton: {
    marginTop: 20,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: colors.accent.primary,
    borderRadius: 20,
  } as ViewStyle,
  startChatText: {
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
