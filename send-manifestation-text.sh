#!/bin/bash

# Dynamic Manifestation Voice Sender
# Uses existing TTS infrastructure

TELEGRAM_GROUP="-5297940191"
WORKSPACE="/root/.openclaw/workspace/neural-nexus"

# Get random reminder text from rotator
cd "$WORKSPACE"
REMINDER_TEXT=$(node -e "
const rotator = require('./manifestation-rotator');
const r = rotator.getReminder();
console.log(r.text);
")

# Send text message
openclaw message send \
  --target "$TELEGRAM_GROUP" \
  --message "🎯 **Manifestation Reminder**

$REMINDER_TEXT

_Feel it real. It's done._"

# Log
logger "[Manifestation] Sent reminder to $TELEGRAM_GROUP"
