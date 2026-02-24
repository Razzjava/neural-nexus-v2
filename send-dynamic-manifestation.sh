#!/bin/bash

# Dynamic Manifestation Voice Sender
# Called by cron hourly - sends varied manifestation reminders

TELEGRAM_GROUP="-5297940191"
PIPER_PATH="/tmp/piper/piper/piper"
PIPER_MODEL="/tmp/piper/en_US-lessac-medium.onnx"
WORKSPACE="/root/.openclaw/workspace/neural-nexus"
TEMP_DIR="/tmp/manifestation-reminders"

# Ensure temp directory exists
mkdir -p "$TEMP_DIR"

# Get random reminder text from rotator
cd "$WORKSPACE"
REMINDER_TEXT=$(node -e "
const rotator = require('./manifestation-rotator');
const r = rotator.getReminder();
console.log(r.text);
")

# Generate unique filename
TIMESTAMP=$(date +%s)
AUDIO_FILE="$TEMP_DIR/reminder-$TIMESTAMP.wav"
MP3_FILE="$TEMP_DIR/reminder-$TIMESTAMP.mp3"

# Generate voice with Piper
echo "$REMINDER_TEXT" | "$PIPER_PATH" \
  --model "$PIPER_MODEL" \
  --output_file "$AUDIO_FILE" \
  --sentence-silence 0.3 2>/dev/null

# Convert to MP3 for smaller size
ffmpeg -i "$AUDIO_FILE" -codec:a libmp3lame -qscale:a 2 "$MP3_FILE" -y 2>/dev/null

# Send voice message via OpenClaw
openclaw message send \
  --to "$TELEGRAM_GROUP" \
  --voice "$MP3_FILE" \
  --caption "🎯 Manifestation Reminder" 2>/dev/null

# Cleanup
rm -f "$AUDIO_FILE" "$MP3_FILE"

# Log
logger "[Manifestation] Sent: $(echo $REMINDER_TEXT | cut -c1-50)..."
