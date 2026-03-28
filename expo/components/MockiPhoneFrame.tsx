import React from 'react';
import { View, StyleSheet, type ViewStyle } from 'react-native';

type MockiPhoneFrameProps = {
  width: number;
  children: React.ReactNode;
  style?: ViewStyle;
};

const ASPECT_RATIO = 2796 / 1290; // iPhone 14 Pro / 15 Pro
const CORNER_RATIO = 55 / 393; // Device corner radius relative to width

export function MockiPhoneFrame({ width, children, style }: MockiPhoneFrameProps) {
  const height = width * ASPECT_RATIO;
  const cornerRadius = width * CORNER_RATIO;
  const bezelWidth = 3;
  const dynamicIslandWidth = width * 0.28;
  const dynamicIslandHeight = width * 0.085;

  return (
    <View style={[styles.frame, { width, height, borderRadius: cornerRadius, borderWidth: bezelWidth }, style]}>
      {/* Dynamic Island */}
      <View style={styles.dynamicIslandContainer}>
        <View
          style={[
            styles.dynamicIsland,
            {
              width: dynamicIslandWidth,
              height: dynamicIslandHeight,
              borderRadius: dynamicIslandHeight / 2,
            },
          ]}
        />
      </View>

      {/* Content */}
      <View style={[styles.screen, { borderRadius: cornerRadius - bezelWidth }]}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    borderColor: 'rgba(255, 255, 255, 0.25)',
    backgroundColor: '#000',
    overflow: 'hidden',
  } as ViewStyle,
  dynamicIslandContainer: {
    position: 'absolute',
    top: 10,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 10,
  } as ViewStyle,
  dynamicIsland: {
    backgroundColor: '#000',
  } as ViewStyle,
  screen: {
    flex: 1,
    overflow: 'hidden',
  } as ViewStyle,
});

export default MockiPhoneFrame;
