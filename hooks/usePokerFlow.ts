import createContextHook from '@nkzw/create-context-hook';
import { useState, useCallback, useMemo } from 'react';
import { useMutation } from '@tanstack/react-query';
import type { ConversationMessage, HandData } from '@/types/poker';
import { parseHandWithAI, generateClarifyingQuestion, analyzeHand } from '@/services/aiService';
import { storeHand } from '@/services/storageService';

export const [PokerFlowProvider, usePokerFlow] = createContextHook(() => {
  const [messages, setMessages] = useState<ConversationMessage[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Hey! Tell me about a poker hand you played. I can help you analyze it. Just describe it naturally - I understand poker slang!',
      timestamp: Date.now(),
    }
  ]);
  
  const [currentHandData, setCurrentHandData] = useState<Partial<HandData>>({});
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const parseMutation = useMutation({
    mutationFn: async (userMessage: string) => {
      const parsed = await parseHandWithAI(messages, userMessage);
      return parsed;
    },
  });

  const analyzeMutation = useMutation({
    mutationFn: async (handData: HandData) => {
      setIsAnalyzing(true);
      const analysis = await analyzeHand(handData);
      await storeHand(handData, analysis);
      return analysis;
    },
  });

  const parseAsync = parseMutation.mutateAsync;
  const analyzeAsync = analyzeMutation.mutateAsync;
  const isParsePending = parseMutation.isPending;

  const sendMessage = useCallback(async (content: string) => {
    const userMessage: ConversationMessage = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, userMessage]);

    try {
      const parsed = await parseAsync(content);
      
      const updatedHandData = {
        ...currentHandData,
        ...parsed,
        originalNarrative: currentHandData.originalNarrative 
          ? `${currentHandData.originalNarrative}\n${content}`
          : content,
      };
      
      setCurrentHandData(updatedHandData);

      if (parsed.isComplete && updatedHandData.id) {
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          role: 'assistant',
          content: 'Great! I have all the info I need. Analyzing your hand now...',
          timestamp: Date.now(),
        }]);

        const analysis = await analyzeAsync(updatedHandData as HandData);
        
        const analysisMessage: ConversationMessage = {
          id: Date.now().toString(),
          role: 'assistant',
          content: `Analysis complete! ${analysis.recommendedAction}`,
          timestamp: Date.now(),
          handData: updatedHandData as HandData,
          analysis,
        };
        
        setMessages(prev => [...prev, analysisMessage]);
        setIsAnalyzing(false);
      } else {
        const question = await generateClarifyingQuestion(updatedHandData, messages);
        
        const assistantMessage: ConversationMessage = {
          id: Date.now().toString(),
          role: 'assistant',
          content: question,
          timestamp: Date.now(),
          handData: updatedHandData,
        };
        
        setMessages(prev => [...prev, assistantMessage]);
      }
    } catch (error) {
      console.error('Error processing message:', error);
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'assistant',
        content: 'Sorry, I had trouble processing that. Could you try rephrasing?',
        timestamp: Date.now(),
      }]);
      setIsAnalyzing(false);
    }
  }, [messages, currentHandData, parseAsync, analyzeAsync]);

  const startNewHand = useCallback(() => {
    const handId = `hand_${Date.now()}`;
    setCurrentHandData({ id: handId, missingFields: [], isComplete: false, narrativeStyle: 'standard' });
    setMessages([{
      id: Date.now().toString(),
      role: 'assistant',
      content: 'Ready for a new hand! Tell me what happened.',
      timestamp: Date.now(),
    }]);
    setIsAnalyzing(false);
  }, []);

  return useMemo(() => ({
    messages,
    sendMessage,
    startNewHand,
    isAnalyzing,
    isParsing: isParsePending,
    currentHandData,
  }), [messages, sendMessage, startNewHand, isAnalyzing, isParsePending, currentHandData]);
});
