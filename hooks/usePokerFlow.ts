import createContextHook from '@nkzw/create-context-hook';
import { useState, useCallback, useMemo } from 'react';
import { useMutation } from '@tanstack/react-query';
import type { ConversationMessage, HandData, AnalysisResult } from '@/types/poker';
import { parseHandWithAI, analyzeHand as analyzeHandAI, generateText } from '@/services/supabaseAI';
import { storeHand } from '@/services/supabaseStorage';

function detectNarrativeStyle(text: string): 'standard' | 'mariano' {
  const marianoIndicators = [
    /let's go/i,
    /boom/i,
    /sick/i,
    /insane/i,
    /massive/i,
    /ripped it in/i,
    /no justice/i,
    /looking for/i,
    /gets there/i,
  ];
  const matches = marianoIndicators.filter(regex => regex.test(text));
  return matches.length >= 2 ? 'mariano' : 'standard';
}

export const [PokerFlowProvider, usePokerFlow] = createContextHook(() => {
  const [messages, setMessages] = useState<ConversationMessage[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Tell me about your hand.',
      timestamp: Date.now(),
    }
  ]);

  const [currentHandData, setCurrentHandData] = useState<Partial<HandData>>({});
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const parseHand = async (
    conversationHistory: ConversationMessage[],
    newMessage: string
  ): Promise<Partial<HandData>> => {
    const contextPrompt = `Previous conversation:
${conversationHistory.map(m => `${m.role}: ${m.content}`).join('\n')}

New message: ${newMessage}`;

    try {
      const parsed = await parseHandWithAI(contextPrompt);
      return {
        ...parsed,
        narrativeStyle: detectNarrativeStyle(newMessage),
        originalNarrative: newMessage,
      };
    } catch (error) {
      console.error('Error parsing hand:', error);
      return {
        narrativeStyle: detectNarrativeStyle(newMessage),
        missingFields: ['heroHand', 'heroPosition', 'villainPosition'],
        isComplete: false,
        originalNarrative: newMessage,
      };
    }
  };

  const generateClarifyingQuestion = async (
    handData: Partial<HandData>,
    _conversationHistory: ConversationMessage[]
  ): Promise<string> => {
    const missingFields = handData.missingFields || [];
    const style = handData.narrativeStyle || 'standard';

    // Fallback questions if AI fails
    const fallbackQuestions: Record<string, string> = {
      heroHand: "What cards did you have?",
      heroPosition: "What position were you in?",
      villainPosition: "Where was the villain sitting?",
      heroStack: "How deep were you?",
      villainStack: "How many BBs did villain have?",
    };

    const prompt = `You are a helpful poker assistant. The user is describing a poker hand but is missing some information.

Current hand data:
${JSON.stringify(handData, null, 2)}

Missing fields: ${missingFields.join(', ')}

Generate a natural, conversational question to get the most critical missing information.
${style === 'mariano' ?
      'Match their enthusiastic energy! Keep it SHORT, PUNCHY! Like "Yo what position were you in?" or "Sick! What cards you holding?"' :
      'Be calm and professional.'}

Ask about ONE thing at a time. Make it feel natural, not like a form.`;

    try {
      const question = await generateText(prompt);
      return question || fallbackQuestions[missingFields[0]] || "Tell me more about what happened.";
    } catch (error) {
      console.error('Error generating question:', error);
      return fallbackQuestions[missingFields[0]] || "Could you tell me a bit more about the hand?";
    }
  };

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

  const parseMutation = useMutation({
    mutationFn: async (userMessage: string) => {
      return await parseHand(messages, userMessage);
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
        id: currentHandData.id || `hand_${Date.now()}`,
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
      content: 'Tell me about your hand.',
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
