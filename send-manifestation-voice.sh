#!/bin/bash

# Dynamic Manifestation Voice Sender
# Uses OpenClaw's built-in TTS

TELEGRAM_GROUP="-5297940191"
WORKSPACE="/root/.openclaw/workspace/neural-nexus"

# Get random reminder text from rotator
cd "$WORKSPACE"
REMINDER_TEXT=$(node -e "
const rotator = require('./manifestation-rotator');
const r = rotator.getReminder();
console.log(r.text);
")

# Send voice message using OpenClaw's TTS capability
# The tts tool will generate and send audio automatically
echo "🎯 Sending voice manifestation reminder..."
echo "Text: $REMINDER_TEXT"

# Use the tts command which handles voice generation and sending
openclaw tts "$REMINDER_TEXT" --target "$TELEGRAM_GROUP"

# Also send text for reference
openclaw message send \
  --target "$TELEGRAM_GROUP" \
  --message "🎯 **Manifestation Reminder** (Voice above ☝️)

$REMINDER_TEXT

_Feel it real. It's done._"

# Log
logger "[Manifestation] Voice reminder sent to $TELEGRAM_GROUP"
