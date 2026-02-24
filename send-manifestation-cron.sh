#!/bin/bash

# Send Manifestation Voice Reminder
# FIXED: Uses Telegram Bot API directly for proper voice messages

set -e

# Redirect all output to log for debugging
exec 1>>/tmp/manifestation-voice.log 2>&1

echo "[$(date '+%H:%M:%S')] [ManifestationVoice] === CRON START ==="

TELEGRAM_GROUP="-5297940191"
WORKSPACE="/root/.openclaw/workspace"
NEURAL_DIR="$WORKSPACE/neural-nexus"
PIPER_MODEL="/tmp/piper/piper/en_US-lessac-medium.onnx"

# Logging function (define FIRST)
log() {
    echo "[$(date '+%H:%M:%S')] [ManifestationVoice] $1" | tee -a /tmp/manifestation-voice.log
}

# Get bot token from config (use absolute path for cron)
BOT_TOKEN=$(grep -o '"botToken": "[^"]*"' /root/.openclaw/openclaw.json 2>/dev/null | cut -d'"' -f4 || echo "")

# Debug logging
log "Bot token length: ${#BOT_TOKEN}"
log "Home directory: $HOME"
log "Current directory: $(pwd)"

log "Starting voice manifestation..."

# Get random reminder text
cd "$NEURAL_DIR"
REMINDER_TEXT=$(node -e "
const rotator = require('./manifestation-rotator');
const r = rotator.getReminder();
console.log(r.text);
")

log "Reminder: $REMINDER_TEXT"

# Generate voice with piper
log "Generating voice..."
if echo "$REMINDER_TEXT" | piper --model "$PIPER_MODEL" --output_file "$WORKSPACE/manifestation-temp.wav" 2>/dev/null; then
    log "Voice generated, converting to OGG..."
    
    # Convert to OGG/OPUS for Telegram voice
    if ffmpeg -y -i "$WORKSPACE/manifestation-temp.wav" -c:a libopus -b:a 32k "$WORKSPACE/manifestation-voice.ogg" 2>/dev/null; then
        log "Conversion successful, sending voice via Telegram API..."
        
        # Send voice using Telegram Bot API directly
        if [[ -n "$BOT_TOKEN" ]]; then
            log "Using Telegram Bot API..."
            API_RESPONSE=$(curl -s -X POST \
                "https://api.telegram.org/bot${BOT_TOKEN}/sendVoice" \
                -F "chat_id=${TELEGRAM_GROUP}" \
                -F "voice=@${WORKSPACE}/manifestation-voice.ogg" \
                -F "caption=🎯 Manifestation Reminder" 2>&1)
            log "API Response: $API_RESPONSE"
            echo "$API_RESPONSE" | grep -q '"ok":true' && {
                log "Voice sent successfully via Telegram API"
            } || {
                log "Telegram API failed, response above"
            }
        else
            log "No bot token found, cannot send voice"
        fi
        
        rm -f "$WORKSPACE/manifestation-voice.ogg"
    else
        log "FFmpeg conversion failed"
    fi
    
    rm -f "$WORKSPACE/manifestation-temp.wav"
else
    log "Piper voice generation failed"
fi

log "Complete"
echo "[$(date '+%H:%M:%S')] [ManifestationVoice] === CRON END ==="
