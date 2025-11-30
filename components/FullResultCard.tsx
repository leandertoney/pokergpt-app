import React from 'react';
import { View, Text, ScrollView, StyleSheet, type ViewStyle, type TextStyle } from 'react-native';
import type { AnalysisResult, HandData } from '@/types/poker';

interface FullResultCardProps {
  analysis: AnalysisResult;
  handData: HandData;
}

export function FullResultCard({ analysis, handData }: FullResultCardProps) {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.confidenceHeader}>
        <Text style={styles.confidenceLabel}>Confidence</Text>
        <View style={[styles.confidenceBar, { width: `${analysis.confidence}%` }]} />
        <Text style={styles.confidenceValue}>{analysis.confidence}%</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recommended Action</Text>
        <Text style={styles.recommendation}>{analysis.recommendedAction}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>GTO Line</Text>
        <Text style={styles.bodyText}>{analysis.gtoLine}</Text>
      </View>

      {analysis.exploitLine && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Exploitative Line</Text>
          <Text style={styles.bodyText}>{analysis.exploitLine}</Text>
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Hybrid Approach</Text>
        <Text style={styles.bodyText}>{analysis.hybridLine}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Villain Range</Text>
        <Text style={styles.bodyText}>{analysis.villainRange}</Text>
      </View>

      {analysis.personaAnalysis.narrative && (
        <View style={[styles.section, styles.narrativeSection]}>
          <Text style={styles.sectionTitle}>
            {analysis.personaAnalysis.tone === 'mariano' ? '🎬 Mariano Style' : '🎓 Mentor Insight'}
          </Text>
          <Text style={styles.narrativeText}>{analysis.personaAnalysis.narrative}</Text>
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Hand Details</Text>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Your Hand:</Text>
          <Text style={styles.detailValue}>{handData.heroHand}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Position:</Text>
          <Text style={styles.detailValue}>{handData.heroPosition}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Stack:</Text>
          <Text style={styles.detailValue}>${handData.heroStack}</Text>
        </View>
        {handData.villainPosition && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Villain Position:</Text>
            <Text style={styles.detailValue}>{handData.villainPosition}</Text>
          </View>
        )}
        {handData.flop && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Board:</Text>
            <Text style={styles.detailValue}>{handData.flop.join(' ')}</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  } as ViewStyle,
  contentContainer: {
    padding: 20,
  } as ViewStyle,
  confidenceHeader: {
    marginBottom: 24,
  } as ViewStyle,
  confidenceLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#999',
    marginBottom: 8,
  } as TextStyle,
  confidenceBar: {
    height: 8,
    backgroundColor: '#D4AF37',
    borderRadius: 4,
    marginBottom: 8,
  } as ViewStyle,
  confidenceValue: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: '#D4AF37',
  } as TextStyle,
  section: {
    marginBottom: 24,
  } as ViewStyle,
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#D4AF37',
    marginBottom: 12,
  } as TextStyle,
  recommendation: {
    fontSize: 20,
    fontWeight: '600' as const,
    color: '#FFFFFF',
    lineHeight: 28,
  } as TextStyle,
  bodyText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#CCCCCC',
  } as TextStyle,
  narrativeSection: {
    backgroundColor: '#1A1A1A',
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#D4AF37',
  } as ViewStyle,
  narrativeText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#FFF',
    fontStyle: 'italic' as const,
  } as TextStyle,
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  } as ViewStyle,
  detailLabel: {
    fontSize: 14,
    color: '#999',
  } as TextStyle,
  detailValue: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#FFF',
  } as TextStyle,
});
