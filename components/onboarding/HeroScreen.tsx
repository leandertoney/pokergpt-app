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

const HERO_IMAGE_URL = 'https://bollujxjsgahswigmyvq.supabase.co/storage/v1/object/public/assets/onboarding/pocket_aces.png?v=2';

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
  { text: "Lost 3 buy-ins chasing one hand 🤦", user: "tilted_tom", top: SH * 0.12, left: SW * 0.03, rotate: -3, fromX: -500, fromY: -80, delay: 500, maxWidth: SW * 0.48 },
  { text: "I play great then punt it all", user: "grinder99", top: SH * 0.10, left: SW * 0.50, rotate: 2.5, fromX: 500, fromY: -40, delay: 650, maxWidth: SW * 0.46 },
  { text: "Tilt costs me more than bad cards", user: "pokerlife22", top: SH * 0.23, left: SW * 0.05, rotate: -1.5, fromX: -500, fromY: 0, delay: 800, maxWidth: SW * 0.50 },
  { text: "Know the math. Still can't fold.", user: "cant_fold_AK", top: SH * 0.26, left: SW * 0.48, rotate: 3, fromX: 500, fromY: 0, delay: 950, maxWidth: SW * 0.48 },
  // Lower rows (below headline)
  { text: "Up $500, down $800. Every weekend.", user: "weekend_rec", top: SH * 0.50, left: SW * 0.04, rotate: -2, fromX: -500, fromY: 40, delay: 1100, maxWidth: SW * 0.52 },
  { text: "Study for hours, nothing sticks", user: "eternal_fish", top: SH * 0.53, left: SW * 0.50, rotate: 1.5, fromX: 500, fromY: 0, delay: 1250, maxWidth: SW * 0.46 },
  { text: "Why do I keep calling river raises??", user: "call_station", top: SH * 0.63, left: SW * 0.03, rotate: -2.5, fromX: -500, fromY: 80, delay: 1400, maxWidth: SW * 0.50 },
  { text: "One bad beat and my session is over", user: "steamer_steve", top: SH * 0.65, left: SW * 0.46, rotate: 2, fromX: 500, fromY: 40, delay: 1550, maxWidth: SW * 0.50 },
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
          source={{ uri: HERO_IMAGE_URL }}
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
        <Text style={styles.headline}>Every session,{'\n'}same story.</Text>
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
        <Text style={styles.closer}>You're not the problem.{'\n'}Your process is.</Text>
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
    backgroundColor: 'rgba(20, 20, 30, 0.88)',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
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
    color: 'rgba(255,255,255,0.35)',
    fontWeight: '600',
  } as TextStyle,
  commentText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.85)',
    lineHeight: 18,
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
    color: '#fff',
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
    fontSize: 18,
    fontWeight: '600',
    color: colors.onboarding.gold,
    textAlign: 'center',
    lineHeight: 26,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 10,
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
