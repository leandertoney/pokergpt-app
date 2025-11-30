import React, { useRef, useEffect, useState } from 'react';
import { View, FlatList, StyleSheet, ActivityIndicator, Text, TouchableOpacity, PanResponder, Animated, Dimensions, type ViewStyle, type TextStyle } from 'react-native';
import { Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Plus } from 'lucide-react-native';
import { usePokerFlow } from '@/hooks/usePokerFlow';
import { ChatBubble } from '@/components/ChatBubble';
import { InputBar } from '@/components/InputBar';
import { FullResultCard } from '@/components/FullResultCard';
import { Onboarding, checkOnboardingComplete } from '@/components/Onboarding';

const { height: screenHeight } = Dimensions.get('window');

export default function ChatScreen() {
  const { messages, sendMessage, isAnalyzing, isParsing, startNewHand } = usePokerFlow();
  const flatListRef = useRef<FlatList>(null);

  const insets = useSafeAreaInsets();
  const [selectedAnalysis, setSelectedAnalysis] = useState<{analysis: any, handData: any} | null>(null);
  const slideAnim = useRef(new Animated.Value(screenHeight)).current;
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isCheckingOnboarding, setIsCheckingOnboarding] = useState(true);

  useEffect(() => {
    async function checkOnboarding() {
      const complete = await checkOnboardingComplete();
      setShowOnboarding(!complete);
      setIsCheckingOnboarding(false);
    }
    checkOnboarding();
  }, []);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  const showAnalysisCard = (messageId: string) => {
    const message = messages.find(m => m.id === messageId);
    if (message?.analysis && message?.handData) {
      setSelectedAnalysis({ analysis: message.analysis, handData: message.handData });
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 50,
        friction: 9,
      }).start();
    }
  };

  const hideAnalysisCard = () => {
    Animated.spring(slideAnim, {
      toValue: screenHeight,
      useNativeDriver: true,
      tension: 50,
      friction: 9,
    }).start(() => {
      setSelectedAnalysis(null);
    });
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => Math.abs(gestureState.dy) > 5,
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          slideAnim.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 100) {
          hideAnalysisCard();
        } else {
          Animated.spring(slideAnim, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  if (isCheckingOnboarding) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#D4AF37" />
        </View>
      </View>
    );
  }

  if (showOnboarding) {
    return <Onboarding onComplete={() => setShowOnboarding(false)} />;
  }

  return (
    <View style={styles.container}>
      <Stack.Screen 
        options={{
          title: 'PokerGPT',
          headerStyle: {
            backgroundColor: '#000000',
          },
          headerTintColor: '#D4AF37',
          headerTitleStyle: {
            fontWeight: '600' as const,
            fontSize: 20,
            opacity: 0.9,
          },
          headerRight: () => (
            <TouchableOpacity onPress={startNewHand} style={styles.newHandButton}>
              <Plus size={24} color="#D4AF37" />
            </TouchableOpacity>
          ),
        }} 
      />

      <LinearGradient
        colors={['#3d1a1a', '#2d0f0f', '#1a0808', '#0f0303']}
        locations={[0, 0.3, 0.7, 1]}
        style={styles.gradient}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View>
              <ChatBubble message={item} />
              {item.analysis && (
                <TouchableOpacity
                  onPress={() => showAnalysisCard(item.id)}
                  style={styles.swipeHint}
                  activeOpacity={0.7}
                >
                  <View style={styles.swipeIndicator} />
                  <Text style={styles.swipeText}>Swipe up for full analysis</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
          contentContainerStyle={styles.messageList}
          ListFooterComponent={
            (isAnalyzing || isParsing) ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#D4AF37" />
                <Text style={styles.loadingText}>
                  {isAnalyzing ? 'Analyzing your hand...' : 'Processing...'}
                </Text>
              </View>
            ) : null
          }
        />
        
        <View style={{ paddingBottom: insets.bottom }}>
          <InputBar onSendMessage={sendMessage} disabled={isAnalyzing || isParsing} />
        </View>
      </LinearGradient>

      {selectedAnalysis && (
        <Animated.View
          style={[
            styles.analysisOverlay,
            {
              transform: [{ translateY: slideAnim }],
            },
          ]}
          {...panResponder.panHandlers}
        >
          <View style={styles.analysisHandle} />
          <FullResultCard analysis={selectedAnalysis.analysis} handData={selectedAnalysis.handData} />
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  } as ViewStyle,
  gradient: {
    flex: 1,
    position: 'relative' as const,
  } as ViewStyle,
  messageList: {
    paddingVertical: 16,
  } as ViewStyle,
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  } as ViewStyle,
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#999',
  } as TextStyle,
  newHandButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  } as ViewStyle,
  swipeHint: {
    alignItems: 'center',
    paddingVertical: 12,
    marginHorizontal: 16,
    marginTop: 8,
  } as ViewStyle,
  swipeIndicator: {
    width: 40,
    height: 4,
    backgroundColor: '#D4AF37',
    borderRadius: 2,
    marginBottom: 4,
    opacity: 0.6,
  } as ViewStyle,
  swipeText: {
    fontSize: 12,
    color: '#D4AF37',
    opacity: 0.6,
  } as TextStyle,
  analysisOverlay: {
    position: 'absolute' as const,
    bottom: 0,
    left: 0,
    right: 0,
    height: '90%',
    backgroundColor: '#000',
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
    width: 50,
    height: 5,
    backgroundColor: '#333',
    borderRadius: 3,
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 12,
  } as ViewStyle,
});
