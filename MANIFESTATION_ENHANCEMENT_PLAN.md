# Manifestation Agent Enhancement Plan
## Reliable Autonomous Voice Delivery

## Current State Analysis

**Problems:**
1. Voice generation fails intermittently (Piper TTS errors)
2. Telegram API timeouts/rejections
3. No retry logic on failure
4. Manual intervention required when issues occur
5. No verification that messages actually delivered
6. No fallback if primary voice fails

**Goal:** 99.9% delivery success rate with zero manual intervention

---

## Phase 1: Voice Generation Reliability

### 1.1 Multi-Engine TTS Fallback
**Current:** Only Piper TTS
**Enhanced:** Cascade of TTS engines

```javascript
const TTS_ENGINES = [
    { name: 'piper', priority: 1, timeout: 10000 },
    { name: 'espeak', priority: 2, timeout: 5000 },
    { name: 'openai', priority: 3, timeout: 15000 },
    { name: 'elevenlabs', priority: 4, timeout: 20000 }
];

async function generateVoice(text) {
    for (const engine of TTS_ENGINES) {
        try {
            return await generateWithEngine(engine, text);
        } catch (err) {
            logger.warn(`${engine.name} failed, trying next...`);
            continue;
        }
    }
    throw new Error('All TTS engines failed');
}
```

### 1.2 Pre-generated Voice Library
**Cache popular manifestation scripts:**
- Generate 50+ variations upfront
- Store in `/manifestations/voices/`
- Rotate through library to avoid repetition
- Regenerate cache weekly

```javascript
const VOICE_LIBRARY = {
    'morning_affirmation': ['morning_1.ogg', 'morning_2.ogg', ...],
    'abundance': ['abundance_1.ogg', 'abundance_2.ogg', ...],
    'success': ['success_1.ogg', 'success_2.ogg', ...]
};
```

### 1.3 Voice Quality Validation
**Check generated audio before sending:**
- File size validation (not empty)
- Duration check (5-30 seconds)
- Format validation (OGG/Opus)
- Corruption detection

---

## Phase 2: Telegram Delivery Reliability

### 2.1 Retry with Exponential Backoff
```javascript
async function sendWithRetry(sendFn, maxRetries = 5) {
    for (let i = 0; i < maxRetries; i++) {
        try {
            return await sendFn();
        } catch (err) {
            if (i === maxRetries - 1) throw err;
            
            const delay = Math.min(1000 * Math.pow(2, i), 30000);
            logger.warn(`Retry ${i + 1}/${maxRetries} after ${delay}ms`);
            await sleep(delay);
        }
    }
}
```

### 2.2 Delivery Verification
**Confirm message actually sent:**
```javascript
async function sendAndVerify(message) {
    const result = await sendVoice(message);
    
    // Poll for message in group
    const verified = await pollForMessage(result.message_id, 30000);
    
    if (!verified) {
        throw new Error('Message not confirmed in group');
    }
    
    return result;
}
```

### 2.3 Rate Limit Handling
**Respect Telegram limits:**
- 20 messages/minute to same group
- 1 message/second globally
- Queue messages if limit reached
- Smooth out burst sends

---

## Phase 3: Content Intelligence

### 3.1 Dynamic Script Generation
**Current:** Static rotation
**Enhanced:** AI-generated personalized scripts

```javascript
async function generateManifestationScript() {
    const context = {
        timeOfDay: getTimeOfDay(),
        dayOfWeek: getDayOfWeek(),
        recentTopics: await getRecentTopics(),
        userGoals: await getUserGoals()
    };
    
    const prompt = `Generate a 30-second manifestation affirmation for ${context.timeOfDay}.
    Theme: ${selectTheme(context)}
    Tone: uplifting, empowering, specific
    Length: 40-60 words`;
    
    return await ai.generate(prompt);
}
```

### 3.2 Theme Rotation System
**Avoid repetition:**
- Track last 30 days of themes
- Weight toward underused themes
- Seasonal adjustments
- User feedback integration

**Themes:**
- Abundance & Wealth
- Health & Vitality  
- Success & Achievement
- Love & Relationships
- Confidence & Power
- Gratitude & Joy
- Focus & Clarity

### 3.3 Personalization Engine
**Learn from engagement:**
- Track which messages get reactions
- A/B test script variations
- Adapt to user response patterns
- Time-optimized delivery

---

## Phase 4: Monitoring & Self-Healing

### 4.1 Delivery Metrics
**Track everything:**
```javascript
const metrics = {
    totalAttempts: counter(),
    successfulDeliveries: counter(),
    failedDeliveries: counter(),
    retryCount: histogram(),
    deliveryLatency: histogram(),
    ttsEngineUsage: counter(['engine']),
    failureReasons: counter(['reason'])
};
```

### 4.2 Health Checks
**Proactive monitoring:**
- Test TTS engines every hour
- Verify Telegram API connectivity
- Check voice file integrity
- Validate group membership

### 4.3 Auto-Recovery
**Fix common issues:**
```javascript
async function selfHeal() {
    // Regenerate corrupted voice files
    await validateVoiceCache();
    
    // Refresh Telegram bot token if needed
    await verifyBotAuth();
    
    // Clear stuck message queue
    await flushMessageQueue();
    
    // Restart TTS engines
    await restartTTSServices();
}
```

---

## Phase 5: Fallback Mechanisms

### 5.1 Multi-Channel Fallback
**If Telegram fails:**
1. Try Telegram again (different API method)
2. Send to backup Telegram group
3. Send as text message (if voice fails)
4. Email notification
5. Log for manual review

### 5.2 Local Playback Fallback
**If remote delivery fails:**
- Play through local speakers
- Log for retry later
- Queue for next scheduled time

### 5.3 Human Escalation
**Last resort:**
- After 5 failed attempts
- Send alert to admin
- Include diagnostic info
- Pause until resolved

---

## Phase 6: Enhanced Features

### 6.1 Interactive Manifestations
**User engagement:**
- Reply with emoji reactions
- Request specific themes
- Schedule custom times
- Pause/resume subscriptions

### 6.2 Group Energy Sync
**Collective manifestation:**
- Synchronized delivery to all members
- Group intention setting
- Shared visualization moments
- Collective energy tracking

### 6.3 Progress Tracking
**User journey:**
- Days of consistency
- Favorite themes
- Mood correlation
- Goal achievement tracking

---

## Implementation Priority

**P0 (Critical - Week 1):**
1. Multi-engine TTS fallback
2. Exponential backoff retry
3. Delivery verification
4. Basic metrics

**P1 (High - Week 2):**
5. Pre-generated voice library
6. Rate limit handling
7. Auto-recovery
8. Health checks

**P2 (Medium - Week 3-4):**
9. Dynamic script generation
10. Personalization engine
11. Interactive features
12. Progress tracking

---

## Success Metrics

| Metric | Current | Target |
|--------|---------|--------|
| Delivery success rate | ~85% | 99.9% |
| Manual interventions/week | 3-5 | 0 |
| Avg retry count | 0 | <1.5 |
| Voice generation time | 5-15s | <3s |
| User engagement | ~20% | >50% |

---

## Technical Architecture

```
Manifestation Agent v2
├── TTS Manager
│   ├── Piper (primary)
│   ├── Espeak (fallback)
│   ├── OpenAI (premium)
│   └── Quality Validator
├── Voice Library
│   ├── Pre-generated cache
│   ├── Theme rotation
│   └── Regeneration queue
├── Delivery Manager
│   ├── Retry with backoff
│   ├── Rate limiter
│   ├── Delivery verifier
│   └── Multi-channel fallback
├── Content Engine
│   ├── Script generator
│   ├── Theme selector
│   └── Personalization
└── Monitor
    ├── Metrics collector
    ├── Health checker
    └── Self-healer
```

---

## Files to Create

1. `manifestation-v2.js` - Enhanced main agent
2. `lib/tts-manager.js` - Multi-engine TTS
3. `lib/voice-library.js` - Cached voice management
4. `lib/delivery-manager.js` - Reliable delivery
5. `lib/content-engine.js` - Dynamic scripts
6. `scripts/generate-voice-cache.js` - Pre-generation
7. `test/manifestation-test.js` - Delivery testing
