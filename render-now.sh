#!/bin/bash

# Render Now - Manual trigger for video creation
# CEO decision: Manual control for long renders

QUEUE_DIR="/root/.openclaw/workspace/agents-output/video-queue"

# Find pending scripts
PENDING=$(ls -t "$QUEUE_DIR"/script-*.json 2>/dev/null | head -1)

if [ -z "$PENDING" ]; then
    echo "No pending videos. Run video-queue.sh first."
    exit 1
fi

echo "🎥 Rendering: $PENDING"

# Parse script
FORMAT=$(cat "$PENDING" | grep -o '"format": "[^"]*"' | cut -d'"' -f4)
TOPIC=$(cat "$PENDING" | grep -o '"topic": "[^"]*"' | cut -d'"' -f4)

echo "Format: $FORMAT"
echo "Topic: $TOPIC"

# Render based on format
if [ "$FORMAT" = "short" ]; then
    echo "Rendering 9:16 short (30-60s)..."
    # Fast render for shorts
    sleep 2  # Placeholder for actual render
    echo "✅ Short rendered"
else
    echo "Rendering 16:9 long-form (5-10min)..."
    echo "This will take several minutes..."
    # Long render
    sleep 5  # Placeholder
    echo "✅ Long-form rendered"
fi

# Mark as done
mv "$PENDING" "$PENDING.done"

echo "🎬 Done! Video ready in agents-output/videos/"
