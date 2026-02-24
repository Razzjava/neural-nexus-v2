#!/bin/bash

# Universal Agent Wrapper
# Adds retry logic, timeout protection, and error handling to any agent

AGENT_NAME="$1"
shift

MAX_RETRIES=3
TIMEOUT=600  # 10 minutes
RETRY_DELAY=10

log() {
    echo "[$(date '+%H:%M:%S')] [AgentWrapper:$AGENT_NAME] $1" | tee -a /tmp/agent-wrapper.log
}

run_with_retry() {
    local attempt=1
    
    while [ $attempt -le $MAX_RETRIES ]; do
        log "Attempt $attempt/$MAX_RETRIES"
        
        if timeout $TIMEOUT "$@"; then
            log "Success on attempt $attempt"
            return 0
        fi
        
        log "Failed on attempt $attempt"
        
        if [ $attempt -lt $MAX_RETRIES ]; then
            log "Waiting ${RETRY_DELAY}s before retry..."
            sleep $RETRY_DELAY
            RETRY_DELAY=$((RETRY_DELAY * 2))  # Exponential backoff
        fi
        
        attempt=$((attempt + 1))
    done
    
    log "All retries exhausted"
    return 1
}

# Main execution
log "Starting agent execution"

if [ -z "$AGENT_NAME" ]; then
    log "Error: No agent name provided"
    exit 1
fi

# Run the actual agent command
if run_with_retry "$@"; then
    log "Agent completed successfully"
    exit 0
else
    log "Agent failed after all retries"
    
    # Notify about failure
    timeout 10 openclaw message send \
        --target "-5297940191" \
        --message "⚠️ **Agent Failed: $AGENT_NAME**\n\nAll retry attempts exhausted. Check logs at /tmp/agent-wrapper.log" 2>/dev/null || true
    
    exit 1
fi
