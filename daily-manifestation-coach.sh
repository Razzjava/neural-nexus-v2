#!/bin/bash

# Daily Manifestation Coach Session
# FIXED: Proper voice message delivery

set -e

WORKSPACE="/root/.openclaw/workspace"
COACH_DIR="/root/.openclaw/skills/master-manifestation-coach"
TELEGRAM_GROUP="-5297940191"
PIPER_MODEL="/tmp/piper/piper/en_US-lessac-medium.onnx"

log() {
    echo "[$(date '+%H:%M:%S')] [ManifestationCoach] $1" | tee -a /tmp/manifestation-coach.log
}

log "Starting daily manifestation session..."

# Run the coach
cd "$COACH_DIR"
OUTPUT=$(node coach.js daily 2>&1)

# Send text to Telegram
log "Sending text session..."
if timeout 30 openclaw message send --target "$TELEGRAM_GROUP" --message "$OUTPUT" 2>/dev/null; then
    log "Text sent successfully"
else
    log "Failed to send text"
fi

# Extract and send voice spell
log "Extracting voice spell..."
VOICE_SPELL=$(echo "$OUTPUT" | sed -n '/YOUR DAILY SPELL/,/━━━/p' | tail -n +2 | head -n -1 | tr '\n' ' ' | sed 's/  */ /g' | xargs)

if [[ -n "$VOICE_SPELL" ]]; then
    log "Generating voice: $VOICE_SPELL"
    
    # Generate WAV with piper
    echo "$VOICE_SPELL" | piper --model "$PIPER_MODEL" --output_file "$WORKSPACE/spell-temp.wav" 2>/dev/null || {
        log "Piper failed, trying alternative..."
        # Fallback: use tts tool to generate
        echo "$VOICE_SPELL" > "$WORKSPACE/spell-text.txt"
    }
    
    # Convert to OGG for Telegram voice
    if [[ -f "$WORKSPACE/spell-temp.wav" ]]; then
        log "Converting to voice format..."
        ffmpeg -y -i "$WORKSPACE/spell-temp.wav" -c:a libopus -b:a 32k "$WORKSPACE/spell-voice.ogg" 2>/dev/null || {
            log "FFmpeg failed"
            rm -f "$WORKSPACE/spell-temp.wav"
            exit 0
        }
        rm -f "$WORKSPACE/spell-temp.wav"
        
        # Send as voice message
        if [[ -f "$WORKSPACE/spell-voice.ogg" ]]; then
            log "Sending voice message..."
            if timeout 30 openclaw message send --target "$TELEGRAM_GROUP" --asVoice --media "$WORKSPACE/spell-voice.ogg" 2>/dev/null; then
                log "Voice sent successfully"
            else
                log "Failed to send voice, trying without asVoice..."
                timeout 30 openclaw message send --target "$TELEGRAM_GROUP" --media "$WORKSPACE/spell-voice.ogg" 2>/dev/null || true
            fi
            rm -f "$WORKSPACE/spell-voice.ogg"
        fi
    fi
else
    log "No voice spell found in output"
fi

log "Daily session complete"
