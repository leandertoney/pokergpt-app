import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Image,
  ScrollView,
  type ViewStyle,
  type TextStyle,
  type ImageStyle,
} from 'react-native';
import { ChevronLeft } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { colors } from '@/constants/colors';
import { AnimatedLogo } from '@/components/AnimatedLogo';

type ChatDemoScreenProps = {
  onNext: () => void;
};

type DemoMessage = {
  role: 'user' | 'assistant';
  content: string;
};

const DEMO_MESSAGES: DemoMessage[] = [
  { role: 'user', content: "Should I have called that river bet with top pair?" },
  { role: 'assistant', content: "With top pair on a wet board, I'd lean towards a call. What was the bet sizing?" },
  { role: 'user', content: "He bet 2/3 pot" },
  { role: 'assistant', content: "Pot odds of ~2.5:1 means you need 28% equity. Top pair likely has that. ✓ Call was correct" },
  { role: 'user', content: "What about when I have a flush draw?" },
  { role: 'assistant', content: "Flush draws have ~35% equity on the flop. Consider stack sizes and implied odds." },
  { role: 'user', content: "And if the board pairs?" },
  { role: 'assistant', content: "Board pairing reduces flush value. Watch for full houses - sometimes check-calling is best." },
  { role: 'user', content: "This is exactly what I needed!" },
  { role: 'assistant', content: "Happy to help! Keep asking - the more context, the better my analysis." },
];

export function ChatDemoScreen({ onNext }: ChatDemoScreenProps) {
  const [visibleMessages, setVisibleMessages] = useState<number>(0);
  const [showTyping, setShowTyping] = useState(false);
  const [animationComplete, setAnimationComplete] = useState(false);

  const scrollViewRef = useRef<ScrollView>(null);
  const titleAnim = useRef(new Animated.Value(0)).current;
  const buttonAnim = useRef(new Animated.Value(0)).current;
  const messageAnims = useRef(DEMO_MESSAGES.map(() => new Animated.Value(0))).current;

  // Animated typing dots
  const dotAnim1 = useRef(new Animated.Value(0.3)).current;
  const dotAnim2 = useRef(new Animated.Value(0.3)).current;
  const dotAnim3 = useRef(new Animated.Value(0.3)).current;

  // Start dot animation when typing indicator shows
  useEffect(() => {
    if (showTyping) {
      const animateDots = () => {
        Animated.sequence([
          Animated.timing(dotAnim1, { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.timing(dotAnim2, { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.timing(dotAnim3, { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.parallel([
            Animated.timing(dotAnim1, { toValue: 0.3, duration: 200, useNativeDriver: true }),
            Animated.timing(dotAnim2, { toValue: 0.3, duration: 200, useNativeDriver: true }),
            Animated.timing(dotAnim3, { toValue: 0.3, duration: 200, useNativeDriver: true }),
          ]),
        ]).start(() => {
          if (showTyping) animateDots();
        });
      };
      animateDots();
    }
  }, [showTyping, dotAnim1, dotAnim2, dotAnim3]);

  useEffect(() => {
    const sequence = async () => {
      // Phase 1: Title entrance
      Animated.spring(titleAnim, {
        toValue: 1,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }).start();

      // Phase 2: Start messages
      await delay(600);

      for (let i = 0; i < DEMO_MESSAGES.length; i++) {
        const message = DEMO_MESSAGES[i];

        if (message.role === 'assistant') {
          // Show typing indicator before AI messages
          setShowTyping(true);
          await delay(500);
          setShowTyping(false);
        }

        // Show message with animation
        setVisibleMessages(i + 1);
        Animated.spring(messageAnims[i], {
          toValue: 1,
          tension: 60,
          friction: 8,
          useNativeDriver: true,
        }).start();

        // Auto-scroll to bottom
        setTimeout(() => {
          scrollViewRef.current?.scrollToEnd({ animated: true });
        }, 50);

        if (i === DEMO_MESSAGES.length - 1) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } else {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }

        await delay(message.role === 'user' ? 350 : 500);
      }

      // Phase 3: Swipe hint
      await delay(400);
      setAnimationComplete(true);
      Animated.loop(
        Animated.sequence([
          Animated.timing(buttonAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(buttonAnim, {
            toValue: 0.4,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    };

    sequence();
  }, []);

  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const handlePress = () => {
    if (animationComplete) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      onNext();
    }
  };

  const renderMessage = (message: DemoMessage, index: number) => {
    const isUser = message.role === 'user';
    // Slide in from left for assistant, right for user
    const slideDirection = isUser ? 50 : -50;

    return (
      <Animated.View
        key={index}
        style={[
          styles.messageRow,
          isUser ? styles.messageRowUser : styles.messageRowAssistant,
          {
            opacity: messageAnims[index],
            transform: [
              {
                translateX: messageAnims[index].interpolate({
                  inputRange: [0, 1],
                  outputRange: [slideDirection, 0],
                }),
              },
              {
                scale: messageAnims[index].interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.9, 1],
                }),
              },
            ],
          },
        ]}
      >
        {!isUser && (
          <View style={styles.avatarContainer}>
            <Image
              source={require('@/assets/images/pokergpt_logo.png')}
              style={styles.avatarImage}
              resizeMode="contain"
            />
          </View>
        )}
        <View
          style={[
            styles.messageBubble,
            isUser ? styles.userBubble : styles.assistantBubble,
          ]}
        >
          <Text style={[styles.messageText, isUser && styles.userText]}>
            {message.content}
          </Text>
        </View>
      </Animated.View>
    );
  };

  const renderTypingIndicator = () => (
    <View style={[styles.messageRow, styles.messageRowAssistant]}>
      <View style={styles.avatarContainer}>
        <Image
          source={require('@/assets/images/pokergpt_logo.png')}
          style={styles.avatarImage}
          resizeMode="contain"
        />
      </View>
      <View style={[styles.messageBubble, styles.assistantBubble, styles.typingBubble]}>
        <View style={styles.typingDots}>
          <Animated.View style={[styles.dot, { opacity: dotAnim1 }]} />
          <Animated.View style={[styles.dot, { opacity: dotAnim2 }]} />
          <Animated.View style={[styles.dot, { opacity: dotAnim3 }]} />
        </View>
      </View>
    </View>
  );

  return (
    <TouchableOpacity
      style={styles.container}
      activeOpacity={1}
      onPress={handlePress}
    >
      {/* Logo */}
      <Animated.View
        style={[
          styles.logoContainer,
          {
            opacity: titleAnim,
            transform: [
              {
                scale: titleAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.8, 1],
                }),
              },
            ],
          },
        ]}
      >
        <AnimatedLogo variant={1} size="small" loop />
      </Animated.View>

      {/* Title */}
      <Animated.Text
        style={[
          styles.title,
          {
            opacity: titleAnim,
            transform: [
              {
                translateY: titleAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-20, 0],
                }),
              },
            ],
          },
        ]}
      >
        Your pocket coach
      </Animated.Text>

      <Animated.Text
        style={[
          styles.subtitle,
          {
            opacity: titleAnim,
          },
        ]}
      >
        Ask any question, get expert analysis
      </Animated.Text>

      {/* Chat Messages - no container border */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.messagesContainer}
        contentContainerStyle={styles.messagesContent}
        showsVerticalScrollIndicator={false}
      >
        {DEMO_MESSAGES.slice(0, visibleMessages).map((message, index) =>
          renderMessage(message, index)
        )}
        {showTyping && renderTypingIndicator()}
      </ScrollView>

      {/* Swipe Hint */}
      <Animated.View
        style={[
          styles.swipeHint,
          {
            opacity: buttonAnim,
          },
        ]}
      >
        <ChevronLeft size={24} color="rgba(255,255,255,0.5)" />
        <Text style={styles.swipeText}>Swipe to continue</Text>
      </Animated.View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 50,
  } as ViewStyle,
  logoContainer: {
    marginBottom: 16,
  } as ViewStyle,
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 8,
  } as TextStyle,
  subtitle: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    marginBottom: 20,
  } as TextStyle,
  messagesContainer: {
    flex: 1,
    width: '100%',
  } as ViewStyle,
  messagesContent: {
    paddingVertical: 8,
    gap: 14,
  } as ViewStyle,
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  } as ViewStyle,
  messageRowUser: {
    justifyContent: 'flex-end',
  } as ViewStyle,
  messageRowAssistant: {
    justifyContent: 'flex-start',
  } as ViewStyle,
  avatarContainer: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  } as ViewStyle,
  avatarImage: {
    width: 32,
    height: 32,
    borderRadius: 8,
  } as ImageStyle,
  messageBubble: {
    maxWidth: '78%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
  } as ViewStyle,
  userBubble: {
    backgroundColor: colors.accent.gold,
    borderBottomRightRadius: 4,
  } as ViewStyle,
  assistantBubble: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderBottomLeftRadius: 4,
  } as ViewStyle,
  messageText: {
    fontSize: 14,
    color: colors.text.primary,
    lineHeight: 20,
  } as TextStyle,
  userText: {
    fontWeight: '500',
    color: colors.text.inverse,
  } as TextStyle,
  typingBubble: {
    paddingVertical: 12,
    paddingHorizontal: 18,
  } as ViewStyle,
  typingDots: {
    flexDirection: 'row',
    gap: 5,
  } as ViewStyle,
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.text.muted,
  } as ViewStyle,
  swipeHint: {
    position: 'absolute',
    bottom: 50,
    alignItems: 'center',
    alignSelf: 'center',
    gap: 4,
  } as ViewStyle,
  swipeText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '500',
  } as TextStyle,
});

export default ChatDemoScreen;
