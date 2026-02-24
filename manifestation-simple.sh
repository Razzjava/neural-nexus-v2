#!/bin/bash

# Manifestation Voice Sender - SIMPLE AND RELIABLE

TELEGRAM_GROUP="-5297940191"
NEURAL_DIR="/root/.openclaw/workspace/neural-nexus"
PIPER_MODEL="/tmp/piper/piper/en_US-lessac-medium.onnx"
BOT_TOKEN="8444806500:AAHnJt56zPBeBr1ouJ89CzGjcn2lqDCt58Y"

echo "[$(date)] START" >> /tmp/manifestation-simple.log

# Get reminder
cd "$NEURAL_DIR" || exit 1
TEXT=$(node -e "const r=require('./manifestation-rotator').getReminder();console.log(r.text)")
echo "[$(date)] TEXT: $TEXT" >> /tmp/manifestation-simple.log

# Generate voice
echo "$TEXT" | piper --model "$PIPER_MODEL" --output_file /tmp/mv.wav 2>/dev/null
echo "[$(date)] PIPER DONE" >> /tmp/manifestation-simple.log

# Convert  
ffmpeg -y -i /tmp/mv.wav -c:a libopus -b:a 32k /tmp/mv.ogg 2>/dev/null
echo "[$(date)] FFMPEG DONE" >> /tmp/manifestation-simple.log

# Send
curl -s -X POST "https://api.telegram.org/bot${BOT_TOKEN}/sendVoice" \
    -F "chat_id=${TELEGRAM_GROUP}" \
    -F "voice=@/tmp/mv.ogg" > /tmp/curl-response.json 2>&1

echo "[$(date)] CURL DONE" >> /tmp/manifestation-simple.log
cat /tmp/curl-response.json >> /tmp/manifestation-simple.log

# Cleanup
rm -f /tmp/mv.wav /tmp/mv.ogg /tmp/curl-response.json

echo "[$(date)] END" >> /tmp/manifestation-simple.log
