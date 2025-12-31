import React, { useState, useRef } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Animated, type ViewStyle, type TextStyle } from 'react-native';
import { ChevronDown, ChevronUp, TrendingUp, Target, Users, Lightbulb } from 'lucide-react-native';
import type { AnalysisResult, HandData, AlternativeAction } from '@/types/poker';
import { colors } from '@/constants/colors';

interface FullResultCardProps {
  analysis: AnalysisResult;
  handData: HandData;
}

interface ExpandableSectionProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultExpanded?: boolean;
}

function ExpandableSection({ title, icon, children, defaultExpanded = false }: ExpandableSectionProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const animValue = useRef(new Animated.Value(defaultExpanded ? 1 : 0)).current;

  const toggleExpand = () => {
    Animated.timing(animValue, {
      toValue: expanded ? 0 : 1,
      duration: 200,
      useNativeDriver: false,
    }).start();
    setExpanded(!expanded);
  };

  const maxHeight = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 500],
  });

  const rotateZ = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  return (
    <View style={styles.expandableContainer}>
      <TouchableOpacity style={styles.expandableHeader} onPress={toggleExpand} activeOpacity={0.7}>
        <View style={styles.expandableHeaderLeft}>
          {icon}
          <Text style={styles.expandableTitle}>{title}</Text>
        </View>
        <Animated.View style={{ transform: [{ rotateZ }] }}>
          <ChevronDown size={20} color={colors.text.muted} />
        </Animated.View>
      </TouchableOpacity>
      <Animated.View style={[styles.expandableContent, { maxHeight, overflow: 'hidden' }]}>
        {children}
      </Animated.View>
    </View>
  );
}

export function FullResultCard({ analysis, handData }: FullResultCardProps) {
  // Helper function to safely get values with fallbacks
  const getConfidence = () => analysis?.confidence ?? 0;
  const getRecommendation = () => analysis?.recommendedAction || 'Analyzing...';
  const getReasoning = () => analysis?.reasoning || analysis?.hybridLine || '';

  // Calculate risk color
  const getRiskColor = () => {
    const risk = analysis?.riskLevel || 'medium';
    switch (risk) {
      case 'low': return '#22C55E';
      case 'medium': return colors.accent.gold;
      case 'high': return colors.accent.primary;
      default: return colors.accent.gold;
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Main Recommendation */}
      <View style={styles.mainRecommendation}>
        <Text style={styles.recommendationLabel}>RECOMMENDED ACTION</Text>
        <Text style={styles.recommendationText}>{getRecommendation()}</Text>

        {/* Confidence Bar */}
        <View style={styles.confidenceContainer}>
          <View style={styles.confidenceBarBg}>
            <View style={[styles.confidenceBar, { width: `${getConfidence()}%` }]} />
          </View>
          <Text style={styles.confidenceValue}>{getConfidence()}%</Text>
        </View>
      </View>

      {/* Quick Stats */}
      <View style={styles.statsRow}>
        {analysis?.equity !== undefined && (
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Equity</Text>
            <Text style={styles.statValue}>{analysis.equity}%</Text>
          </View>
        )}
        {analysis?.potOdds !== undefined && (
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Pot Odds</Text>
            <Text style={styles.statValue}>{analysis.potOdds}:1</Text>
          </View>
        )}
        {analysis?.impliedOdds !== undefined && (
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Implied</Text>
            <Text style={styles.statValue}>{analysis.impliedOdds}:1</Text>
          </View>
        )}
        {analysis?.riskLevel && (
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Risk</Text>
            <Text style={[styles.statValue, { color: getRiskColor() }]}>
              {analysis.riskLevel.charAt(0).toUpperCase() + analysis.riskLevel.slice(1)}
            </Text>
          </View>
        )}
      </View>

      {/* Reasoning */}
      {getReasoning() && (
        <View style={styles.reasoningSection}>
          <Text style={styles.reasoningText}>{getReasoning()}</Text>
        </View>
      )}

      {/* Expandable Sections */}
      {analysis?.gtoLine && (
        <ExpandableSection
          title="GTO Analysis"
          icon={<Target size={18} color={colors.accent.primary} />}
        >
          <Text style={styles.expandedText}>{analysis.gtoLine}</Text>
        </ExpandableSection>
      )}

      {analysis?.exploitLine && (
        <ExpandableSection
          title="Exploitative Line"
          icon={<TrendingUp size={18} color={colors.accent.gold} />}
        >
          <Text style={styles.expandedText}>{analysis.exploitLine}</Text>
        </ExpandableSection>
      )}

      {analysis?.villainRange && (
        <ExpandableSection
          title="Villain Range"
          icon={<Users size={18} color={colors.accent.secondary} />}
        >
          <Text style={styles.expandedText}>{analysis.villainRange}</Text>
        </ExpandableSection>
      )}

      {analysis?.alternativeActions && analysis.alternativeActions.length > 0 && (
        <ExpandableSection
          title="Alternative Actions"
          icon={<Lightbulb size={18} color={colors.accent.gold} />}
        >
          {analysis.alternativeActions.map((alt, index) => (
            <View key={index} style={styles.altActionRow}>
              <View style={styles.altActionHeader}>
                <Text style={styles.altActionName}>{alt.action}</Text>
                {alt.ev !== undefined && (
                  <Text style={[styles.altActionEV, { color: alt.ev >= 0 ? '#22C55E' : colors.accent.primary }]}>
                    {alt.ev >= 0 ? '+' : ''}{alt.ev} EV
                  </Text>
                )}
              </View>
              <Text style={styles.altActionReasoning}>{alt.reasoning}</Text>
            </View>
          ))}
        </ExpandableSection>
      )}

      {/* Persona Analysis */}
      {analysis?.personaAnalysis?.narrative && (
        <View style={styles.narrativeSection}>
          <Text style={styles.narrativeTitle}>
            {analysis.personaAnalysis.tone === 'mariano' ? 'Mariano Says' : 'Coach Notes'}
          </Text>
          <Text style={styles.narrativeText}>{analysis.personaAnalysis.narrative}</Text>
        </View>
      )}

      {/* Hand Summary */}
      <View style={styles.handSummary}>
        <Text style={styles.handSummaryTitle}>Hand Summary</Text>
        <View style={styles.handDetails}>
          {handData?.heroHand && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Your Hand</Text>
              <Text style={styles.detailValue}>{handData.heroHand}</Text>
            </View>
          )}
          {handData?.heroPosition && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Position</Text>
              <Text style={styles.detailValue}>
                {handData.heroPosition}
                {handData.villainPosition ? ` vs ${handData.villainPosition}` : ''}
              </Text>
            </View>
          )}
          {handData?.potSize && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Pot Size</Text>
              <Text style={styles.detailValue}>${handData.potSize}</Text>
            </View>
          )}
          {(handData?.effectiveStack || handData?.heroStack) && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Effective Stack</Text>
              <Text style={styles.detailValue}>${handData.effectiveStack || handData.heroStack}</Text>
            </View>
          )}
          {handData?.flop && handData.flop.length > 0 && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Board</Text>
              <Text style={styles.detailValue}>
                {[...(handData.flop || []), handData.turn, handData.river].filter(Boolean).join(' ')}
              </Text>
            </View>
          )}
          {handData?.action && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Action</Text>
              <Text style={styles.detailValue}>{handData.action}</Text>
            </View>
          )}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  } as ViewStyle,
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  } as ViewStyle,
  mainRecommendation: {
    marginBottom: 20,
  } as ViewStyle,
  recommendationLabel: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: colors.text.muted,
    letterSpacing: 1,
    marginBottom: 8,
  } as TextStyle,
  recommendationText: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: colors.text.primary,
    marginBottom: 16,
  } as TextStyle,
  confidenceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  } as ViewStyle,
  confidenceBarBg: {
    flex: 1,
    height: 8,
    backgroundColor: colors.background.tertiary,
    borderRadius: 4,
  } as ViewStyle,
  confidenceBar: {
    height: 8,
    backgroundColor: colors.accent.primary,
    borderRadius: 4,
  } as ViewStyle,
  confidenceValue: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: colors.accent.primary,
    minWidth: 50,
  } as TextStyle,
  statsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  } as ViewStyle,
  statBox: {
    flex: 1,
    backgroundColor: colors.background.secondary,
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
  } as ViewStyle,
  statLabel: {
    fontSize: 11,
    color: colors.text.muted,
    marginBottom: 4,
    textTransform: 'uppercase',
  } as TextStyle,
  statValue: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: colors.text.primary,
  } as TextStyle,
  reasoningSection: {
    backgroundColor: colors.background.secondary,
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  } as ViewStyle,
  reasoningText: {
    fontSize: 16,
    lineHeight: 24,
    color: colors.text.secondary,
  } as TextStyle,
  expandableContainer: {
    backgroundColor: colors.background.secondary,
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
  } as ViewStyle,
  expandableHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  } as ViewStyle,
  expandableHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  } as ViewStyle,
  expandableTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: colors.text.primary,
  } as TextStyle,
  expandableContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  } as ViewStyle,
  expandedText: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.text.secondary,
  } as TextStyle,
  altActionRow: {
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.background.tertiary,
  } as ViewStyle,
  altActionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  } as ViewStyle,
  altActionName: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: colors.text.primary,
  } as TextStyle,
  altActionEV: {
    fontSize: 14,
    fontWeight: '600' as const,
  } as TextStyle,
  altActionReasoning: {
    fontSize: 14,
    color: colors.text.muted,
    lineHeight: 20,
  } as TextStyle,
  narrativeSection: {
    backgroundColor: colors.background.secondary,
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: colors.accent.primary,
    marginBottom: 20,
  } as ViewStyle,
  narrativeTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: colors.accent.primary,
    marginBottom: 8,
  } as TextStyle,
  narrativeText: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.text.primary,
    fontStyle: 'italic' as const,
  } as TextStyle,
  handSummary: {
    backgroundColor: colors.background.secondary,
    borderRadius: 12,
    padding: 16,
  } as ViewStyle,
  handSummaryTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: colors.text.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  } as TextStyle,
  handDetails: {} as ViewStyle,
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.background.tertiary,
  } as ViewStyle,
  detailLabel: {
    fontSize: 14,
    color: colors.text.muted,
  } as TextStyle,
  detailValue: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: colors.text.primary,
  } as TextStyle,
});
