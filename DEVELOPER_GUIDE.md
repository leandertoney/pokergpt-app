# PokerGPT - Mobile Poker Analysis Companion

A complete, production-ready mobile-first poker hand analyzer built with React Native, Expo, and AI.

## 🎯 Overview

PokerGPT is an AI-powered poker analysis companion that:
- Parses natural poker narratives (including slang and vlogger-style stories)
- Asks clarifying questions to gather complete hand information
- Provides dual-mode analysis: GTO solver-style + Persona (mentor or Mariano-style)
- Merges analyses into actionable hybrid recommendations
- Supports voice input for hands-free narration
- Stores hand history (5 for free tier, unlimited for paid)

## 🏗️ Architecture

### Core Components

```
/app                      # Screens (Expo Router)
  index.tsx              # Main chat screen
  analysis.tsx           # Full analysis view
  _layout.tsx            # Root layout with providers
  +not-found.tsx         # 404 screen

/components              # UI Components
  ChatBubble.tsx         # Message bubbles (user/AI)
  InputBar.tsx           # Text + voice input
  MiniResultCard.tsx     # In-chat analysis preview
  FullResultCard.tsx     # Detailed analysis breakdown

/hooks                   # State Management
  usePokerFlow.ts        # Conversation flow manager

/services                # Core Logic
  aiService.ts           # AI parsing & analysis
  storageService.ts      # Hand history persistence

/types                   # TypeScript Definitions
  poker.ts               # All types for hands, analysis, messages
```

## 🎨 Design System

### Colors
- **Gold (#D4AF37)**: Primary accent (headers, CTAs, highlights)
- **Black (#000000)**: Premium background
- **Dark Gray (#1A1A1A - #2A2A2A)**: Cards, bubbles
- **Green/Red Felt**: Subtle gradient background for poker table feel

### Typography
- Headers: Bold, 18-20px
- Body: Regular, 16px
- Buttons: SemiBold, 14-16px

## 🤖 AI Pipeline

### 1. Hand Parsing (`parseHandWithAI`)
```typescript
Input: User message + conversation history
Output: Partial<HandData> with extracted info

Understands:
- Positions (UTG, BTN, BB, etc.)
- Actions (ripped it in, peeled, squeezed, etc.)
- Stack sizes, pot sizes
- Board cards
- Narrative style (standard vs. Mariano)
```

### 2. Missing Info Detection
```typescript
Flow Manager detects incomplete hands
Generates natural follow-up questions
Adapts tone to narrative style
```

### 3. Dual Analysis (`analyzeHand`)
```typescript
Structural Analysis:
- GTO recommended action
- Pot odds calculation
- Blocker effects
- Range analysis

Persona Analysis:
- Mentor tone: Calm, measured advice
- Mariano tone: Excited vlogger narration
```

### 4. Merge Engine
```typescript
Combines both analyses into:
- recommendedAction (clear next move)
- gtoLine (solver perspective)
- exploitLine (opponent-specific adjustments)
- hybridLine (practical blend)
- villainRange (estimated holdings)
- confidence (0-100%)
```

## 🎤 Voice Input

### Mobile (iOS/Android)
Uses `expo-av`:
```typescript
- iOS: .wav format (LINEARPCM)
- Android: .m4a format (MPEG_4, AAC)
- Auto-disables recording mode after stop
- Handles permissions gracefully
```

### Web
Uses Web Audio API:
```typescript
- MediaRecorder with getUserMedia
- webm format
- Auto-stops tracks after recording
```

### Transcription
```typescript
POST https://toolkit.rork.com/stt/transcribe/
FormData: { audio: File }
Response: { text: string, language: string }
```

## 💾 Storage

### Hand History
```typescript
AsyncStorage key: '@poker_hands'
Structure: StoredHand[] (timestamped, sorted newest-first)

Free tier: MAX_FREE_HANDS = 5
Paid tier: Unlimited
```

### User Tier
```typescript
AsyncStorage key: '@user_tier'
Values: 'free' | 'paid'
```

## 🔄 State Management

### Global State (`usePokerFlow`)
Built with `@nkzw/create-context-hook`:
```typescript
- messages: ConversationMessage[]
- currentHandData: Partial<HandData>
- sendMessage(content: string)
- startNewHand()
- isAnalyzing, isParsing
```

### React Query
Used for:
- Hand history fetching (`getHandHistory`)
- Analysis mutations (with AsyncStorage sync)

## 📱 Navigation

### Expo Router Structure
```
/ (index)           → ChatScreen
/analysis?handId=X  → AnalysisScreen
```

No tabs. Full-screen immersive experience.

## 🔌 AI Provider Flexibility

All AI calls go through `services/aiService.ts` using Rork AI Toolkit:

```typescript
import { generateText } from "@rork-ai/toolkit-sdk";

// To swap models, update generateText calls with provider-specific config
// Current: Uses toolkit default (optimized for speed + cost)
```

### To Add Custom Model
1. Replace `generateText` imports with provider SDK
2. Keep function signatures identical
3. Update error handling as needed

Example for OpenAI:
```typescript
import { OpenAI } from "openai";
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function generateText(prompt: string) {
  const response = await openai.chat.completions.create({
    model: "gpt-4",
    messages: [{ role: "user", content: prompt }],
  });
  return response.choices[0].message.content;
}
```

## 🚀 Deployment

### Development
```bash
bun install
bun start              # Mobile preview
bun start-web          # Web preview
```

### Production Build
```bash
# Web (React Native Web)
eas build --platform web

# Mobile (Expo Go compatible)
# No custom native modules required
```

### Future: App Store Submission
To wrap for iOS/Android distribution:

1. **Using EAS Build**:
```bash
eas build --platform ios
eas build --platform android
eas submit --platform ios
eas submit --platform android
```

2. **Configure app.json**:
```json
{
  "expo": {
    "name": "PokerGPT",
    "slug": "pokergpt",
    "version": "1.0.0",
    "ios": {
      "bundleIdentifier": "com.yourcompany.pokergpt",
      "buildNumber": "1"
    },
    "android": {
      "package": "com.yourcompany.pokergpt",
      "versionCode": 1
    }
  }
}
```

## 🎁 Features Ready for Extension

### Paid Plan Integration
Storage service already handles tier management:
```typescript
await setUserTier('paid');  // Unlock unlimited history
```

Add payment provider (RevenueCat, Stripe):
```typescript
// In app/index.tsx, add upgrade button when tier === 'free'
<TouchableOpacity onPress={handleUpgrade}>
  <Text>Upgrade to Pro</Text>
</TouchableOpacity>
```

### Hand History Screen
Create `app/history.tsx`:
```typescript
const hands = await getHandHistory();
// Render FlatList of past analyses
// Tap to navigate to /analysis?handId=X
```

### Share Analysis
Add share button to `FullResultCard`:
```typescript
import { Share } from 'react-native';

const shareAnalysis = async () => {
  await Share.share({
    message: `PokerGPT Analysis: ${analysis.recommendedAction}`,
  });
};
```

## 🐛 Debugging

### Enable Verbose Logging
All services include console.log statements:
```typescript
console.log('Hand stored successfully');
console.error('Error parsing hand:', error);
```

### Check Storage
```typescript
import { getHandHistory } from '@/services/storageService';
const hands = await getHandHistory();
console.log('Stored hands:', hands);
```

### Test AI Responses
```typescript
import { parseHandWithAI } from '@/services/aiService';
const result = await parseHandWithAI([], "I had AK on the button...");
console.log('Parsed:', result);
```

## 📚 Tech Stack

- **Framework**: React Native + Expo SDK 54
- **Routing**: Expo Router (file-based)
- **State**: React Query + Context (create-context-hook)
- **Storage**: AsyncStorage
- **AI**: Rork AI Toolkit (generateText, generateObject)
- **Voice**: expo-av (mobile), Web Audio API (web)
- **Styling**: React Native StyleSheet (typed)
- **TypeScript**: Strict mode enabled

## ⚡ Performance

- Lazy loading of analysis data
- Memoized context values
- Optimized FlatList rendering
- No unnecessary re-renders (proper deps arrays)
- AI streaming for fast perceived performance

## 🔒 Privacy

- All data stored locally (AsyncStorage)
- No user accounts required
- Voice transcriptions happen server-side (toolkit.rork.com)
- Hand histories never leave device unless explicitly shared

## 🎯 Next Steps

1. **Test with real poker hands**: Try various narrative styles
2. **Tune AI prompts**: Adjust in `services/aiService.ts` for accuracy
3. **Add analytics**: Track hand count, analysis requests
4. **Implement paywall**: Gate unlimited history behind subscription
5. **Add hand import**: Support PokerStars/Ignition hand histories
6. **Social features**: Share hands, compare with friends

---

Built with ❤️ for the poker community.

For questions or support, refer to inline code comments or open an issue.
