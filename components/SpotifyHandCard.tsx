import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, type ViewStyle, type TextStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '@/constants/colors';
import { FavoriteButton } from './FavoriteButton';

interface SpotifyHandCardProps {
  heroHand: string;
  handName?: string;
  position?: string;
  villainPosition?: string;
  createdAt?: string;
  onPress: () => void;
  onLongPress?: () => void;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
  sessionName?: string;
}

function formatRelativeTime(dateString?: string): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

// Parse card string like "A♠" into { rank: "A", suit: "♠" }
function parseCard(card: string): { rank: string; suit: string } {
  const suits = ['♠', '♥', '♦', '♣'];
  for (const suit of suits) {
    if (card.includes(suit)) {
      return { rank: card.replace(suit, ''), suit };
    }
  }
  return { rank: card, suit: '' };
}

// Get suit color
function getSuitColor(suit: string): string {
  if (suit === '♥' || suit === '♦') return '#E63333'; // Red
  return '#1A0505'; // Dark maroon for spades/clubs (visible on cream card)
}

// Render individual card
function CardDisplay({ card }: { card: string }) {
  const { rank, suit } = parseCard(card.trim());
  const suitColor = getSuitColor(suit);

  return (
    <View style={cardStyles.card}>
      <Text style={[cardStyles.rank, { color: suitColor }]}>{rank}</Text>
      <Text style={[cardStyles.suit, { color: suitColor }]}>{suit}</Text>
    </View>
  );
}

export function SpotifyHandCard({
  heroHand,
  handName,
  position,
  villainPosition,
  createdAt,
  onPress,
  onLongPress,
  isFavorite = false,
  onToggleFavorite,
  sessionName,
}: SpotifyHandCardProps) {
  // Split hero hand into individual cards
  const cards = heroHand.split(' ').filter(c => c.length > 0);
  const positionDisplay = villainPosition
    ? `${position} vs ${villainPosition}`
    : position;

  // Generate a hand name if not provided
  const displayName = handName || generateHandName(heroHand);

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={500}
      activeOpacity={0.8}
    >
      <LinearGradient
        colors={['#2D1212', '#1A0808']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        {/* Cards Row */}
        <View style={styles.cardsRow}>
          {cards.map((card, index) => (
            <CardDisplay key={index} card={card} />
          ))}
        </View>

        {/* Text Content */}
        <View style={styles.textContent}>
          {/* Hand Name */}
          <Text style={styles.handName} numberOfLines={1}>
            {displayName}
          </Text>

          {/* Metadata Row */}
          <View style={styles.metaRow}>
            {positionDisplay && (
              <Text style={styles.position}>{positionDisplay}</Text>
            )}
            {positionDisplay && createdAt && (
              <Text style={styles.separator}>·</Text>
            )}
            {createdAt && (
              <Text style={styles.timestamp}>{formatRelativeTime(createdAt)}</Text>
            )}
            {sessionName && (
              <>
                <Text style={styles.separator}>·</Text>
                <View style={styles.sessionBadge}>
                  <Text style={styles.sessionBadgeText}>{sessionName}</Text>
                </View>
              </>
            )}
          </View>

        </View>

        {/* Favorite Button */}
        {onToggleFavorite && (
          <FavoriteButton
            isFavorite={isFavorite}
            onToggle={onToggleFavorite}
            style={styles.favoriteButton}
          />
        )}
      </LinearGradient>
    </TouchableOpacity>
  );
}

// Generate a descriptive hand name based on the cards
function generateHandName(heroHand: string): string {
  const cards = heroHand.toUpperCase().split(' ');
  if (cards.length !== 2) return 'Hand Analysis';

  const [card1, card2] = cards;
  const rank1 = card1.replace(/[♠♥♦♣]/g, '');
  const rank2 = card2.replace(/[♠♥♦♣]/g, '');
  const suit1 = card1.match(/[♠♥♦♣]/)?.[0] || '';
  const suit2 = card2.match(/[♠♥♦♣]/)?.[0] || '';

  const isSuited = suit1 === suit2;
  const isPair = rank1 === rank2;

  if (isPair) {
    return `Pocket ${getRankName(rank1)}s`;
  }

  const highCard = getRankValue(rank1) > getRankValue(rank2) ? rank1 : rank2;
  const lowCard = getRankValue(rank1) > getRankValue(rank2) ? rank2 : rank1;

  if (highCard === 'A' && lowCard === 'K') {
    return isSuited ? 'Big Slick Suited' : 'Big Slick';
  }

  return isSuited ? `${highCard}${lowCard} Suited` : `${highCard}${lowCard} Offsuit`;
}

function getRankName(rank: string): string {
  const names: Record<string, string> = {
    'A': 'Ace', 'K': 'King', 'Q': 'Queen', 'J': 'Jack', 'T': 'Ten',
    '10': 'Ten', '9': 'Nine', '8': 'Eight', '7': 'Seven', '6': 'Six',
    '5': 'Five', '4': 'Four', '3': 'Three', '2': 'Two'
  };
  return names[rank] || rank;
}

function getRankValue(rank: string): number {
  const values: Record<string, number> = {
    'A': 14, 'K': 13, 'Q': 12, 'J': 11, 'T': 10, '10': 10,
    '9': 9, '8': 8, '7': 7, '6': 6, '5': 5, '4': 4, '3': 3, '2': 2
  };
  return values[rank] || 0;
}

const cardStyles = StyleSheet.create({
  card: {
    backgroundColor: colors.background.card,
    borderRadius: 6,
    width: 38,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  } as ViewStyle,
  rank: {
    fontSize: 20,
    fontWeight: '700' as const,
  } as TextStyle,
  suit: {
    fontSize: 14,
    marginTop: -2,
  } as TextStyle,
});

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 20,
    marginVertical: 6,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  } as ViewStyle,
  gradient: {
    padding: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(230, 51, 51, 0.15)',
    flexDirection: 'row',
    alignItems: 'center',
  } as ViewStyle,
  cardsRow: {
    flexDirection: 'row',
    marginRight: 14,
  } as ViewStyle,
  textContent: {
    flex: 1,
  } as ViewStyle,
  handName: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: colors.text.primary,
    marginBottom: 4,
  } as TextStyle,
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  } as ViewStyle,
  position: {
    fontSize: 13,
    color: colors.accent.primary,
    fontWeight: '500' as const,
  } as TextStyle,
  separator: {
    fontSize: 13,
    color: colors.text.muted,
    marginHorizontal: 6,
  } as TextStyle,
  timestamp: {
    fontSize: 13,
    color: colors.text.muted,
  } as TextStyle,
  favoriteButton: {
    marginLeft: 8,
  } as ViewStyle,
  sessionBadge: {
    backgroundColor: 'rgba(232, 184, 74, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  } as ViewStyle,
  sessionBadgeText: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: colors.accent.gold,
  } as TextStyle,
});
