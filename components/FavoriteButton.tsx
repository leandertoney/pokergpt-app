import React, { useRef, useEffect } from 'react';
import {
  TouchableOpacity,
  Animated,
  StyleSheet,
  type ViewStyle,
} from 'react-native';
import { Star } from 'lucide-react-native';
import { colors } from '@/constants/colors';

interface FavoriteButtonProps {
  isFavorite: boolean;
  onToggle: () => void;
  size?: number;
  style?: ViewStyle;
}

export function FavoriteButton({
  isFavorite,
  onToggle,
  size = 20,
  style,
}: FavoriteButtonProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  // Animate on favorite change
  useEffect(() => {
    if (isFavorite) {
      Animated.sequence([
        Animated.spring(scaleAnim, {
          toValue: 1.3,
          tension: 200,
          friction: 5,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isFavorite, scaleAnim]);

  const handlePress = () => {
    // Trigger bounce animation
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.8,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 200,
        friction: 5,
        useNativeDriver: true,
      }),
    ]).start();

    onToggle();
  };

  return (
    <TouchableOpacity
      style={[styles.container, style]}
      onPress={handlePress}
      activeOpacity={0.7}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
    >
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <Star
          size={size}
          color={isFavorite ? colors.accent.gold : colors.text.muted}
          fill={isFavorite ? colors.accent.gold : 'transparent'}
          strokeWidth={isFavorite ? 0 : 1.5}
        />
      </Animated.View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 4,
  } as ViewStyle,
});

export default FavoriteButton;
