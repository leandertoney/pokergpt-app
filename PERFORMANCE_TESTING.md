# Performance Testing & Edge Cases Report
**Date**: 2026-04-14
**Issue**: User reported latency issues; 1 churned subscription out of 6 total purchases

## 🔧 Critical Fixes Implemented

### 1. Timeout Protection Added
All API calls now have timeout protection using the `withTimeout` utility to prevent indefinite hangs:

| Function | File | Timeout | Status |
|----------|------|---------|--------|
| `parseHandWithAI` | `services/supabaseAI.ts:37` | 15s | ✅ Fixed |
| `analyzeHand` | `services/supabaseAI.ts:77` | 20s | ✅ Fixed |
| `conversationalChat` | `services/supabaseAI.ts:122` | 18s | ✅ Fixed |
| `generateText` | `services/supabaseAI.ts:170` | 18s | ✅ Fixed |
| `transcribeWithWhisper` | `hooks/useVoiceInput.ts:333` | 15s | ✅ Fixed |
| `generateOpenAISpeech` | `services/ttsService.ts:38` | 15s | ✅ Fixed |

### 2. Performance Logging Added
All API calls now log performance metrics:
- `[PERF] functionName completed in XXXms` - Success case
- `[PERF] functionName failed after XXXms: error` - Failure case

**Benefit**: Can now track actual response times in production to identify bottlenecks.

---

## 🧪 Critical Edge Cases to Test

### A. Hand Analysis Edge Cases

#### 1. Empty or Invalid Input
```typescript
// Test cases:
- Empty string: ""
- Only whitespace: "   "
- Invalid poker terms: "I had a great time at the table"
- Missing critical info: "I had pocket aces" (no action, no position)
- Malformed hand notation: "AsKd9h" (should be "As Kd")
```

**Expected Behavior**:
- Should timeout after 15-20s max
- Should return graceful error message
- Should not crash the app

#### 2. Very Long Narratives
```typescript
// Test a 1000+ word hand narrative
const longNarrative = "I was playing 1/2 at the local casino..." // (very long story)
```

**Expected Behavior**:
- Should timeout if too long (20s)
- May hit token limits - needs graceful handling

#### 3. Multiple Hands in One Input
```typescript
const multipleHands = "First hand I had AA and raised, second hand I had KK..."
```

**Expected Behavior**:
- Should parse first hand only
- Should not get confused

---

### B. Chat/Conversation Edge Cases

#### 1. Empty Messages
```typescript
await conversationalChat([], {})
```

**Expected Behavior**:
- Should return fallback response
- Should not crash

#### 2. Very Long Chat History
```typescript
// 50+ message conversation
const longHistory = Array(50).fill({
  role: 'user',
  content: 'Tell me about this hand...'
})
```

**Expected Behavior**:
- Should timeout after 18s
- May need to truncate history (currently takes last 6 messages)

#### 3. Special Characters & Emojis
```typescript
const message = "I had 🃏🃏 and villain went all in 💰💰💰"
```

**Expected Behavior**:
- Should handle gracefully
- Emojis may confuse AI - test behavior

---

### C. Voice Input Edge Cases

#### 1. Very Short Audio (< 1 second)
```typescript
// User taps mic and immediately stops
```

**Expected Behavior**:
- Should handle gracefully
- May return empty transcription - needs fallback

#### 2. Background Noise
```typescript
// Test in noisy environment
// Test with music playing
```

**Expected Behavior**:
- Whisper should still transcribe
- May return gibberish - needs validation

#### 3. Long Recording (> 30 seconds)
```typescript
// User forgets to stop recording
```

**Expected Behavior**:
- Should transcribe successfully
- May take longer - needs timeout (15s)
- Large file upload time

#### 4. No Audio Permissions
```typescript
// User denies microphone access
```

**Expected Behavior**:
- Should show helpful error message
- Should direct to Settings
- Currently handled at line 176 in useVoiceInput.ts

---

### D. Offline/Network Failure Scenarios

#### 1. Complete Network Loss
```typescript
// Turn off WiFi and cellular
// Try to analyze hand
```

**Expected Behavior**:
- Should timeout quickly (15-20s)
- Should show "No internet connection" error
- Should not lose user input

#### 2. Slow Network (Edge/2G)
```typescript
// Use network throttling in Chrome DevTools
// Or test on actual slow network
```

**Expected Behavior**:
- Should complete within timeout limits
- User should see loading indicator
- May timeout - needs retry option

#### 3. Intermittent Connection
```typescript
// Network cuts out mid-request
```

**Expected Behavior**:
- Fetch will fail
- Should timeout if hanging
- Should show error message

---

### E. Subscription/Paywall Edge Cases

#### 1. Free User Limits
```typescript
// Test as free user
// Try to analyze 10+ hands per day
```

**Expected Behavior**:
- Should show paywall
- Should track usage correctly

#### 2. Subscription Status Check Failures
```typescript
// RevenueCat API down
// Network error during status check
```

**Expected Behavior**:
- Should gracefully handle (currently has 5s timeout in onboarding)
- Should not block app functionality

#### 3. Purchase Restoration
```typescript
// Test "Restore Purchases" button
// Test with no purchases
// Test with expired subscription
```

**Expected Behavior**:
- Should verify with RevenueCat
- Should handle "no purchases" gracefully

---

## 📊 Performance Benchmarks to Monitor

### Target Response Times (90th percentile)
Based on typical OpenAI API performance:

| Operation | Target | Warning | Critical |
|-----------|--------|---------|----------|
| Hand parsing | < 3s | 5-10s | > 10s |
| Hand analysis | < 5s | 10-15s | > 15s |
| Chat response | < 4s | 8-12s | > 12s |
| Voice transcription | < 2s | 5-10s | > 10s |
| TTS generation | < 3s | 8-12s | > 12s |

### How to Monitor
1. Check console logs for `[PERF]` messages
2. Look for patterns in slow responses
3. Monitor timeout errors

Example console output:
```
[PERF] analyzeHand completed in 4532ms  ✅ Good
[PERF] conversationalChat completed in 12455ms  ⚠️ Slow
[PERF] Whisper transcription failed after 15001ms: timeout  ❌ Critical
```

---

## 🐛 Known Issues to Watch

### 1. GPT-4o Latency
- **Issue**: GPT-4o can be slow during peak times
- **Mitigation**: 15-20s timeouts prevent infinite hangs
- **Future Fix**: Consider caching common responses or using streaming

### 2. Large System Prompts
- **Issue**: `conversationalChat` uses 188-line system prompt (line 134-187 in `supabase/functions/ai/index.ts`)
- **Impact**: Increases token usage and latency
- **Future Fix**: Consider shorter, more focused prompts

### 3. No Retry Logic
- **Issue**: Failed requests don't automatically retry
- **Impact**: Transient network errors cause immediate failure
- **Future Fix**: Implement exponential backoff retry (max 2-3 attempts)

---

## ✅ Testing Checklist

Run through these scenarios before release:

### Core Flows
- [ ] Analyze a hand from scratch (new user)
- [ ] Continue a chat conversation (5+ messages)
- [ ] Use voice input for hand analysis
- [ ] Complete daily review flow
- [ ] Create and view a session

### Edge Cases
- [ ] Try to analyze empty text
- [ ] Try very long hand narrative (500+ words)
- [ ] Turn off internet mid-analysis
- [ ] Deny microphone permissions
- [ ] Test on slow 3G network
- [ ] Restore purchases with no subscription

### Performance
- [ ] Check all operations complete within timeout limits
- [ ] Verify loading states show correctly
- [ ] Verify error messages are helpful
- [ ] Check console for `[PERF]` logs

### Subscription
- [ ] Free user can analyze hands (limited)
- [ ] Paywall shows at appropriate times
- [ ] Subscription purchase works
- [ ] Subscription features unlock correctly

---

## 🔮 Future Performance Improvements

### Short-term (Next Release)
1. **Add retry logic** with exponential backoff
2. **Implement response caching** for common questions
3. **Add network status detection** to fail fast offline
4. **Show estimated time remaining** during long operations

### Medium-term
1. **Use GPT-4o-mini** for simple tasks (faster, cheaper)
2. **Implement streaming responses** for chat (perceived latency improvement)
3. **Prefetch common responses** in background
4. **Add offline mode** with limited functionality

### Long-term
1. **Consider edge caching** via Cloudflare or similar
2. **Implement request queuing** for batch processing
3. **Add telemetry dashboard** to monitor real-world performance
4. **A/B test different timeout values** to find optimal balance

---

## 📝 Notes

- All timeout values can be adjusted if needed (in code comments)
- Performance logs will help identify real-world bottlenecks
- User feedback is critical - monitor App Store reviews
- Consider adding in-app feedback mechanism for latency issues
