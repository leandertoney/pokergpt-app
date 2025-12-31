import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, type ViewStyle, type TextStyle } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import type { AnalysisResult } from '@/types/poker';
import { colors } from '@/constants/colors';

interface MiniResultCardProps {
  analysis: AnalysisResult;
  onPress: () => void;
}

export function MiniResultCard({ analysis, onPress }: MiniResultCardProps) {
  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.header}>
        <Text style={styles.title}>Analysis Ready</Text>
        <View style={styles.confidenceBadge}>
          <Text style={styles.confidenceText}>{analysis.confidence}% confident</Text>
        </View>
      </View>
      
      <Text style={styles.recommendation} numberOfLines={2}>
        {analysis.recommendedAction}
      </Text>
      
      <View style={styles.footer}>
        <Text style={styles.viewMore}>View Full Breakdown</Text>
        <ChevronRight size={16} color={colors.accent.primary} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background.secondary,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.accent.primary,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 8,
  } as ViewStyle,
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  } as ViewStyle,
  title: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: colors.accent.primary,
  } as TextStyle,
  confidenceBadge: {
    backgroundColor: colors.background.tertiary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  } as ViewStyle,
  confidenceText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: colors.text.primary,
  } as TextStyle,
  recommendation: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.text.primary,
    marginBottom: 12,
  } as TextStyle,
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  } as ViewStyle,
  viewMore: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: colors.accent.primary,
  } as TextStyle,
});
