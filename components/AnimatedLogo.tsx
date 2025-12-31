import React, { useRef, useEffect } from 'react';
import { View, StyleSheet, type ViewStyle } from 'react-native';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import { colors } from '@/constants/colors';

interface AnimatedLogoProps {
  variant: 1 | 2 | 3 | 4;
  size?: 'small' | 'medium' | 'large';
  loop?: boolean;
  onFinish?: () => void;
  style?: ViewStyle;
}

const sizeMap = {
  small: 80,
  medium: 150,
  large: 250,
};

const sources = {
  1: require('@/assets/videos/pokergpt_animation_1.mp4'),
  2: require('@/assets/videos/pokergpt_animation_2.mp4'),
  3: require('@/assets/videos/pokergpt_animation_3.mp4'),
  4: require('@/assets/videos/pokergpt_animation_4.mp4'),
};

export function AnimatedLogo({ 
  variant, 
  size = 'medium', 
  loop = false, 
  onFinish,
  style,
}: AnimatedLogoProps) {
  const videoRef = useRef<Video>(null);
  const dimension = sizeMap[size];

  const handlePlaybackStatusUpdate = (status: AVPlaybackStatus) => {
    if (status.isLoaded && status.didJustFinish && !loop && onFinish) {
      onFinish();
    }
  };

  useEffect(() => {
    // Ensure video plays when component mounts
    if (videoRef.current) {
      videoRef.current.playAsync();
    }
  }, []);

  return (
    <View style={[styles.container, { width: dimension, height: dimension }, style]}>
      <Video
        ref={videoRef}
        source={sources[variant]}
        style={styles.video}
        resizeMode={ResizeMode.CONTAIN}
        shouldPlay
        isLooping={loop}
        isMuted
        onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  } as ViewStyle,
  video: {
    width: '100%',
    height: '100%',
  },
});

export default AnimatedLogo;
