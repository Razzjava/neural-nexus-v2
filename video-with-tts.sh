#!/bin/bash

# Video Generator with Piper TTS Voiceover
# Generates videos with AI-generated speech

set -e

# Configuration
QUOTE="${1:-Your assumption, though false, if persisted in, will harden into fact.}"
AUTHOR="${2:-Neville Goddard}"
OUTPUT_NAME="${3:-manifestation-quote}"
FORMAT="${4:-long}"  # long (16:9) or short (9:16)
PIPER_PATH="/tmp/piper/piper/piper"
PIPER_MODEL="/tmp/piper/en_US-lessac-medium.onnx"
REMOTION_DIR="/root/.openclaw/workspace/remotion"
OUTPUT_DIR="/root/.openclaw/workspace/agents-output/videos"

# Ensure output directory exists
mkdir -p "$OUTPUT_DIR"

echo "🎬 Generating video with voiceover..."
echo "Quote: $QUOTE"
echo "Format: $FORMAT"

# Step 1: Generate audio with Piper TTS
echo "🎙️ Generating voiceover..."
echo "$QUOTE" | "$PIPER_PATH" \
  --model "$PIPER_MODEL" \
  --output_file "/tmp/${OUTPUT_NAME}.wav" \
  --sentence-silence 0.2

# Convert to MP3 for smaller size
ffmpeg -i "/tmp/${OUTPUT_NAME}.wav" -codec:a libmp3lame -qscale:a 2 "/tmp/${OUTPUT_NAME}.mp3" -y 2>/dev/null

# Copy audio to Remotion public folder
cp "/tmp/${OUTPUT_NAME}.mp3" "$REMOTION_DIR/public/"

echo "✅ Audio generated: /tmp/${OUTPUT_NAME}.mp3"

# Step 2: Calculate video duration based on audio + padding
AUDIO_DURATION=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "/tmp/${OUTPUT_NAME}.mp3" 2>/dev/null || echo "10")
DURATION_SECS=$(echo "$AUDIO_DURATION + 3" | bc)
DURATION_FRAMES=$(echo "$DURATION_SECS * 30" | bc | cut -d. -f1)

echo "📊 Video duration: ${DURATION_SECS}s (${DURATION_FRAMES} frames)"

# Step 3: Update composition dynamically (create temp Root file)
cat > "$REMOTION_DIR/RootWithAudio.tsx" << EOF
import { Composition, staticFile, registerRoot } from 'remotion';
import { QuoteVideoWithAudio, QuoteVideoWithAudioShort } from './QuoteVideoWithAudio';

const QuoteWithAudio = () => (
  <QuoteVideoWithAudio
    quote="${QUOTE}"
    author="${AUTHOR}"
    audioFile="${OUTPUT_NAME}.mp3"
    backgroundColor="#0a0a0a"
    textColor="#00d4ff"
    isShort=${FORMAT == "short" ? "true" : "false"}
  />
);

const RemotionRoot = () => (
  <Composition
    id="quote-with-audio"
    component={QuoteWithAudio}
    durationInFrames={${DURATION_FRAMES}}
    fps={30}
    width=${FORMAT == "short" ? "1080" : "1920"}
    height=${FORMAT == "short" ? "1920" : "1080"}
  />
);

registerRoot(RemotionRoot);
EOF

# Step 4: Render video
echo "🎥 Rendering video..."
cd "$REMOTION_DIR"

npx remotion render RootWithAudio.tsx quote-with-audio \
  --output="$OUTPUT_DIR/${OUTPUT_NAME}-${FORMAT}.mp4" \
  --log=error

echo "✅ Video rendered: $OUTPUT_DIR/${OUTPUT_NAME}-${FORMAT}.mp4"

# Cleanup
rm -f "/tmp/${OUTPUT_NAME}.wav" "/tmp/${OUTPUT_NAME}.mp3"

echo "🎬 Done! Video with voiceover ready."
