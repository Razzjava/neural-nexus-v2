#!/bin/bash

# Master Agent Scheduler
# Uses the robust orchestrator for all agent executions

WORKSPACE="/root/.openclaw/workspace/neural-nexus"
TELEGRAM_GROUP="-5297940191"

log() {
    echo "[$(date '+%H:%M:%S')] [MasterScheduler] $1" | tee -a /tmp/master-scheduler.log
}

# Health check first
log "Running health check..."
if ! timeout 300 node "$WORKSPACE/agent-orchestrator.js" health 2>/dev/null; then
    log "Health check failed, notifying..."
    timeout 10 openclaw message send \
        --target "$TELEGRAM_GROUP" \
        --message "⚠️ **System Health Check Failed**\n\nSome services may be unavailable. Check logs at /tmp/master-scheduler.log" 2>/dev/null || true
fi

# Run all agents with the orchestrator
log "Starting agent execution cycle..."

RESULTS=$(timeout 3600 node "$WORKSPACE/agent-orchestrator.js" run-all 2>&1)

# Parse results and notify
SUCCESS_COUNT=$(echo "$RESULTS" | grep -o '"success"' | wc -l)
FAIL_COUNT=$(echo "$RESULTS" | grep -o '"failed"' | wc -l)

log "Results: $SUCCESS_COUNT succeeded, $FAIL_COUNT failed"

if [ "$FAIL_COUNT" -gt 0 ]; then
    FAILED_AGENTS=$(echo "$RESULTS" | grep -o '"[^"]*": "failed"' | cut -d'"' -f2 | tr '\n' ', ')
    timeout 10 openclaw message send \
        --target "$TELEGRAM_GROUP" \
        --message "⚠️ **Agent Cycle Complete**\n\n✅ Success: $SUCCESS_COUNT\n❌ Failed: $FAIL_COUNT\n\nFailed agents: $FAILED_AGENTS" 2>/dev/null || true
else
    timeout 10 openclaw message send \
        --target "$TELEGRAM_GROUP" \
        --message "✅ **All Agents Completed Successfully**\n\n$SUCCESS_COUNT agents executed.\nNeural Nexus is fully operational. ❤️‍🔥" 2>/dev/null || true
fi

log "Cycle complete"
