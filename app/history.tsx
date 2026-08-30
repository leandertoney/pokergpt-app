import React, { useState, useCallback, useEffect } from 'react';
import { View, FlatList, StyleSheet, Text, TouchableOpacity, RefreshControl, Animated, type ViewStyle, type TextStyle } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Sparkles } from 'lucide-react-native';
import { useHandHistory, type StoredHandEntry } from '@/hooks/useHandHistory';
import { HandHistoryCard } from '@/components/HandHistoryCard';
import { NotesBottomBar } from '@/components/NotesBottomBar';
import { FullResultCard } from '@/components/FullResultCard';
import { LoadingIndicator } from '@/components/LoadingIndicator';
import { trackScreen } from '@/services/appAnalytics';
import { colors } from '@/constants/colors';

const { height: screenHeight } = require('react-native').Dimensions.get('window');

export default function HistoryScreen() {
  useEffect(() => {
    trackScreen('history');
  }, []);

  const router = useRouter();
  const { hands, isLoading, isSearching, searchQuery, setSearchQuery, submitSearch, refresh } = useHandHistory();

  const [selectedHand, setSelectedHand] = useState<StoredHandEntry | null>(null);
  const [slideAnim] = useState(new Animated.Value(screenHeight));
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }, [refresh]);

  const handleSelectHand = useCallback((hand: StoredHandEntry) => {
    setSelectedHand(hand);
    Animated.spring(slideAnim, {
      toValue: 0,
      useNativeDriver: true,
      tension: 50,
      friction: 9,
    }).start();
  }, [slideAnim]);

  const hideAnalysisCard = useCallback(() => {
    Animated.spring(slideAnim, {
      toValue: screenHeight,
      useNativeDriver: true,
      tension: 50,
      friction: 9,
    }).start(() => {
      setSelectedHand(null);
    });
  }, [slideAnim]);

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <View style={styles.emptyIconContainer}>
        <Sparkles size={48} color={colors.accent.primary} />
      </View>
      <Text style={styles.emptyTitle}>No hands yet</Text>
      <Text style={styles.emptyText}>
        Your analyzed hands will appear here. Go back and start your first analysis!
      </Text>
    </View>
  );

  const renderSearchEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyTitle}>No matches found</Text>
      <Text style={styles.emptyText}>
        Try a different search or clear to see all hands
      </Text>
    </View>
  );

  // Group hands by date
  const groupHandsByDate = (handsList: StoredHandEntry[]) => {
    const groups: { title: string; data: StoredHandEntry[] }[] = [];
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const todayHands: StoredHandEntry[] = [];
    const yesterdayHands: StoredHandEntry[] = [];
    const olderHands: StoredHandEntry[] = [];

    handsList.forEach(hand => {
      const handDate = new Date(hand.createdAt);
      if (handDate.toDateString() === today.toDateString()) {
        todayHands.push(hand);
      } else if (handDate.toDateString() === yesterday.toDateString()) {
        yesterdayHands.push(hand);
      } else {
        olderHands.push(hand);
      }
    });

    if (todayHands.length > 0) {
      groups.push({ title: 'Today', data: todayHands });
    }
    if (yesterdayHands.length > 0) {
      groups.push({ title: 'Yesterday', data: yesterdayHands });
    }
    if (olderHands.length > 0) {
      groups.push({ title: 'Earlier', data: olderHands });
    }

    return groups;
  };

  const groupedHands = groupHandsByDate(hands);

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Hand History',
          headerStyle: {
            backgroundColor: colors.background.primary,
          },
          headerTintColor: colors.text.primary,
          headerTitleStyle: {
            fontWeight: '600' as const,
            fontSize: 18,
          },
          headerBackTitle: 'Back',
        }}
      />

      <LinearGradient
        colors={[colors.background.tertiary, colors.background.secondary, colors.background.primary, '#0D0202']}
        locations={[0, 0.3, 0.7, 1]}
        style={styles.gradient}
      >
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <LoadingIndicator variant={2} size="medium" text="Loading hands..." />
          </View>
        ) : (
          <View style={styles.contentWrapper}>
            <FlatList
              data={groupedHands}
              keyExtractor={(item) => item.title}
              renderItem={({ item: group }) => (
                <View>
                  <Text style={styles.sectionTitle}>{group.title}</Text>
                  {group.data.map((hand, index) => (
                    <HandHistoryCard
                      key={hand.handData.id || `hand-${index}`}
                      handData={hand.handData}
                      analysis={hand.analysis}
                      createdAt={hand.createdAt}
                      onPress={() => handleSelectHand(hand)}
                    />
                  ))}
                </View>
              )}
              contentContainerStyle={[
                styles.listContent,
                hands.length === 0 && styles.emptyListContent,
              ]}
              ListEmptyComponent={searchQuery ? renderSearchEmptyState : renderEmptyState}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={handleRefresh}
                  tintColor={colors.accent.primary}
                  colors={[colors.accent.primary]}
                />
              }
              ListHeaderComponent={
                isSearching ? (
                  <View style={styles.searchingIndicator}>
                    <LoadingIndicator variant={2} size="small" />
                  </View>
                ) : null
              }
              keyboardShouldPersistTaps="handled"
            />

            {/* Apple Notes-style Bottom Bar */}
            <NotesBottomBar
              searchValue={searchQuery}
              onSearchChange={setSearchQuery}
              onSearchSubmit={submitSearch}
              searchPlaceholder="Search for hand history"
              onMicPress={() => {}}
              showMic={false}
              onComposePress={() => router.push('/')}
              variant="history"
            />
          </View>
        )}
      </LinearGradient>

      {/* Analysis Overlay */}
      {selectedHand && (
        <>
          <TouchableOpacity
            style={styles.overlay}
            activeOpacity={1}
            onPress={hideAnalysisCard}
          />
          <Animated.View
            style={[
              styles.analysisOverlay,
              {
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            <TouchableOpacity
              style={styles.analysisHandle}
              onPress={hideAnalysisCard}
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
  contentWrapper: {
    flex: 1,
  } as ViewStyle,
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  } as ViewStyle,
  listContent: {
    paddingVertical: 8,
    paddingBottom: 40,
  } as ViewStyle,
  emptyListContent: {
    flex: 1,
  } as ViewStyle,
  searchingIndicator: {
    alignItems: 'center',
    paddingTop: 12,
  } as ViewStyle,
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: colors.text.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginLeft: 20,
    marginTop: 16,
    marginBottom: 8,
  } as TextStyle,
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  } as ViewStyle,
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.background.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  } as ViewStyle,
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600' as const,
    color: colors.text.primary,
    marginBottom: 8,
    textAlign: 'center',
  } as TextStyle,
  emptyText: {
    fontSize: 15,
    color: colors.text.muted,
    textAlign: 'center',
    lineHeight: 22,
  } as TextStyle,
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
  } as ViewStyle,
  analysisOverlay: {
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
  analysisHandle: {
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
