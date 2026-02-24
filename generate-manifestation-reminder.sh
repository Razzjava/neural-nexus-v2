#!/bin/bash

# Dynamic Manifestation Voice Reminder
# Uses rotating reminder library for variety

PIPER_PATH="/tmp/piper/piper/piper"
PIPER_MODEL="/tmp/piper/en_US-lessac-medium.onnx"
OUTPUT_DIR="/tmp/manifestation-reminders"

# Ensure output directory exists
mkdir -p "$OUTPUT_DIR"

# Get random reminder from rotator
cd /root/.openclaw/workspace/neural-nexus
REMINDER_TEXT=$(node -e "
const rotator = require('./manifestation-rotator');
const r = rotator.getReminder();
console.log(r.text);
")

# Generate timestamp
TIMESTAMP=$(date +%s)
AUDIO_FILE="$OUTPUT_DIR/reminder-$TIMESTAMP.wav"
MP3_FILE="$OUTPUT_DIR/reminder-$TIMESTAMP.mp3"

echo "🎯 Generating manifestation reminder..."
echo "Text: $REMINDER_TEXT"

# Generate with Piper TTS
echo "$REMINDER_TEXT" | "$PIPER_PATH" \
  --model "$PIPER_MODEL" \
  --output_file "$AUDIO_FILE" \
  --sentence-silence 0.3

# Convert to MP3
ffmpeg -i "$AUDIO_FILE" -codec:a libmp3lame -qscale:a 2 "$MP3_FILE" -y 2>/dev/null

# Output the file path for the calling script
echo "$MP3_FILE"
echo "$REMINDER_TEXT"

# Cleanup wav
rm -f "$AUDIO_FILE"
