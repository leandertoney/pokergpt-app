import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Image,
  type ViewStyle,
  type TextStyle,
  type ImageStyle,
  type ImageSourcePropType,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { colors } from '@/constants/colors';

const HERO_IMAGE = require('../../assets/images/onboarding/identity_screen.jpg');

type ReferralScreenProps = {
  onComplete: (source: string) => void;
};

type Option = {
  label: string;
  value: string;
  // Bundled asset module from require(), not a remote URL — see REFERRAL_ICONS.
  icon: ImageSourcePropType;
};

const REFERRAL_ICONS = {
  tiktok: require('../../assets/images/onboarding/referral/tiktok.png'),
  instagram: require('../../assets/images/onboarding/referral/instagram.png'),
  youtube: require('../../assets/images/onboarding/referral/youtube.png'),
  x: require('../../assets/images/onboarding/referral/x.png'),
  appstore: require('../../assets/images/onboarding/referral/appstore.png'),
  friend: require('../../assets/images/onboarding/referral/friend.png'),
};

const OPTIONS: Option[] = [
  { label: 'TikTok', value: 'tiktok', icon: REFERRAL_ICONS.tiktok },
  { label: 'Instagram', value: 'instagram', icon: REFERRAL_ICONS.instagram },
  { label: 'YouTube', value: 'youtube', icon: REFERRAL_ICONS.youtube },
  { label: 'X', value: 'x', icon: REFERRAL_ICONS.x },
  { label: 'App Store', value: 'app_store', icon: REFERRAL_ICONS.appstore },
  { label: 'A Friend', value: 'friend', icon: REFERRAL_ICONS.friend },
];

export function ReferralScreen({ onComplete }: ReferralScreenProps) {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);

  const headlineAnim = useRef(new Animated.Value(0)).current;
  const itemAnims = useRef(OPTIONS.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    animateIn();
  }, []);

  const animateIn = () => {
    headlineAnim.setValue(0);
    itemAnims.forEach(anim => anim.setValue(0));

    Animated.spring(headlineAnim, {
      toValue: 1,
      tension: 50,
      friction: 8,
      useNativeDriver: true,
    }).start();

    itemAnims.forEach((anim, index) => {
      setTimeout(() => {
        Animated.spring(anim, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }).start();
      }, 150 + index * 70);
    });
  };

  const handleSelect = (value: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedOption(value);

    setTimeout(() => {
      onComplete(value);
    }, 350);
  };

  return (
    <View style={styles.container}>
      {/* Hero Image */}
      <View style={styles.heroContainer}>
        <Image
          source={HERO_IMAGE}
          style={styles.heroImage}
          resizeMode="cover"
        />
        <LinearGradient
          colors={['transparent', colors.background.primary]}
          style={styles.heroGradient}
        />
      </View>

      <View style={styles.content}>
        {/* Headline */}
        <Animated.View
          style={[
            styles.headlineContainer,
            {
              opacity: headlineAnim,
              transform: [
                {
                  translateY: headlineAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [30, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <Text style={styles.headline}>How did you hear about us?</Text>
          <Text style={styles.subheadline}>Just curious!</Text>
        </Animated.View>

        {/* Option List */}
        <View style={styles.optionsContainer}>
          {OPTIONS.map((option, index) => {
            const isSelected = selectedOption === option.value;
            return (
              <Animated.View
                key={option.value}
                style={{
                  opacity: itemAnims[index],
                  transform: [
                    {
                      translateY: itemAnims[index].interpolate({
                        inputRange: [0, 1],
                        outputRange: [20, 0],
                      }),
                    },
                  ],
                }}
              >
                <TouchableOpacity
                  style={[
                    styles.optionCard,
                    isSelected && styles.optionCardSelected,
                  ]}
                  onPress={() => handleSelect(option.value)}
                  activeOpacity={0.7}
                >
                  <Image
                    source={option.icon}
                    style={styles.iconImage}
                    resizeMode="contain"
                  />
                  <Text
                    style={[
                      styles.optionLabel,
                      isSelected && styles.optionLabelSelected,
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              </Animated.View>
            );
          })}
        </View>
      </View>
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
    height: '50%',
    overflow: 'hidden',
  } as ViewStyle,
  heroImage: {
    width: '100%',
    height: '100%',
  } as ImageStyle,
  heroGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '70%',
  } as ViewStyle,
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingTop: 60,
  } as ViewStyle,
  headlineContainer: {
    marginBottom: 28,
  } as ViewStyle,
  headline: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
    lineHeight: 36,
  } as TextStyle,
  subheadline: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 8,
  } as TextStyle,
  optionsContainer: {
    gap: 10,
  } as ViewStyle,
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.1)',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 14,
  } as ViewStyle,
  optionCardSelected: {
    backgroundColor: 'rgba(212, 168, 75, 0.12)',
    borderColor: colors.onboarding.gold,
  } as ViewStyle,
  iconImage: {
    width: 36,
    height: 36,
    borderRadius: 8,
  } as ImageStyle,
  optionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  } as TextStyle,
  optionLabelSelected: {
    color: colors.onboarding.gold,
  } as TextStyle,
});

export default ReferralScreen;
