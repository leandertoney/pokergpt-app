import React, { useEffect } from 'react';
import { View, StyleSheet, type ViewStyle } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';

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

const sources: Record<1 | 2 | 3 | 4, string> = {
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
  const dimension = sizeMap[size];

  const player = useVideoPlayer(sources[variant], (player) => {
    player.loop = loop;
    player.muted = true;
    player.play();
  });

  useEffect(() => {
    if (!onFinish) return;

    const subscription = player.addListener('playToEnd', () => {
      if (!loop) {
        onFinish();
      }
    });

    return () => subscription.remove();
  }, [player, loop, onFinish]);

  return (
    <View style={[styles.container, { width: dimension, height: dimension }, style]}>
      <VideoView
        player={player}
        style={styles.video}
        contentFit="contain"
        nativeControls={false}
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
