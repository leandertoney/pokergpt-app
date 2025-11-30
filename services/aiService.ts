import { generateText, generateJSON } from "./grokService";
import type { HandData, AnalysisResult, ConversationMessage } from "@/types/poker";

export async function parseHandWithAI(
  conversationHistory: ConversationMessage[],
  newMessage: string
): Promise<Partial<HandData>> {
  const prompt = `You are an expert poker hand parser. Parse the following poker narrative and extract structured data.
      
Understand poker slang like:
- "ripped it in" = went all-in
- "peeled" = called
- "cold 4-bet" = 4-bet without previous action
- "bombed" = bet big
- "flatted" = called
- "squeezed" = 3-bet after raise and call

Previous conversation:
${conversationHistory.map(m => `${m.role}: ${m.content}`).join('\n')}

New message: ${newMessage}

Extract all poker hand information you can find. Mark isComplete as true only if you have:
- Hero hand
- Hero position
- Hero stack
- Villain position
- Villain stack
- At least one street of action

List any missing critical fields in missingFields array.
Detect if the style is "mariano" (enthusiastic, vlogger-style narration) or "standard".

Return ONLY valid JSON matching the HandData schema.`;

  try {
    const parsed = await generateJSON(prompt);
    return parsed as Partial<HandData>;
  } catch (error) {
    console.error('Error parsing hand:', error);
    return {
      narrativeStyle: 'standard',
      missingFields: [],
      isComplete: false,
    };
  }
}

export async function generateClarifyingQuestion(
  handData: Partial<HandData>,
  conversationHistory: ConversationMessage[]
): Promise<string> {
  const missingFields = handData.missingFields || [];
  const style = handData.narrativeStyle || 'standard';

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
    return question;
  } catch (error) {
    console.error('Error generating question:', error);
    return "Could you tell me a bit more about the hand?";
  }
}

export async function analyzeHand(handData: HandData): Promise<AnalysisResult> {
  const structuralPrompt = `You are a GTO poker solver. Analyze this hand from a game theory optimal perspective:

${JSON.stringify(handData, null, 2)}

Provide:
- GTO recommended action
- Pot odds calculation
- Blocker effects
- Range analysis

Be precise and technical.`;

  const personaPrompt = `You are ${handData.narrativeStyle === 'mariano' 
    ? 'Mariano! Famous poker vlogger! SHORT BURSTS! ENERGY! "BOOM! Top pair!" "We RIP IT!" "No justice!" Keep it under 3 sentences, high energy!'
    : 'a calm poker mentor. Give wise, measured advice.'
  }

Hand:
${handData.originalNarrative}

${handData.narrativeStyle === 'mariano' ? 'QUICK TAKE! 2-3 sentences MAX! Like you\'re live streaming!' : 'Provide insights in your characteristic style.'}`;

  try {
    const [structuralResponse, personaResponse] = await Promise.all([
      generateText(structuralPrompt),
      generateText(personaPrompt),
    ]);

    const mergePrompt = `You are merging two poker analyses into a hybrid recommendation.

Structural (GTO) Analysis:
${structuralResponse}

Persona Analysis:
${personaResponse}

Create a unified recommendation that:
1. Gives a clear recommended action
2. Explains the GTO line
3. Explains an exploitative line if applicable
4. Provides a hybrid approach
5. Estimates villain's range
6. Gives confidence level (0-100)

Return as JSON with these exact fields: recommendedAction, gtoLine, exploitLine, hybridLine, villainRange, confidence (number 0-100)`;

    const merged = await generateJSON(mergePrompt) || {
      recommendedAction: "Analyze position and stack depth",
      gtoLine: structuralResponse.slice(0, 200),
      exploitLine: "Adjust based on villain tendencies",
      hybridLine: "Balance GTO with exploitative adjustments",
      villainRange: "Wide range, need more information",
      confidence: 60,
    };

    const result: AnalysisResult = {
      handId: handData.id,
      recommendedAction: merged.recommendedAction,
      gtoLine: merged.gtoLine,
      exploitLine: merged.exploitLine,
      hybridLine: merged.hybridLine,
      villainRange: merged.villainRange,
      confidence: merged.confidence,
      structuralAnalysis: {
        gtoAction: merged.gtoLine,
        rangeCommentary: merged.villainRange,
      },
      personaAnalysis: {
        tone: handData.narrativeStyle === 'mariano' ? 'mariano' : 'mentor',
        narrative: personaResponse,
        keyInsights: [merged.recommendedAction],
      },
      timestamp: Date.now(),
    };

    return result;
  } catch (error) {
    console.error('Error analyzing hand:', error);
    throw new Error('Failed to analyze hand');
  }
}

export function detectNarrativeStyle(text: string): 'standard' | 'mariano' {
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
