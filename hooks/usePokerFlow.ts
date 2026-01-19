import createContextHook from '@nkzw/create-context-hook';
import { useState, useCallback, useMemo } from 'react';
import { useMutation } from '@tanstack/react-query';
import type { ConversationMessage, HandData, AnalysisResult } from '@/types/poker';
import { analyzeHand as analyzeHandAI, conversationalChat } from '@/services/supabaseAI';
import { storeHand } from '@/services/supabaseStorage';


export const [PokerFlowProvider, usePokerFlow] = createContextHook(() => {
  const [messages, setMessages] = useState<ConversationMessage[]>([
    {
      id: '1',
      role: 'assistant',
      content: "What's up? Tell me about the hand.",
      timestamp: Date.now(),
    }
  ]);

  const [currentHandData, setCurrentHandData] = useState<Partial<HandData>>({});
  const [isAnalyzing, setIsAnalyzing] = useState(false);


  const analyzeHandFull = async (handData: HandData): Promise<AnalysisResult> => {
    try {
      const analysis = await analyzeHandAI(handData.originalNarrative || '');

      return {
        handId: handData.id,
        recommendedAction: analysis.recommendedAction || "Analyze position and stack depth",
        gtoLine: analysis.gtoLine || "",
        exploitLine: analysis.exploitLine || "",
        hybridLine: analysis.hybridLine || "",
        villainRange: analysis.villainRange || "",
        confidence: analysis.confidence || 60,
        reasoning: analysis.reasoning || "",
        // Math education fields
        equity: analysis.equity,
        potOdds: analysis.potOdds,
        impliedOdds: analysis.impliedOdds,
        outs: analysis.outs,
        outBreakdown: analysis.outBreakdown,
        riskLevel: analysis.riskLevel,
        reasoningBullets: analysis.reasoningBullets,
        situationSummary: analysis.situationSummary,
        alternativeActions: analysis.alternativeActions,
        structuralAnalysis: {
          gtoAction: analysis.gtoLine || "",
          rangeCommentary: analysis.villainRange || "",
        },
        personaAnalysis: analysis.personaAnalysis || {
          tone: 'mentor',
          narrative: "",
          keyInsights: [],
        },
        timestamp: Date.now(),
      };
    } catch (error) {
      console.error('Error analyzing hand:', error);
      throw new Error('Failed to analyze hand');
    }
  };

  const chatMutation = useMutation({
    mutationFn: async ({ userContent, currentMessages, handData }: {
      userContent: string;
      currentMessages: ConversationMessage[];
      handData: Partial<HandData>;
    }) => {
      // Format messages for the API (exclude handData/analysis metadata)
      const formattedMessages = currentMessages.map(m => ({
        role: m.role,
        content: m.content,
      }));
      // Add the new user message
      formattedMessages.push({ role: 'user' as const, content: userContent });

      return await conversationalChat(formattedMessages, handData);
    },
  });

  const analyzeMutation = useMutation({
    mutationFn: async (handData: HandData) => {
      setIsAnalyzing(true);
      const analysis = await analyzeHandFull(handData);
      await storeHand(handData, analysis);
      return analysis;
    },
  });

  const chatAsync = chatMutation.mutateAsync;
  const analyzeAsync = analyzeMutation.mutateAsync;
  const isChatPending = chatMutation.isPending;

  const sendMessage = useCallback(async (content: string) => {
    const userMessage: ConversationMessage = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, userMessage]);

    try {
      // Use the new conversational chat approach
      const { response, handData: updatedHandData } = await chatAsync({
        userContent: content,
        currentMessages: messages,
        handData: {
          ...currentHandData,
          id: currentHandData.id || `hand_${Date.now()}`,
          originalNarrative: currentHandData.originalNarrative
            ? `${currentHandData.originalNarrative}\n${content}`
            : content,
        },
      });

      // Update hand data with what the AI extracted
      const finalHandData = {
        ...currentHandData,
        ...updatedHandData,
        id: currentHandData.id || `hand_${Date.now()}`,
        originalNarrative: currentHandData.originalNarrative
          ? `${currentHandData.originalNarrative}\n${content}`
          : content,
      };

      setCurrentHandData(finalHandData);

      // Add the assistant's conversational response
      const assistantMessage: ConversationMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        content: response,
        timestamp: Date.now(),
        handData: finalHandData,
      };

      setMessages(prev => [...prev, assistantMessage]);

      // If the hand is complete, trigger analysis
      if (updatedHandData.isComplete && finalHandData.id) {
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          role: 'assistant',
          content: 'Alright, let me break this down for you...',
          timestamp: Date.now(),
        }]);

        const analysis = await analyzeAsync(finalHandData as HandData);

        const analysisMessage: ConversationMessage = {
          id: Date.now().toString(),
          role: 'assistant',
          content: `${analysis.recommendedAction}`,
          timestamp: Date.now(),
          handData: finalHandData as HandData,
          analysis,
        };

        setMessages(prev => [...prev, analysisMessage]);
        setIsAnalyzing(false);
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
  }, [messages, currentHandData, chatAsync, analyzeAsync]);

  const startNewHand = useCallback(() => {
    const handId = `hand_${Date.now()}`;
    setCurrentHandData({ id: handId, missingFields: [], isComplete: false });
    setMessages([{
      id: Date.now().toString(),
      role: 'assistant',
      content: "What's up? Tell me about the hand.",
      timestamp: Date.now(),
    }]);
    setIsAnalyzing(false);
  }, []);

  return useMemo(() => ({
    messages,
    sendMessage,
    startNewHand,
    isAnalyzing,
    isParsing: isChatPending,
    currentHandData,
  }), [messages, sendMessage, startNewHand, isAnalyzing, isChatPending, currentHandData]);
});
