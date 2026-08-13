import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Image,
  Dimensions,
  type ViewStyle,
  type TextStyle,
  type ImageStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { colors } from '@/constants/colors';

const HERO_IMAGE = require('../../assets/images/onboarding/pocket_aces.jpg');

const { width: SW, height: SH } = Dimensions.get('window');

const AVATAR_COLORS = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F'];

type CommentData = {
  text: string;
  user: string;
  top: number;
  left: number;
  rotate: number;
  fromX: number;
  fromY: number;
  delay: number;
  maxWidth: number;
};

const COMMENTS: CommentData[] = [
  // Upper rows (over the hero image)
  { text: "Up $3K this month! Best investment ever 🔥", user: "crushing_nl200", top: SH * 0.12, left: SW * 0.03, rotate: -3, fromX: -500, fromY: -80, delay: 500, maxWidth: SW * 0.48 },
  { text: "Finally moved up to 2/5 with confidence!", user: "rising_star", top: SH * 0.10, left: SW * 0.50, rotate: 2.5, fromX: 500, fromY: -40, delay: 650, maxWidth: SW * 0.46 },
  { text: "This changed my game completely ⭐", user: "poker_student", top: SH * 0.23, left: SW * 0.05, rotate: -1.5, fromX: -500, fromY: 0, delay: 800, maxWidth: SW * 0.50 },
  { text: "Making better decisions every session 💪", user: "smart_player", top: SH * 0.26, left: SW * 0.48, rotate: 3, fromX: 500, fromY: 0, delay: 950, maxWidth: SW * 0.48 },
  // Lower rows (below headline)
  { text: "Consistent wins for 3 months straight!", user: "steady_eddie", top: SH * 0.50, left: SW * 0.04, rotate: -2, fromX: -500, fromY: 40, delay: 1100, maxWidth: SW * 0.52 },
  { text: "Everything I study actually makes sense now", user: "learning_fast", top: SH * 0.53, left: SW * 0.50, rotate: 1.5, fromX: 500, fromY: 0, delay: 1250, maxWidth: SW * 0.46 },
  { text: "My win rate doubled in 6 weeks 📈", user: "profit_machine", top: SH * 0.63, left: SW * 0.03, rotate: -2.5, fromX: -500, fromY: 80, delay: 1400, maxWidth: SW * 0.50 },
  { text: "Playing my best poker ever. No looking back!", user: "confident_pro", top: SH * 0.65, left: SW * 0.46, rotate: 2, fromX: 500, fromY: 40, delay: 1550, maxWidth: SW * 0.50 },
];

type HeroScreenProps = {
  onNext: () => void;
};

export function HeroScreen({ onNext }: HeroScreenProps) {
  const headlineAnim = useRef(new Animated.Value(0)).current;
  const commentAnims = useRef(COMMENTS.map(() => new Animated.Value(0))).current;
  const closerAnim = useRef(new Animated.Value(0)).current;
  const buttonAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Reset all values to 0 (handles Fast Refresh / remount edge cases)
    headlineAnim.setValue(0);
    commentAnims.forEach(a => a.setValue(0));
    closerAnim.setValue(0);
    buttonAnim.setValue(0);

    const timers: ReturnType<typeof setTimeout>[] = [];

    // Headline appears first
    timers.push(setTimeout(() => {
      Animated.spring(headlineAnim, {
        toValue: 1,
        tension: 40,
        friction: 9,
        useNativeDriver: true,
      }).start();
    }, 200));

    // Comments fly in from all directions
    COMMENTS.forEach((comment, index) => {
      timers.push(setTimeout(() => {
        Animated.spring(commentAnims[index], {
          toValue: 1,
          tension: 65,
          friction: 7,
          useNativeDriver: true,
        }).start();
      }, comment.delay));
    });

    // Closer fades in after all comments
    const lastDelay = Math.max(...COMMENTS.map(c => c.delay));
    timers.push(setTimeout(() => {
      Animated.spring(closerAnim, {
        toValue: 1,
        tension: 35,
        friction: 10,
        useNativeDriver: true,
      }).start();
    }, lastDelay + 400));

    // Button slides up last
    timers.push(setTimeout(() => {
      Animated.spring(buttonAnim, {
        toValue: 1,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }).start();
    }, lastDelay + 700));

    return () => timers.forEach(clearTimeout);
  }, []);

  const handleContinue = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onNext();
  };

  return (
    <View style={styles.container}>
      {/* Background image */}
      <View style={styles.heroContainer}>
        <Image
          source={HERO_IMAGE}
          style={styles.heroImage}
          resizeMode="cover"
        />
        <LinearGradient
          colors={['rgba(13,13,20,0.3)', 'rgba(13,13,20,0.6)', colors.background.primary]}
          locations={[0, 0.45, 0.75]}
          style={StyleSheet.absoluteFillObject}
        />
      </View>

      {/* Flying comment cards */}
      {COMMENTS.map((comment, index) => (
        <Animated.View
          key={index}
          style={[
            styles.commentCard,
            {
              position: 'absolute' as const,
              top: comment.top,
              left: comment.left,
              maxWidth: comment.maxWidth,
              opacity: commentAnims[index],
              transform: [
                {
                  translateX: commentAnims[index].interpolate({
                    inputRange: [0, 1],
                    outputRange: [comment.fromX, 0],
                  }),
                },
                {
                  translateY: commentAnims[index].interpolate({
                    inputRange: [0, 1],
                    outputRange: [comment.fromY, 0],
                  }),
                },
                { rotate: `${comment.rotate}deg` },
                {
                  scale: commentAnims[index].interpolate({
                    inputRange: [0, 0.5, 1],
                    outputRange: [0.8, 1.05, 1],
                  }),
                },
              ],
            },
          ]}
        >
          <View style={styles.commentHeader}>
            <View style={[styles.avatar, { backgroundColor: AVATAR_COLORS[index % AVATAR_COLORS.length] }]} />
            <Text style={styles.username}>@{comment.user}</Text>
          </View>
          <Text style={styles.commentText}>{comment.text}</Text>
        </Animated.View>
      ))}

      {/* Headline - centered on screen */}
      <Animated.View
        style={[
          styles.headlineContainer,
          {
            opacity: headlineAnim,
            transform: [
              {
                scale: headlineAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.9, 1],
                }),
              },
            ],
          },
        ]}
      >
        <Text style={styles.headline}>Join 10,000+{'\n'}winning players</Text>
      </Animated.View>

      {/* Closer - appears after comments */}
      <Animated.View
        style={[
          styles.closerContainer,
          {
            opacity: closerAnim,
            transform: [
              {
                translateY: closerAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [20, 0],
                }),
              },
            ],
          },
        ]}
      >
        <Text style={styles.closer}>Your breakthrough{'\n'}starts right now.</Text>
      </Animated.View>

      {/* Continue Button */}
      <Animated.View
        style={[
          styles.buttonContainer,
          {
            opacity: buttonAnim,
            transform: [
              {
                translateY: buttonAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [20, 0],
                }),
              },
            ],
          },
        ]}
      >
        <TouchableOpacity
          style={styles.continueButton}
          onPress={handleContinue}
          activeOpacity={0.85}
        >
          <Text style={styles.continueButtonText}>Continue</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  } as ViewStyle,
  heroContainer: {
    position: 'absolute',
    top: -120,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
  } as ViewStyle,
  heroImage: {
    width: '100%',
    height: '100%',
  } as ImageStyle,
  commentCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(232, 184, 74, 0.3)',
    shadowColor: '#E8B84A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  } as ViewStyle,
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 3,
  } as ViewStyle,
  avatar: {
    width: 14,
    height: 14,
    borderRadius: 7,
  } as ViewStyle,
  username: {
    fontSize: 11,
    color: 'rgba(0,0,0,0.45)',
    fontWeight: '600',
  } as TextStyle,
  commentText: {
    fontSize: 13,
    color: '#000000',
    lineHeight: 18,
    fontWeight: '500',
  } as TextStyle,
  headlineContainer: {
    position: 'absolute',
    top: SH * 0.36,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 10,
  } as ViewStyle,
  headline: {
    fontSize: 34,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 42,
    textShadowColor: 'rgba(0,0,0,0.9)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 16,
  } as TextStyle,
  closerContainer: {
    position: 'absolute',
    bottom: 120,
    left: 24,
    right: 24,
    alignItems: 'center',
    zIndex: 10,
  } as ViewStyle,
  closer: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.onboarding.gold,
    textAlign: 'center',
    lineHeight: 28,
    textShadowColor: 'rgba(232, 184, 74, 0.6)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 12,
  } as TextStyle,
  buttonContainer: {
    position: 'absolute',
    bottom: 50,
    left: 24,
    right: 24,
    zIndex: 10,
  } as ViewStyle,
  continueButton: {
    backgroundColor: colors.onboarding.gold,
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: 'center',
  } as ViewStyle,
  continueButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#000',
  } as TextStyle,
});

export default HeroScreen;
