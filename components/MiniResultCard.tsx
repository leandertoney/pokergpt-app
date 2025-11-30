import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, type ViewStyle, type TextStyle } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import type { AnalysisResult } from '@/types/poker';

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
        <ChevronRight size={16} color="#D4AF37" />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#D4AF37',
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
    color: '#D4AF37',
  } as TextStyle,
  confidenceBadge: {
    backgroundColor: '#2A2A2A',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  } as ViewStyle,
  confidenceText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#FFF',
  } as TextStyle,
  recommendation: {
    fontSize: 15,
    lineHeight: 22,
    color: '#FFF',
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
    color: '#D4AF37',
  } as TextStyle,
});
