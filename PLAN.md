# PokerGPT UX Restructure Plan

## Overview
Transform the app from a direct chat interface to a hand history-centric experience with natural language search and real-time voice input.

## Architecture Decision
- **Text Analysis**: Claude (Anthropic) - keep current implementation
- **Real-Time Voice**: OpenAI Realtime API - natural interruption-capable voice conversations

---

## Phase 1: Home Screen Restructure

### 1.1 Create New Home Screen (`app/index.tsx`)
Convert from direct chat to hand history list:
- **Header**: "PokerGPT" title + settings icon
- **Empty State**: Show when no hands yet ("Start analyzing your first hand")
- **Hand History List**: FlatList of analyzed hands
  - Each card shows: hero hand, position, recommended action, date
  - Tap to view full analysis (existing FullResultCard)
- **Search Bar**: Fixed at bottom, above FAB
- **Compose FAB**: Floating action button (bottom-right) to start new hand

### 1.2 Create HandHistoryCard Component
New component for displaying hand summary in list:
```
- Hero hand (e.g., "A♠ K♥")
- Position + Action (e.g., "BTN vs BB • Raise")
- Brief recommendation preview
- Timestamp (relative: "2 hours ago")
- Confidence indicator
```

### 1.3 Create SearchBar Component
Natural language search at bottom of home:
- Placeholder: "Search your hands..."
- AI-powered semantic search (e.g., "that hand where I got sucked out with aces")
- Uses Claude to interpret query and filter results

---

## Phase 2: New Chat Screen

### 2.1 Create Chat Screen (`app/chat.tsx`)
New screen for hand input conversation:
- **Opening Message**: "Tell me about your hand." (short, casual)
- **Input Options**:
  - Text input (existing InputBar)
  - Voice button (new - triggers OpenAI Realtime)
- **Conversation Flow**: Same as current usePokerFlow logic
- **On Complete**: Navigate back to home, show new hand at top

### 2.2 Update AI Personality
Make greetings more casual:
- Current: "Hey! Tell me about a poker hand you played..."
- New: "Tell me about your hand."
- Keep responses knowledgeable but informal

---

## Phase 3: OpenAI Realtime Voice Integration

### 3.1 Setup OpenAI Realtime API
- Install required dependencies (WebSocket, audio handling)
- Create `services/openAIRealtime.ts`:
  - WebSocket connection management
  - Audio streaming (expo-av)
  - Transcription handling
  - Interruption detection

### 3.2 Create VoiceInput Component
- Mic button that starts/stops recording
- Visual feedback during recording (waveform animation)
- Real-time transcription display
- Natural interruption support (both parties can interrupt)

### 3.3 Voice Flow
1. User taps mic → Opens WebSocket to OpenAI Realtime
2. User speaks → Audio streams to OpenAI
3. OpenAI responds with voice + text
4. User can interrupt → Cuts off AI response
5. Transcription feeds into existing parseHand logic

---

## Phase 4: Navigation & Routing

### 4.1 Update `app/_layout.tsx`
Add new routes:
- `index` → Home (hand history)
- `chat` → New hand conversation
- `analysis` → Full analysis view (existing)

### 4.2 Navigation Flow
```
Home (history)
  ├── Tap hand → Analysis screen
  ├── Search → Filtered list
  └── FAB (compose) → Chat screen
                        └── Complete → Back to Home
```

---

## File Changes Summary

### New Files
- `app/chat.tsx` - New hand conversation screen
- `components/HandHistoryCard.tsx` - History list item
- `components/SearchBar.tsx` - AI-powered search
- `components/VoiceInput.tsx` - Realtime voice input
- `services/openAIRealtime.ts` - OpenAI Realtime API service
- `hooks/useHandHistory.ts` - Hand history data hook
- `hooks/useVoiceInput.ts` - Voice input state management

### Modified Files
- `app/index.tsx` - Complete rewrite (chat → history)
- `app/_layout.tsx` - Add chat route
- `hooks/usePokerFlow.ts` - Update greeting message
- `services/supabaseStorage.ts` - Add search function

---

## Implementation Order

1. **Phase 1.1-1.2**: Home screen + HandHistoryCard (foundation)
2. **Phase 2.1-2.2**: Chat screen + personality update (core flow)
3. **Phase 1.3**: SearchBar (enhancement)
4. **Phase 3**: Voice integration (premium feature)

---

## Dependencies to Add
```json
{
  "expo-av": "already installed",
  "openai": "^4.x (for Realtime API)"
}
```

## Environment Variables Needed
```
OPENAI_API_KEY=sk-... (for Realtime API)
```
