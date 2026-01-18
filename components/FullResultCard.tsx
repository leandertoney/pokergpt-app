import React, { useState, useRef, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Animated, type ViewStyle, type TextStyle } from 'react-native';
import { ChevronDown, TrendingUp, Target, Users, Lightbulb, Calculator } from 'lucide-react-native';
import { PlayingCard } from '@/components/PlayingCard';
import type { AnalysisResult, HandData, ExperienceLevel } from '@/types/poker';
import { colors } from '@/constants/colors';
import { getUserIdentity } from '@/services/storageService';

// Parse card string into rank and suit
type Suit = 'h' | 'd' | 'c' | 's';
type ParsedCard = { rank: string; suit: Suit };

function parseCardString(cardStr: string): ParsedCard | null {
  if (!cardStr || cardStr.length < 2) return null;

  // Handle formats like "Th", "Ts", "T♠", "10h", etc.
  const suitMap: Record<string, Suit> = {
    'h': 'h', '♥': 'h', 'H': 'h',
    'd': 'd', '♦': 'd', 'D': 'd',
    'c': 'c', '♣': 'c', 'C': 'c',
    's': 's', '♠': 's', 'S': 's',
  };

  const normalized = cardStr.trim();
  const lastChar = normalized.slice(-1);
  const suit = suitMap[lastChar];

  if (!suit) return null;

  let rank = normalized.slice(0, -1).toUpperCase();
  // Handle 10 -> T
  if (rank === '10') rank = 'T';

  return { rank, suit };
}

function parseHeroHand(heroHand: string): ParsedCard[] {
  if (!heroHand) return [];

  // Handle formats: "TT", "Th Ts", "T♠ T♥", "ThTs", "pocket tens"
  const cards: ParsedCard[] = [];

  // Split by spaces or find card patterns
  const cardPattern = /([AKQJT2-9]|10)[hdcs♥♦♣♠]/gi;
  const matches = heroHand.match(cardPattern);

  if (matches) {
    for (const match of matches) {
      const parsed = parseCardString(match);
      if (parsed) cards.push(parsed);
    }
  }

  // Handle pocket pair format like "TT" (no suits)
  if (cards.length === 0 && heroHand.length === 2) {
    const rank = heroHand[0].toUpperCase();
    if (/[AKQJT2-9]/.test(rank)) {
      // Default to spades and hearts for pocket pairs
      cards.push({ rank, suit: 's' });
      cards.push({ rank, suit: 'h' });
    }
  }

  return cards;
}

function parseBoardCards(flop?: string[], turn?: string, river?: string): ParsedCard[] {
  const cards: ParsedCard[] = [];

  if (flop) {
    for (const card of flop) {
      const parsed = parseCardString(card);
      if (parsed) cards.push(parsed);
    }
  }

  if (turn) {
    const parsed = parseCardString(turn);
    if (parsed) cards.push(parsed);
  }

  if (river) {
    const parsed = parseCardString(river);
    if (parsed) cards.push(parsed);
  }

  return cards;
}

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

/**
 * MathEducationSection - Shows step-by-step poker math calculations
 * Auto-expands for beginners, collapsed for advanced players
 */
function MathEducationSection({
  analysis,
  handData,
  defaultExpanded,
}: {
  analysis: AnalysisResult;
  handData: HandData;
  defaultExpanded: boolean;
}) {
  // Only show if we have enough data to teach
  const hasOutsInfo = analysis.outs !== undefined && analysis.outs !== null && analysis.outs > 0;
  const hasEquityInfo = analysis.equity !== undefined && analysis.equity !== null;
  const hasPotOdds = analysis.potOdds !== undefined && analysis.potOdds !== null && analysis.potOdds > 0;

  // Show placeholder if no math data available
  if (!hasOutsInfo && !hasEquityInfo && !hasPotOdds) {
    return (
      <ExpandableSection
        title="Learn the Math"
        icon={<Calculator size={18} color={colors.accent.gold} />}
        defaultExpanded={false}
      >
        <View style={styles.mathPlaceholder}>
          <Text style={styles.mathPlaceholderText}>
            Math breakdown not available for this hand. For detailed calculations, provide pot size and bet amounts.
          </Text>
        </View>
      </ExpandableSection>
    );
  }

  // Calculate the equity needed based on pot odds
  const equityNeeded = hasPotOdds ? (100 / (analysis.potOdds! + 1)) : 0;
  const isProfitableCall = hasEquityInfo && hasPotOdds && analysis.equity! > equityNeeded;

  return (
    <ExpandableSection
      title="Learn the Math"
      icon={<Calculator size={18} color={colors.accent.gold} />}
      defaultExpanded={defaultExpanded}
    >
      {/* Outs counting */}
      {hasOutsInfo && (
        <View style={styles.mathBlock}>
          <Text style={styles.mathTitle}>COUNTING OUTS</Text>
          {analysis.outBreakdown ? (
            <Text style={styles.mathFormula}>{analysis.outBreakdown}</Text>
          ) : (
            <Text style={styles.mathFormula}>
              You have {analysis.outs} outs to improve your hand
            </Text>
          )}
        </View>
      )}

      {/* Equity calculation using Rule of 2/4 */}
      {hasOutsInfo && hasEquityInfo && (
        <View style={styles.mathBlock}>
          <Text style={styles.mathTitle}>EQUITY (Rule of 4)</Text>
          <Text style={styles.mathHint}>With 2 cards to come: Outs × 4</Text>
          <Text style={styles.mathFormula}>
            {analysis.outs} outs × 4 = ~{analysis.outs! * 4}%
          </Text>
          <Text style={styles.mathResult}>
            Actual equity: {analysis.equity}%
          </Text>
        </View>
      )}

      {/* Pot odds calculation */}
      {hasPotOdds && (
        <View style={styles.mathBlock}>
          <Text style={styles.mathTitle}>POT ODDS</Text>
          <Text style={styles.mathHint}>
            Pot odds tell you the minimum equity needed to call profitably
          </Text>
          <Text style={styles.mathFormula}>
            Getting {analysis.potOdds}:1 odds = need {equityNeeded.toFixed(0)}% equity
          </Text>
        </View>
      )}

      {/* Verdict - compare equity vs pot odds */}
      {hasEquityInfo && hasPotOdds && (
        <View style={styles.verdictBlock}>
          <Text style={[
            styles.verdict,
            { color: isProfitableCall ? '#22C55E' : colors.accent.primary }
          ]}>
            {analysis.equity}% equity {isProfitableCall ? '>' : '<'} {equityNeeded.toFixed(0)}% needed
          </Text>
          <Text style={[
            styles.verdictResult,
            { color: isProfitableCall ? '#22C55E' : colors.accent.primary }
          ]}>
            {isProfitableCall ? '✓ PROFITABLE CALL' : '✗ FOLD (not enough equity)'}
          </Text>
        </View>
      )}
    </ExpandableSection>
  );
}

export function FullResultCard({ analysis, handData }: FullResultCardProps) {
  // Track user experience level for progressive disclosure
  const [experienceLevel, setExperienceLevel] = useState<ExperienceLevel>('beginner');

  useEffect(() => {
    getUserIdentity().then(identity => {
      if (identity?.experienceLevel) {
        setExperienceLevel(identity.experienceLevel);
      }
    });
  }, []);

  // Auto-expand math section for beginners
  const showMathByDefault = experienceLevel === 'beginner';

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
      {/* Visual Hand Display */}
      <View style={styles.visualHandSection}>
        {/* Hero Cards */}
        <View style={styles.heroCardsRow}>
          {parseHeroHand(handData?.heroHand || '').map((card, idx) => (
            <PlayingCard
              key={`hero-${idx}`}
              rank={card.rank}
              suit={card.suit}
              size="large"
              animateIn
              delay={idx * 100}
            />
          ))}
          {parseHeroHand(handData?.heroHand || '').length === 0 && handData?.heroHand && (
            <View style={styles.fallbackHand}>
              <Text style={styles.fallbackHandText}>{handData.heroHand}</Text>
            </View>
          )}
        </View>

        {/* Position Badge */}
        {handData?.heroPosition && (
          <View style={styles.positionBadge}>
            <Text style={styles.positionText}>
              {handData.heroPosition}
              {handData.villainPosition ? ` vs ${handData.villainPosition}` : ''}
            </Text>
          </View>
        )}

        {/* Board Cards */}
        {handData?.flop && handData.flop.length > 0 && (
          <View style={styles.boardSection}>
            <Text style={styles.boardLabel}>BOARD</Text>
            <View style={styles.boardCardsRow}>
              {parseBoardCards(handData.flop, handData.turn, handData.river).map((card, idx) => (
                <PlayingCard
                  key={`board-${idx}`}
                  rank={card.rank}
                  suit={card.suit}
                  size="medium"
                  animateIn
                  delay={200 + idx * 80}
                />
              ))}
            </View>
          </View>
        )}

        {/* Quick Info Row - Pot & Stack */}
        <View style={styles.quickInfoRow}>
          {handData?.potSize !== undefined && handData?.potSize !== null && (
            <View style={styles.quickInfoItem}>
              <Text style={styles.quickInfoLabel}>POT</Text>
              <Text style={styles.quickInfoValue}>${handData.potSize}</Text>
            </View>
          )}
          {(handData?.effectiveStack !== undefined || handData?.heroStack !== undefined) && (
            <View style={styles.quickInfoItem}>
              <Text style={styles.quickInfoLabel}>STACK</Text>
              <Text style={styles.quickInfoValue}>${handData.effectiveStack ?? handData.heroStack}</Text>
            </View>
          )}
          {handData?.action && (
            <View style={[styles.quickInfoItem, styles.actionItem]}>
              <Text style={styles.quickInfoLabel}>ACTION</Text>
              <Text style={styles.actionText}>{handData.action}</Text>
            </View>
          )}
        </View>
      </View>

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
        {analysis?.equity !== undefined && analysis?.equity !== null && (
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Equity</Text>
            <Text style={styles.statValue}>{analysis.equity}%</Text>
          </View>
        )}
        {analysis?.potOdds !== undefined && analysis?.potOdds !== null && (
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Pot Odds</Text>
            <Text style={styles.statValue}>{analysis.potOdds}:1</Text>
          </View>
        )}
        {analysis?.impliedOdds !== undefined && analysis?.impliedOdds !== null && (
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

      {/* Math Education Section - between stats and reasoning */}
      <MathEducationSection
        analysis={analysis}
        handData={handData}
        defaultExpanded={showMathByDefault}
      />

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
          icon={<Target size={18} color={colors.accent.gold} />}
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
          icon={<Users size={18} color={colors.text.secondary} />}
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
  // Visual Hand Display Styles
  visualHandSection: {
    alignItems: 'center',
    marginBottom: 24,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.background.tertiary,
  } as ViewStyle,
  heroCardsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  } as ViewStyle,
  fallbackHand: {
    backgroundColor: colors.background.tertiary,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 12,
  } as ViewStyle,
  fallbackHandText: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: colors.text.primary,
  } as TextStyle,
  positionBadge: {
    backgroundColor: colors.accent.gold,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
    marginBottom: 16,
  } as ViewStyle,
  positionText: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: colors.text.inverse,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  } as TextStyle,
  boardSection: {
    alignItems: 'center',
    marginBottom: 16,
  } as ViewStyle,
  boardLabel: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: colors.text.muted,
    letterSpacing: 1,
    marginBottom: 8,
  } as TextStyle,
  boardCardsRow: {
    flexDirection: 'row',
    gap: 6,
  } as ViewStyle,
  quickInfoRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
  } as ViewStyle,
  quickInfoItem: {
    alignItems: 'center',
  } as ViewStyle,
  quickInfoLabel: {
    fontSize: 10,
    fontWeight: '600' as const,
    color: colors.text.muted,
    letterSpacing: 0.5,
    marginBottom: 2,
  } as TextStyle,
  quickInfoValue: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: colors.accent.gold,
  } as TextStyle,
  actionItem: {
    maxWidth: 120,
  } as ViewStyle,
  actionText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: colors.text.primary,
    textAlign: 'center',
  } as TextStyle,
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
    backgroundColor: colors.accent.gold,
    borderRadius: 4,
  } as ViewStyle,
  confidenceValue: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: colors.accent.gold,
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
  // Math Education Section Styles
  mathBlock: {
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.background.tertiary,
  } as ViewStyle,
  mathTitle: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: colors.accent.gold,
    letterSpacing: 1,
    marginBottom: 8,
  } as TextStyle,
  mathHint: {
    fontSize: 13,
    color: colors.text.muted,
    marginBottom: 4,
    fontStyle: 'italic' as const,
  } as TextStyle,
  mathFormula: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: colors.text.primary,
    fontFamily: 'monospace',
    marginBottom: 4,
  } as TextStyle,
  mathResult: {
    fontSize: 14,
    color: colors.text.secondary,
    marginTop: 4,
  } as TextStyle,
  verdictBlock: {
    backgroundColor: colors.background.tertiary,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center' as const,
  } as ViewStyle,
  verdict: {
    fontSize: 14,
    fontWeight: '600' as const,
    marginBottom: 4,
  } as TextStyle,
  verdictResult: {
    fontSize: 16,
    fontWeight: '700' as const,
  } as TextStyle,
  mathPlaceholder: {
    padding: 8,
  } as ViewStyle,
  mathPlaceholderText: {
    fontSize: 14,
    color: colors.text.muted,
    fontStyle: 'italic' as const,
    lineHeight: 20,
  } as TextStyle,
  narrativeSection: {
    backgroundColor: colors.background.secondary,
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: colors.accent.gold,
    marginBottom: 20,
  } as ViewStyle,
  narrativeTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: colors.accent.gold,
    marginBottom: 8,
  } as TextStyle,
  narrativeText: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.text.primary,
    fontStyle: 'italic' as const,
  } as TextStyle,
});
