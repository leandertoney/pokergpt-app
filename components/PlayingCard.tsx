import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, type ViewStyle, type TextStyle } from 'react-native';
import { colors } from '@/constants/colors';

type Suit = 'h' | 'd' | 'c' | 's';
type Rank = 'A' | 'K' | 'Q' | 'J' | 'T' | '9' | '8' | '7' | '6' | '5' | '4' | '3' | '2';

interface PlayingCardProps {
  rank: Rank | string;
  suit: Suit;
  size?: 'small' | 'medium' | 'large';
  faceDown?: boolean;
  animateIn?: boolean;
  delay?: number;
  style?: ViewStyle;
}

const SIZE_MAP = {
  small: { width: 36, height: 50, fontSize: 14, suitSize: 12 },
  medium: { width: 48, height: 68, fontSize: 18, suitSize: 16 },
  large: { width: 64, height: 90, fontSize: 24, suitSize: 20 },
};

const SUIT_SYMBOLS: Record<Suit, string> = {
  h: '♥',
  d: '♦',
  c: '♣',
  s: '♠',
};

const SUIT_COLORS: Record<Suit, string> = {
  h: colors.cards.hearts,
  d: colors.cards.diamonds,
  c: colors.cards.clubs,
  s: colors.cards.spades,
};

export function PlayingCard({
  rank,
  suit,
  size = 'medium',
  faceDown = false,
  animateIn = false,
  delay = 0,
  style,
}: PlayingCardProps) {
  const scaleAnim = useRef(new Animated.Value(animateIn ? 0 : 1)).current;
  const rotateAnim = useRef(new Animated.Value(animateIn ? 0.5 : 0)).current;

  const dimensions = SIZE_MAP[size];
  const suitSymbol = SUIT_SYMBOLS[suit];
  const suitColor = SUIT_COLORS[suit];

  useEffect(() => {
    if (animateIn) {
      const timeout = setTimeout(() => {
        Animated.parallel([
          Animated.spring(scaleAnim, {
            toValue: 1,
            tension: 60,
            friction: 8,
            useNativeDriver: true,
          }),
          Animated.timing(rotateAnim, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
        ]).start();
      }, delay);

      return () => clearTimeout(timeout);
    }
  }, [animateIn, delay, scaleAnim, rotateAnim]);

  const rotateInterpolate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  if (faceDown) {
    return (
      <Animated.View
        style={[
          styles.card,
          styles.faceDown,
          {
            width: dimensions.width,
            height: dimensions.height,
            borderRadius: dimensions.width * 0.12,
            transform: [
              { scale: scaleAnim },
              { rotateY: rotateInterpolate },
            ],
          },
          style,
        ]}
      >
        <View style={styles.faceDownPattern}>
          <View style={styles.faceDownInner} />
        </View>
      </Animated.View>
    );
  }

  return (
    <Animated.View
      style={[
        styles.card,
        {
          width: dimensions.width,
          height: dimensions.height,
          borderRadius: dimensions.width * 0.12,
          transform: [
            { scale: scaleAnim },
            { rotateY: rotateInterpolate },
          ],
        },
        style,
      ]}
    >
      {/* Top left corner */}
      <View style={styles.cornerTop}>
        <Text
          style={[
            styles.rank,
            { fontSize: dimensions.fontSize, color: suitColor },
          ]}
        >
          {rank}
        </Text>
        <Text
          style={[
            styles.suit,
            { fontSize: dimensions.suitSize, color: suitColor },
          ]}
        >
          {suitSymbol}
        </Text>
      </View>

      {/* Bottom right corner (rotated) */}
      <View style={styles.cornerBottom}>
        <Text
          style={[
            styles.rank,
            styles.rotated,
            { fontSize: dimensions.fontSize, color: suitColor },
          ]}
        >
          {rank}
        </Text>
        <Text
          style={[
            styles.suit,
            styles.rotated,
            { fontSize: dimensions.suitSize, color: suitColor },
          ]}
        >
          {suitSymbol}
        </Text>
      </View>
    </Animated.View>
  );
}

// Empty card placeholder component
export function EmptyCard({
  size = 'medium',
  style,
}: {
  size?: 'small' | 'medium' | 'large';
  style?: ViewStyle;
}) {
  const dimensions = SIZE_MAP[size];

  return (
    <View
      style={[
        styles.card,
        styles.emptyCard,
        {
          width: dimensions.width,
          height: dimensions.height,
          borderRadius: dimensions.width * 0.12,
        },
        style,
      ]}
    >
      <View style={styles.emptyDot} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
    padding: 4,
  } as ViewStyle,
  faceDown: {
    backgroundColor: colors.accent.primary,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  } as ViewStyle,
  faceDownPattern: {
    flex: 1,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  faceDownInner: {
    width: '60%',
    height: '60%',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  } as ViewStyle,
  cornerTop: {
    position: 'absolute',
    top: 3,
    left: 4,
    alignItems: 'center',
  } as ViewStyle,
  cornerBottom: {
    position: 'absolute',
    bottom: 3,
    right: 4,
    alignItems: 'center',
  } as ViewStyle,
  rank: {
    fontWeight: '700',
    lineHeight: undefined,
  } as TextStyle,
  suit: {
    marginTop: -2,
  } as TextStyle,
  rotated: {
    transform: [{ rotate: '180deg' }],
  } as TextStyle,
  emptyCard: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  emptyDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.3)',
  } as ViewStyle,
});

export default PlayingCard;
