import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import { X, Check } from 'lucide-react-native';
import { colors } from '@/constants/colors';

const RANKS = ['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2'] as const;
const SUITS = [
  { symbol: '♠', name: 'spades', color: colors.cards.spades },
  { symbol: '♥', name: 'hearts', color: colors.cards.hearts },
  { symbol: '♦', name: 'diamonds', color: colors.cards.diamonds },
  { symbol: '♣', name: 'clubs', color: colors.cards.clubs },
] as const;

type Rank = typeof RANKS[number];
type SuitName = typeof SUITS[number]['name'];

interface CardPickerProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (cards: string[]) => void;
  maxCards: number;
  title?: string;
  initialCards?: string[];
}

interface SelectedCard {
  rank: Rank;
  suit: SuitName;
  display: string;
}

export default function CardPicker({
  visible,
  onClose,
  onSelect,
  maxCards,
  title = 'Select Cards',
  initialCards = [],
}: CardPickerProps) {
  const [selectedCards, setSelectedCards] = useState<SelectedCard[]>(() => {
    // Parse initial cards like "As", "Kh" into our format
    return initialCards.map(card => {
      const rank = card[0].toUpperCase() as Rank;
      const suitChar = card[1].toLowerCase();
      const suit = suitChar === 's' ? 'spades' : suitChar === 'h' ? 'hearts' : suitChar === 'd' ? 'diamonds' : 'clubs';
      const suitSymbol = SUITS.find(s => s.name === suit)?.symbol || '♠';
      return { rank, suit: suit as SuitName, display: `${rank}${suitSymbol}` };
    });
  });

  const [selectedRank, setSelectedRank] = useState<Rank | null>(null);

  const isCardSelected = useCallback((rank: Rank, suit: SuitName) => {
    return selectedCards.some(c => c.rank === rank && c.suit === suit);
  }, [selectedCards]);

  const handleRankSelect = (rank: Rank) => {
    setSelectedRank(rank === selectedRank ? null : rank);
  };

  const handleSuitSelect = (suit: typeof SUITS[number]) => {
    if (!selectedRank) return;

    const cardKey = `${selectedRank}${suit.name}`;
    const existingIndex = selectedCards.findIndex(c => c.rank === selectedRank && c.suit === suit.name);

    if (existingIndex >= 0) {
      // Remove card
      setSelectedCards(prev => prev.filter((_, i) => i !== existingIndex));
    } else if (selectedCards.length < maxCards) {
      // Add card
      setSelectedCards(prev => [...prev, {
        rank: selectedRank,
        suit: suit.name,
        display: `${selectedRank}${suit.symbol}`,
      }]);
    }

    setSelectedRank(null);
  };

  const handleClear = () => {
    setSelectedCards([]);
    setSelectedRank(null);
  };

  const handleDone = () => {
    // Convert to standard notation (As, Kh, etc.)
    const cards = selectedCards.map(c => {
      const suitChar = c.suit[0]; // 's', 'h', 'd', 'c'
      return `${c.rank}${suitChar}`;
    });
    onSelect(cards);
    onClose();
  };

  const handleClose = () => {
    setSelectedCards([]);
    setSelectedRank(null);
    onClose();
  };

  const getSuitColor = (suitName: SuitName) => {
    return SUITS.find(s => s.name === suitName)?.color || colors.text.primary;
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <X size={24} color={colors.text.primary} />
          </TouchableOpacity>
          <Text style={styles.title}>{title}</Text>
          <TouchableOpacity onPress={handleDone} style={styles.doneButton}>
            <Check size={24} color={colors.accent.primary} />
          </TouchableOpacity>
        </View>

        {/* Selected Cards Display */}
        <View style={styles.selectedContainer}>
          <Text style={styles.selectedLabel}>
            Selected ({selectedCards.length}/{maxCards}):
          </Text>
          <View style={styles.selectedCards}>
            {selectedCards.length === 0 ? (
              <Text style={styles.placeholder}>Tap a rank, then a suit</Text>
            ) : (
              selectedCards.map((card, index) => (
                <TouchableOpacity
                  key={`${card.rank}${card.suit}`}
                  style={styles.selectedCard}
                  onPress={() => setSelectedCards(prev => prev.filter((_, i) => i !== index))}
                >
                  <Text style={[styles.selectedCardRank, { color: getSuitColor(card.suit) }]}>
                    {card.rank}
                  </Text>
                  <Text style={[styles.selectedCardSuit, { color: getSuitColor(card.suit) }]}>
                    {SUITS.find(s => s.name === card.suit)?.symbol}
                  </Text>
                </TouchableOpacity>
              ))
            )}
          </View>
        </View>

        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          {/* Rank Selection */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Rank</Text>
            <View style={styles.rankGrid}>
              {RANKS.map(rank => (
                <TouchableOpacity
                  key={rank}
                  style={[
                    styles.rankButton,
                    selectedRank === rank && styles.rankButtonSelected,
                  ]}
                  onPress={() => handleRankSelect(rank)}
                >
                  <Text style={[
                    styles.rankText,
                    selectedRank === rank && styles.rankTextSelected,
                  ]}>
                    {rank}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Suit Selection */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {selectedRank ? `Select suit for ${selectedRank}` : 'Suit'}
            </Text>
            <View style={styles.suitGrid}>
              {SUITS.map(suit => {
                const isSelected = selectedRank && isCardSelected(selectedRank, suit.name);
                const isDisabled = !selectedRank || (selectedCards.length >= maxCards && !isSelected);

                return (
                  <TouchableOpacity
                    key={suit.name}
                    style={[
                      styles.suitButton,
                      isSelected && styles.suitButtonSelected,
                      isDisabled && styles.suitButtonDisabled,
                    ]}
                    onPress={() => handleSuitSelect(suit)}
                    disabled={isDisabled && !isSelected}
                  >
                    <Text style={[
                      styles.suitSymbol,
                      { color: suit.color },
                      isDisabled && !isSelected && styles.suitSymbolDisabled,
                    ]}>
                      {suit.symbol}
                    </Text>
                    <Text style={[
                      styles.suitName,
                      isDisabled && !isSelected && styles.suitNameDisabled,
                    ]}>
                      {suit.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Quick Card Grid - All cards at once */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Or tap a card directly</Text>
            <View style={styles.cardGrid}>
              {SUITS.map(suit => (
                <View key={suit.name} style={styles.cardRow}>
                  {RANKS.map(rank => {
                    const isSelected = isCardSelected(rank, suit.name);
                    const isDisabled = selectedCards.length >= maxCards && !isSelected;

                    return (
                      <TouchableOpacity
                        key={`${rank}${suit.name}`}
                        style={[
                          styles.cardButton,
                          isSelected && styles.cardButtonSelected,
                          isDisabled && styles.cardButtonDisabled,
                        ]}
                        onPress={() => {
                          if (isSelected) {
                            setSelectedCards(prev => prev.filter(c => !(c.rank === rank && c.suit === suit.name)));
                          } else if (!isDisabled) {
                            setSelectedCards(prev => [...prev, {
                              rank,
                              suit: suit.name,
                              display: `${rank}${suit.symbol}`,
                            }]);
                          }
                        }}
                        disabled={isDisabled && !isSelected}
                      >
                        <Text style={[
                          styles.cardButtonText,
                          { color: suit.color },
                          isDisabled && !isSelected && styles.cardButtonTextDisabled,
                        ]}>
                          {rank}{suit.symbol}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ))}
            </View>
          </View>
        </ScrollView>

        {/* Footer Actions */}
        <View style={styles.footer}>
          <TouchableOpacity style={styles.clearButton} onPress={handleClear}>
            <Text style={styles.clearButtonText}>Clear</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.confirmButton, selectedCards.length === 0 && styles.confirmButtonDisabled]}
            onPress={handleDone}
            disabled={selectedCards.length === 0}
          >
            <Text style={styles.confirmButtonText}>
              Done{selectedCards.length > 0 ? ` (${selectedCards.length})` : ''}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  } as ViewStyle,
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.background.tertiary,
  } as ViewStyle,
  closeButton: {
    padding: 8,
  } as ViewStyle,
  doneButton: {
    padding: 8,
  } as ViewStyle,
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
  } as TextStyle,
  selectedContainer: {
    padding: 16,
    backgroundColor: colors.background.secondary,
    borderBottomWidth: 1,
    borderBottomColor: colors.background.tertiary,
  } as ViewStyle,
  selectedLabel: {
    fontSize: 14,
    color: colors.text.muted,
    marginBottom: 12,
  } as TextStyle,
  selectedCards: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    minHeight: 60,
    alignItems: 'center',
  } as ViewStyle,
  placeholder: {
    fontSize: 16,
    color: colors.text.muted,
    fontStyle: 'italic',
  } as TextStyle,
  selectedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.tertiary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.accent.primary,
  } as ViewStyle,
  selectedCardRank: {
    fontSize: 24,
    fontWeight: '700',
  } as TextStyle,
  selectedCardSuit: {
    fontSize: 24,
    marginLeft: 2,
  } as TextStyle,
  scrollView: {
    flex: 1,
  } as ViewStyle,
  scrollContent: {
    padding: 16,
  } as ViewStyle,
  section: {
    marginBottom: 24,
  } as ViewStyle,
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.muted,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  } as TextStyle,
  rankGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  } as ViewStyle,
  rankButton: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: colors.background.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.background.tertiary,
  } as ViewStyle,
  rankButtonSelected: {
    backgroundColor: colors.accent.primary,
    borderColor: colors.accent.primary,
  } as ViewStyle,
  rankText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
  } as TextStyle,
  rankTextSelected: {
    color: colors.text.inverse,
  } as TextStyle,
  suitGrid: {
    flexDirection: 'row',
    gap: 12,
  } as ViewStyle,
  suitButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: colors.background.secondary,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.background.tertiary,
  } as ViewStyle,
  suitButtonSelected: {
    borderColor: colors.accent.primary,
    borderWidth: 2,
  } as ViewStyle,
  suitButtonDisabled: {
    opacity: 0.4,
  } as ViewStyle,
  suitSymbol: {
    fontSize: 32,
    marginBottom: 4,
  } as TextStyle,
  suitSymbolDisabled: {
    opacity: 0.5,
  } as TextStyle,
  suitName: {
    fontSize: 12,
    color: colors.text.muted,
    textTransform: 'capitalize',
  } as TextStyle,
  suitNameDisabled: {
    opacity: 0.5,
  } as TextStyle,
  cardGrid: {
    gap: 4,
  } as ViewStyle,
  cardRow: {
    flexDirection: 'row',
    gap: 4,
  } as ViewStyle,
  cardButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 4,
    backgroundColor: colors.background.secondary,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.background.tertiary,
  } as ViewStyle,
  cardButtonSelected: {
    backgroundColor: colors.background.tertiary,
    borderColor: colors.accent.primary,
    borderWidth: 2,
  } as ViewStyle,
  cardButtonDisabled: {
    opacity: 0.3,
  } as ViewStyle,
  cardButtonText: {
    fontSize: 12,
    fontWeight: '600',
  } as TextStyle,
  cardButtonTextDisabled: {
    opacity: 0.5,
  } as TextStyle,
  footer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: colors.background.tertiary,
  } as ViewStyle,
  clearButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: colors.background.secondary,
    alignItems: 'center',
  } as ViewStyle,
  clearButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.muted,
  } as TextStyle,
  confirmButton: {
    flex: 2,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: colors.accent.primary,
    alignItems: 'center',
  } as ViewStyle,
  confirmButtonDisabled: {
    opacity: 0.5,
  } as ViewStyle,
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
  } as TextStyle,
});
