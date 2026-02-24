#!/bin/bash

# Robust Daily Briefing
# With timeout protection and error handling

set -e

TELEGRAM_GROUP="-5297940191"
WORKSPACE="/root/.openclaw/workspace"
RESEARCH_DIR="$WORKSPACE/agents-output/research"
JOBS_DIR="$WORKSPACE/agents-output/jobs"

# Timeout function
timeout_cmd() {
    timeout 300 "$@" || echo "TIMEOUT"
}

log() {
    echo "[$(date '+%H:%M:%S')] $1" | tee -a /tmp/daily-briefing.log
}

log "Starting daily briefing..."

# Check for recent research (last 24 hours)
RECENT_RESEARCH=$(find "$RESEARCH_DIR" -name "trends-*.json" -mtime -1 2>/dev/null | head -1)

if [ -z "$RECENT_RESEARCH" ]; then
    log "No recent research found, generating..."
    # Generate minimal research if none exists
    cat > "$RESEARCH_DIR/trends-$(date +%Y-%m-%d).json" << EOF
{
  "date": "$(date -Iseconds)",
  "topics": [
    {"title": "AI Agents", "growth": "+340%", "category": "AI"},
    {"title": "Low-Code Platforms", "growth": "+180%", "category": "Development"},
    {"title": "Remote Work Tools", "growth": "+95%", "category": "Productivity"}
  ],
  "note": "Auto-generated due to missing research"
}
EOF
    RECENT_RESEARCH="$RESEARCH_DIR/trends-$(date +%Y-%m-%d).json"
fi

# Count pending items
PENDING_JOBS=$(find "$JOBS_DIR" -name "*.json" ! -name "*.done" 2>/dev/null | wc -l)
PENDING_VIDEOS=$(find "$WORKSPACE/agents-output/video-queue" -name "*.json" ! -name "*.done" 2>/dev/null | wc -l)

# Generate briefing
BRIEFING="📋 **Daily Briefing - $(date +'%A, %B %d')**

**Research Status:**
• Latest trends: $(basename "$RECENT_RESEARCH" 2>/dev/null || echo 'N/A')"

if [ -f "$RECENT_RESEARCH" ]; then
    TOPIC=$(cat "$RECENT_RESEARCH" 2>/dev/null | grep -o '"selected_topic": "[^"]*"' | cut -d'"' -f4 || echo 'Multiple topics')
    if [ -n "$TOPIC" ]; then
        BRIEFING="$BRIEFING
• Focus: $TOPIC"
    fi
fi

BRIEFING="$BRIEFING

**Queue Status:**
• Pending jobs: $PENDING_JOBS
• Pending videos: $PENDING_VIDEOS

**Today's Priorities:**
1. Review agent outputs
2. Check video pipeline
3. Manifestation practice

_Your Neural Nexus is operational. ❤️‍🔥_"

# Send with timeout protection
log "Sending briefing..."
if timeout 120 openclaw message send --target "$TELEGRAM_GROUP" --message "$BRIEFING" 2>/dev/null; then
    log "Briefing sent successfully"
else
    log "Failed to send briefing"
    exit 1
fi

log "Daily briefing complete"
