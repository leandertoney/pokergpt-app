import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import { ChevronRight, Brain, Target, Calculator, Eye } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { colors } from '@/constants/colors';

type LearningProgressScreenProps = {
  onNext: () => void;
};

const SKILLS = [
  { name: 'Pot Odds', icon: Calculator, target: 82, color: colors.onboarding.data },
  { name: 'Position Play', icon: Target, target: 65, color: colors.onboarding.data },
  { name: 'Bet Sizing', icon: Calculator, target: 54, color: colors.onboarding.data },
  { name: 'Hand Reading', icon: Eye, target: 41, color: colors.onboarding.dataLight },
];

export function LearningProgressScreen({ onNext }: LearningProgressScreenProps) {
  const [skillProgress, setSkillProgress] = useState(SKILLS.map(() => 0));

  const headlineAnim = useRef(new Animated.Value(0)).current;
  const skillAnims = useRef(SKILLS.map(() => new Animated.Value(0))).current;
  const footerAnim = useRef(new Animated.Value(0)).current;
  const buttonAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Headline entrance
    Animated.spring(headlineAnim, {
      toValue: 1,
      tension: 50,
      friction: 8,
      useNativeDriver: true,
    }).start();

    // Staggered skill bars
    skillAnims.forEach((anim, index) => {
      setTimeout(() => {
        Animated.spring(anim, {
          toValue: 1,
          tension: 50,
          friction: 8,
          useNativeDriver: true,
        }).start();

        // Animate the progress bar fill
        animateSkillBar(index);
      }, 300 + index * 150);
    });

    // Footer
    setTimeout(() => {
      Animated.timing(footerAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }, 1200);

    // Button
    setTimeout(() => {
      Animated.spring(buttonAnim, {
        toValue: 1,
        tension: 60,
        friction: 8,
        useNativeDriver: true,
      }).start();
    }, 1400);
  }, []);

  const animateSkillBar = (index: number) => {
    const duration = 1000;
    const startTime = Date.now();
    const target = SKILLS[index].target;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Easing
      const eased = 1 - Math.pow(1 - progress, 3);

      setSkillProgress(prev => {
        const newProgress = [...prev];
        newProgress[index] = Math.round(target * eased);
        return newProgress;
      });

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else if (index === SKILLS.length - 1) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    };

    animate();
  };

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onNext();
  };

  return (
    <View style={styles.container}>
      {/* Headline */}
      <Animated.View
        style={{
          opacity: headlineAnim,
          transform: [
            {
              translateY: headlineAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [30, 0],
              }),
            },
          ],
        }}
      >
        <View style={styles.iconHeader}>
          <Brain size={28} color={colors.onboarding.gold} />
        </View>
        <Text style={styles.headline}>Level up your game</Text>
        <Text style={styles.subheadline}>Track what you're learning</Text>
      </Animated.View>

      {/* Skills List */}
      <View style={styles.skillsContainer}>
        {SKILLS.map((skill, index) => {
          const IconComponent = skill.icon;
          return (
            <Animated.View
              key={skill.name}
              style={[
                styles.skillRow,
                {
                  opacity: skillAnims[index],
                  transform: [
                    {
                      translateX: skillAnims[index].interpolate({
                        inputRange: [0, 1],
                        outputRange: [-30, 0],
                      }),
                    },
                  ],
                },
              ]}
            >
              <View style={styles.skillHeader}>
                <View style={[styles.skillIcon, { backgroundColor: `${skill.color}20` }]}>
                  <IconComponent size={16} color={skill.color} />
                </View>
                <Text style={styles.skillName}>{skill.name}</Text>
                <Text style={[styles.skillPercent, { color: skill.color }]}>
                  {skillProgress[index]}%
                </Text>
              </View>
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${skillProgress[index]}%`,
                      backgroundColor: skill.color,
                    },
                  ]}
                />
              </View>
            </Animated.View>
          );
        })}
      </View>

      {/* Footer */}
      <Animated.Text
        style={[
          styles.footerText,
          {
            opacity: footerAnim,
          },
        ]}
      >
        You're improving every day.
      </Animated.Text>

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
          style={styles.button}
          onPress={handlePress}
          activeOpacity={0.8}
        >
          <Text style={styles.buttonText}>Quick question</Text>
          <ChevronRight size={20} color="#000" />
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  } as ViewStyle,
  iconHeader: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 20,
  } as ViewStyle,
  headline: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
    lineHeight: 36,
  } as TextStyle,
  subheadline: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    marginTop: 8,
  } as TextStyle,
  skillsContainer: {
    width: '100%',
    marginTop: 40,
    gap: 20,
  } as ViewStyle,
  skillRow: {
    width: '100%',
  } as ViewStyle,
  skillHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  } as ViewStyle,
  skillIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  } as ViewStyle,
  skillName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  } as TextStyle,
  skillPercent: {
    fontSize: 16,
    fontWeight: '700',
  } as TextStyle,
  progressBar: {
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 4,
    overflow: 'hidden',
  } as ViewStyle,
  progressFill: {
    height: '100%',
    borderRadius: 4,
  } as ViewStyle,
  footerText: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    marginTop: 32,
  } as TextStyle,
  buttonContainer: {
    position: 'absolute',
    bottom: 60,
    left: 24,
    right: 24,
  } as ViewStyle,
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent.primary,
    paddingVertical: 18,
    paddingHorizontal: 32,
    borderRadius: 14,
    gap: 8,
  } as ViewStyle,
  buttonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
  } as TextStyle,
});

export default LearningProgressScreen;
