import React, { useState, useRef, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Animated, type ViewStyle, type TextStyle } from 'react-native';
import { ChevronDown, TrendingUp, TrendingDown, Target, Users, Lightbulb, Calculator, Shield, Zap, Clock, MessageSquare } from 'lucide-react-native';
import { PlayingCard } from '@/components/PlayingCard';
import type { AnalysisResult, HandData, ExperienceLevel } from '@/types/poker';
import { colors } from '@/constants/colors';
import { getUserIdentity } from '@/services/storageService';

// Parse card string into rank and suit
type Suit = 'h' | 'd' | 'c' | 's';
type ParsedCard = { rank: string; suit: Suit };

function parseCardString(cardStr: string): ParsedCard | null {
  if (!cardStr || cardStr.length < 2) return null;

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
  if (rank === '10') rank = 'T';

  return { rank, suit };
}

function parseHeroHand(heroHand: string): ParsedCard[] {
  if (!heroHand) return [];

  const cards: ParsedCard[] = [];
  const cardPattern = /([AKQJT2-9]|10)[hdcs♥♦♣♠]/gi;
  const matches = heroHand.match(cardPattern);

  if (matches) {
    for (const match of matches) {
      const parsed = parseCardString(match);
      if (parsed) cards.push(parsed);
    }
  }

  if (cards.length === 0 && heroHand.length === 2) {
    const rank = heroHand[0].toUpperCase();
    if (/[AKQJT2-9]/.test(rank)) {
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

// ========================================
// Odds Comparison Component
// ========================================
function OddsComparison({ equity, potOdds }: { equity?: number; potOdds?: number }) {
  if (equity === undefined || potOdds === undefined || potOdds === 0) {
    return null;
  }

  const equityNeeded = 100 / (potOdds + 1);
  const isProfitable = equity > equityNeeded;

  return (
    <View style={oddsStyles.container}>
      {/* Equity Bar */}
      <View style={oddsStyles.barSection}>
        <Text style={oddsStyles.barLabel}>YOUR EQUITY</Text>
        <View style={oddsStyles.barBackground}>
          <Animated.View style={[oddsStyles.barFill, { width: `${Math.min(equity, 100)}%`, backgroundColor: '#22C55E' }]} />
        </View>
        <Text style={oddsStyles.barValue}>{equity}%</Text>
      </View>

      {/* Pot Odds Bar */}
      <View style={oddsStyles.barSection}>
        <Text style={oddsStyles.barLabel}>NEED TO CALL</Text>
        <View style={oddsStyles.barBackground}>
          <Animated.View style={[oddsStyles.barFill, { width: `${Math.min(equityNeeded, 100)}%`, backgroundColor: colors.accent.gold }]} />
          {/* Equity marker line */}
          <View style={[oddsStyles.markerLine, { left: `${Math.min(equity, 100)}%` }]} />
        </View>
        <Text style={oddsStyles.barValue}>{equityNeeded.toFixed(0)}%</Text>
      </View>

      {/* Verdict Badge */}
      <View style={[oddsStyles.verdictBadge, { backgroundColor: isProfitable ? 'rgba(34, 197, 94, 0.15)' : 'rgba(255, 58, 58, 0.15)' }]}>
        {isProfitable ? (
          <TrendingUp size={16} color="#22C55E" />
        ) : (
          <TrendingDown size={16} color={colors.accent.primary} />
        )}
        <Text style={[oddsStyles.verdictText, { color: isProfitable ? '#22C55E' : colors.accent.primary }]}>
          {isProfitable ? '+EV CALL' : 'FOLD'}
        </Text>
      </View>
    </View>
  );
}

const oddsStyles = StyleSheet.create({
  container: {
    backgroundColor: colors.background.secondary,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  } as ViewStyle,
  barSection: {
    marginBottom: 12,
  } as ViewStyle,
  barLabel: {
    fontSize: 10,
    fontWeight: '600' as const,
    color: colors.text.muted,
    letterSpacing: 1,
    marginBottom: 6,
  } as TextStyle,
  barBackground: {
    height: 12,
    backgroundColor: colors.background.tertiary,
    borderRadius: 6,
    overflow: 'hidden',
    position: 'relative',
  } as ViewStyle,
  barFill: {
    height: 12,
    borderRadius: 6,
  } as ViewStyle,
  markerLine: {
    position: 'absolute',
    top: 0,
    width: 2,
    height: 12,
    backgroundColor: '#22C55E',
    marginLeft: -1,
  } as ViewStyle,
  barValue: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: colors.text.primary,
    marginTop: 4,
  } as TextStyle,
  verdictBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginTop: 4,
  } as ViewStyle,
  verdictText: {
    fontSize: 14,
    fontWeight: '700' as const,
    letterSpacing: 0.5,
  } as TextStyle,
});

// ========================================
// Reasoning Bullets Component
// ========================================
const BULLET_ICONS: Record<string, React.ComponentType<{ size: number; color: string }>> = {
  position: Target,
  range: Users,
  odds: Calculator,
  strength: Shield,
  implied: TrendingUp,
  aggression: Zap,
  timing: Clock,
  default: Lightbulb,
};

function getIconForBullet(text: string): React.ComponentType<{ size: number; color: string }> {
  const lowerText = text.toLowerCase();
  if (lowerText.includes('position')) return BULLET_ICONS.position;
  if (lowerText.includes('range') || lowerText.includes('villain')) return BULLET_ICONS.range;
  if (lowerText.includes('odds') || lowerText.includes('equity')) return BULLET_ICONS.odds;
  if (lowerText.includes('strong') || lowerText.includes('hand')) return BULLET_ICONS.strength;
  if (lowerText.includes('implied') || lowerText.includes('stack')) return BULLET_ICONS.implied;
  if (lowerText.includes('aggress') || lowerText.includes('pressure')) return BULLET_ICONS.aggression;
  if (lowerText.includes('street') || lowerText.includes('turn') || lowerText.includes('river')) return BULLET_ICONS.timing;
  return BULLET_ICONS.default;
}

function ReasoningBullets({ bullets }: { bullets?: string[] }) {
  if (!bullets || bullets.length === 0) {
    return null;
  }

  return (
    <View style={bulletStyles.container}>
      {bullets.slice(0, 3).map((bullet, idx) => {
        const Icon = getIconForBullet(bullet);
        return (
          <View key={idx} style={bulletStyles.row}>
            <View style={bulletStyles.iconCircle}>
              <Icon size={16} color={colors.accent.gold} />
            </View>
            <Text style={bulletStyles.text}>{bullet}</Text>
          </View>
        );
      })}
    </View>
  );
}

const bulletStyles = StyleSheet.create({
  container: {
    marginBottom: 16,
  } as ViewStyle,
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  } as ViewStyle,
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(232, 184, 74, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  text: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500' as const,
    color: colors.text.secondary,
    lineHeight: 20,
  } as TextStyle,
});

// ========================================
// Situation Summary Component
// ========================================
function SituationSummary({ summary }: { summary?: string }) {
  if (!summary) return null;

  return (
    <View style={situationStyles.container}>
      <Text style={situationStyles.text}>{summary}</Text>
    </View>
  );
}

const situationStyles = StyleSheet.create({
  container: {
    backgroundColor: colors.background.secondary,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderLeftWidth: 3,
    borderLeftColor: colors.accent.gold,
  } as ViewStyle,
  text: {
    fontSize: 15,
    fontWeight: '500' as const,
    color: colors.text.secondary,
    lineHeight: 22,
    fontStyle: 'italic',
  } as TextStyle,
});

// ========================================
// Expandable Section Component
// ========================================
interface ExpandableSectionProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  preview?: string;
  defaultExpanded?: boolean;
}

function ExpandableSection({ title, icon, children, preview, defaultExpanded = false }: ExpandableSectionProps) {
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
          <View style={styles.expandableTitleContainer}>
            <Text style={styles.expandableTitle}>{title}</Text>
            {!expanded && preview && (
              <Text style={styles.expandablePreview} numberOfLines={1}>{preview}</Text>
            )}
          </View>
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

// ========================================
// Math Education Section (Compact)
// ========================================
function MathEducationSection({
  analysis,
  defaultExpanded,
}: {
  analysis: AnalysisResult;
  defaultExpanded: boolean;
}) {
  const hasOutsInfo = analysis.outs !== undefined && analysis.outs !== null && analysis.outs > 0;
  const hasEquityInfo = analysis.equity !== undefined && analysis.equity !== null;
  const hasPotOdds = analysis.potOdds !== undefined && analysis.potOdds !== null && analysis.potOdds > 0;

  if (!hasOutsInfo && !hasEquityInfo && !hasPotOdds) {
    return null;
  }

  const equityNeeded = hasPotOdds ? (100 / (analysis.potOdds! + 1)) : 0;
  const preview = `${analysis.outs || '?'} outs | ${analysis.equity || '?'}% equity`;

  return (
    <ExpandableSection
      title="Learn the Math"
      icon={<Calculator size={18} color={colors.accent.gold} />}
      preview={preview}
      defaultExpanded={defaultExpanded}
    >
      {hasOutsInfo && (
        <View style={styles.mathBlock}>
          <Text style={styles.mathTitle}>COUNTING OUTS</Text>
          <Text style={styles.mathFormula}>
            {analysis.outBreakdown || `${analysis.outs} outs to improve`}
          </Text>
        </View>
      )}

      {hasOutsInfo && hasEquityInfo && (
        <View style={styles.mathBlock}>
          <Text style={styles.mathTitle}>EQUITY (Rule of 4)</Text>
          <Text style={styles.mathFormula}>
            {analysis.outs} × 4 = ~{analysis.outs! * 4}% → Actual: {analysis.equity}%
          </Text>
        </View>
      )}

      {hasPotOdds && (
        <View style={styles.mathBlock}>
          <Text style={styles.mathTitle}>POT ODDS</Text>
          <Text style={styles.mathFormula}>
            {analysis.potOdds}:1 odds = need {equityNeeded.toFixed(0)}% equity
          </Text>
        </View>
      )}
    </ExpandableSection>
  );
}

// ========================================
// Main Component
// ========================================
export function FullResultCard({ analysis, handData }: FullResultCardProps) {
  const [experienceLevel, setExperienceLevel] = useState<ExperienceLevel>('beginner');

  useEffect(() => {
    getUserIdentity().then(identity => {
      if (identity?.experienceLevel) {
        setExperienceLevel(identity.experienceLevel);
      }
    });
  }, []);

  const showMathByDefault = experienceLevel === 'beginner';
  const getConfidence = () => analysis?.confidence ?? 0;
  const getRecommendation = () => analysis?.recommendedAction || 'Analyzing...';

  const getConfidenceLabel = () => {
    const confidence = getConfidence();
    if (confidence >= 80) return 'HIGH';
    if (confidence >= 50) return 'MODERATE';
    return 'LOW';
  };

  const getConfidenceColor = () => {
    const confidence = getConfidence();
    if (confidence >= 80) return colors.accent.gold;
    if (confidence >= 50) return colors.text.secondary;
    return colors.text.muted;
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Visual Hand Section - Compact */}
      <View style={styles.visualHandSection}>
        <View style={styles.handRow}>
          {/* Hero Cards */}
          <View style={styles.cardContainer}>
            <Text style={styles.cardContainerLabel}>YOUR HAND</Text>
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
            </View>
          </View>

          {/* Board Cards */}
          {handData?.flop && handData.flop.length > 0 && (
            <View style={styles.cardContainer}>
              <Text style={styles.cardContainerLabel}>BOARD</Text>
              <View style={styles.boardCardsRow}>
                {parseBoardCards(handData.flop, handData.turn, handData.river).map((card, idx) => (
                  <PlayingCard
                    key={`board-${idx}`}
                    rank={card.rank}
                    suit={card.suit}
                    size="small"
                    animateIn
                    delay={200 + idx * 80}
                  />
                ))}
              </View>
            </View>
          )}
        </View>

        {/* Info Row - Position, Pot, Stack */}
        <View style={styles.quickInfoRow}>
          {handData?.heroPosition && (
            <View style={styles.positionBadge}>
              <Text style={styles.positionText}>
                {handData.heroPosition}
                {handData.villainPosition ? ` vs ${handData.villainPosition}` : ''}
              </Text>
            </View>
          )}
          {handData?.potSize !== undefined && (
            <Text style={styles.infoPill}>Pot ${handData.potSize}</Text>
          )}
          {(handData?.effectiveStack || handData?.heroStack) && (
            <Text style={styles.infoPill}>Stack ${handData.effectiveStack ?? handData.heroStack}</Text>
          )}
        </View>
      </View>

      {/* SITUATION SUMMARY */}
      <SituationSummary summary={analysis?.situationSummary} />

      {/* RECOMMENDATION CENTERPIECE */}
      <View style={styles.recommendationSection}>
        <Text style={styles.recommendationLabel}>RECOMMENDED ACTION</Text>
        <Text style={styles.recommendationText}>{getRecommendation()}</Text>

        {/* Enhanced Confidence Display */}
        <View style={styles.confidenceContainer}>
          <View style={styles.confidenceBarBg}>
            <View style={[styles.confidenceBar, { width: `${getConfidence()}%` }]} />
          </View>
          <View style={styles.confidenceInfo}>
            <Text style={styles.confidenceValue}>{getConfidence()}%</Text>
            <Text style={[styles.confidenceLabel, { color: getConfidenceColor() }]}>
              {getConfidenceLabel()}
            </Text>
          </View>
        </View>
      </View>

      {/* EQUITY vs POT ODDS VISUAL */}
      <OddsComparison equity={analysis?.equity} potOdds={analysis?.potOdds} />

      {/* QUICK REASONING BULLETS */}
      <ReasoningBullets bullets={analysis?.reasoningBullets} />

      {/* EXPANDABLE DETAILS */}
      <View style={styles.expandableGrid}>
        {analysis?.gtoLine && (
          <ExpandableSection
            title="GTO Analysis"
            icon={<Target size={18} color={colors.accent.gold} />}
            preview={analysis.gtoLine.slice(0, 40) + '...'}
          >
            <Text style={styles.expandedText}>{analysis.gtoLine}</Text>
          </ExpandableSection>
        )}

        {analysis?.exploitLine && (
          <ExpandableSection
            title="Exploitative Line"
            icon={<TrendingUp size={18} color={colors.accent.gold} />}
            preview={analysis.exploitLine.slice(0, 40) + '...'}
          >
            <Text style={styles.expandedText}>{analysis.exploitLine}</Text>
          </ExpandableSection>
        )}

        <MathEducationSection
          analysis={analysis}
          defaultExpanded={showMathByDefault}
        />

        {analysis?.villainRange && (
          <ExpandableSection
            title="Villain Range"
            icon={<Users size={18} color={colors.text.secondary} />}
            preview={analysis.villainRange.slice(0, 40) + '...'}
          >
            <Text style={styles.expandedText}>{analysis.villainRange}</Text>
          </ExpandableSection>
        )}

        {analysis?.alternativeActions && analysis.alternativeActions.length > 0 && (
          <ExpandableSection
            title="Alternative Actions"
            icon={<Lightbulb size={18} color={colors.accent.gold} />}
            preview={analysis.alternativeActions[0]?.action}
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

        {/* Your Hand Story - shows original narrative (last) */}
        {handData?.originalNarrative && (
          <ExpandableSection
            title="Your Hand Story"
            icon={<MessageSquare size={18} color={colors.text.secondary} />}
            preview={handData.originalNarrative.slice(0, 50) + '...'}
          >
            <Text style={styles.narrativeText}>{handData.originalNarrative}</Text>
          </ExpandableSection>
        )}
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
    padding: 16,
    paddingBottom: 40,
  } as ViewStyle,
  // Visual Hand Section
  visualHandSection: {
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.background.tertiary,
  } as ViewStyle,
  handRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  } as ViewStyle,
  cardContainer: {
    backgroundColor: colors.background.secondary,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.background.tertiary,
  } as ViewStyle,
  cardContainerLabel: {
    fontSize: 10,
    fontWeight: '700' as const,
    color: colors.text.muted,
    letterSpacing: 1,
    marginBottom: 8,
    textAlign: 'center',
  } as TextStyle,
  heroCardsRow: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
  } as ViewStyle,
  boardCardsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 3,
    justifyContent: 'center',
  } as ViewStyle,
  quickInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  } as ViewStyle,
  positionBadge: {
    backgroundColor: colors.accent.gold,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  } as ViewStyle,
  positionText: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: colors.text.inverse,
    textTransform: 'uppercase',
  } as TextStyle,
  infoPill: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: colors.text.secondary,
    backgroundColor: colors.background.secondary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  } as TextStyle,
  // Recommendation Section
  recommendationSection: {
    marginBottom: 20,
    backgroundColor: 'rgba(232, 184, 74, 0.08)',
    padding: 16,
    borderRadius: 16,
  } as ViewStyle,
  recommendationLabel: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: colors.text.muted,
    letterSpacing: 1,
    marginBottom: 8,
  } as TextStyle,
  recommendationText: {
    fontSize: 32,
    fontWeight: '800' as const,
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
    height: 10,
    backgroundColor: colors.background.tertiary,
    borderRadius: 5,
  } as ViewStyle,
  confidenceBar: {
    height: 10,
    backgroundColor: colors.accent.gold,
    borderRadius: 5,
  } as ViewStyle,
  confidenceInfo: {
    alignItems: 'flex-end',
  } as ViewStyle,
  confidenceValue: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: colors.accent.gold,
  } as TextStyle,
  confidenceLabel: {
    fontSize: 10,
    fontWeight: '600' as const,
    letterSpacing: 0.5,
  } as TextStyle,
  // Expandable Sections
  expandableGrid: {
    gap: 8,
  } as ViewStyle,
  expandableContainer: {
    backgroundColor: colors.background.secondary,
    borderRadius: 12,
    overflow: 'hidden',
  } as ViewStyle,
  expandableHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
  } as ViewStyle,
  expandableHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  } as ViewStyle,
  expandableTitleContainer: {
    flex: 1,
  } as ViewStyle,
  expandableTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: colors.text.primary,
  } as TextStyle,
  expandablePreview: {
    fontSize: 12,
    color: colors.text.muted,
    marginTop: 2,
  } as TextStyle,
  expandableContent: {
    paddingHorizontal: 14,
    paddingBottom: 14,
  } as ViewStyle,
  expandedText: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.text.secondary,
  } as TextStyle,
  // Math Section
  mathBlock: {
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.background.tertiary,
  } as ViewStyle,
  mathTitle: {
    fontSize: 10,
    fontWeight: '700' as const,
    color: colors.accent.gold,
    letterSpacing: 1,
    marginBottom: 6,
  } as TextStyle,
  mathFormula: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: colors.text.primary,
  } as TextStyle,
  // Alternative Actions
  altActionRow: {
    marginBottom: 10,
    paddingBottom: 10,
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
    fontSize: 14,
    fontWeight: '600' as const,
    color: colors.text.primary,
  } as TextStyle,
  altActionEV: {
    fontSize: 13,
    fontWeight: '600' as const,
  } as TextStyle,
  altActionReasoning: {
    fontSize: 13,
    color: colors.text.muted,
    lineHeight: 18,
  } as TextStyle,
  // Narrative text for "Your Hand Story"
  narrativeText: {
    fontSize: 14,
    lineHeight: 22,
    color: colors.text.secondary,
    fontStyle: 'italic',
  } as TextStyle,
});
