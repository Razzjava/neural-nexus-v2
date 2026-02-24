#!/bin/bash

# Daily Performance Report
# Generates and sends performance insights

WORKSPACE="/root/.openclaw/workspace/neural-nexus"
TELEGRAM_GROUP="-5297940191"

cd "$WORKSPACE"

# Generate dashboard
DASHBOARD=$(node performance-tracker.js dashboard 2>/dev/null)
SUGGESTIONS=$(node performance-tracker.js suggestions 2>/dev/null)

# Extract key metrics
TOTAL_RUNS=$(echo "$DASHBOARD" | grep -o '"totalRuns": [0-9]*' | grep -o '[0-9]*')
SUCCESS_RATE=$(echo "$DASHBOARD" | grep -o '"overallSuccess": "[^"]*"' | cut -d'"' -f4)
AVG_QUALITY=$(echo "$DASHBOARD" | grep -o '"avgQuality": "[^"]*"' | cut -d'"' -f4)

# Send report
openclaw message send \
  --target "$TELEGRAM_GROUP" \
  --message "📊 **Daily Performance Report**

**Last 7 Days:**
• Total Runs: $TOTAL_RUNS
• Success Rate: $SUCCESS_RATE
• Avg Quality: $AVG_QUALITY

**Improvement Opportunities:**
$(echo "$SUGGESTIONS" | grep -o '"agent": "[^"]*"' | cut -d'"' -f4 | while read agent; do
  echo "• $agent needs attention"
done)

_Full dashboard: agents-output/performance/dashboard.json_"

logger "[Performance] Daily report sent"
