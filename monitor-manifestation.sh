#!/bin/bash

# Active Monitoring for Manifestation Voice Messages
# Checks every 5 minutes and alerts if voice messages aren't delivering

TELEGRAM_GROUP="-5297940191"
LOG_FILE="/tmp/manifestation-voice.log"
ALERT_FILE="/tmp/manifestation-alert-sent"

# Check if voice message was sent in last 70 minutes (hourly + buffer)
check_voice_delivery() {
    if [[ ! -f "$LOG_FILE" ]]; then
        echo "No log file found"
        return 1
    fi
    
    # Get last successful voice send timestamp
    LAST_SUCCESS=$(grep "Voice sent successfully" "$LOG_FILE" | tail -1 | cut -d'[' -f2 | cut -d']' -f1)
    
    if [[ -z "$LAST_SUCCESS" ]]; then
        echo "No successful voice send found"
        return 1
    fi
    
    # Convert to epoch and check if within 70 minutes
    LAST_EPOCH=$(date -d "$LAST_SUCCESS" +%s 2>/dev/null || echo 0)
    NOW_EPOCH=$(date +%s)
    DIFF=$(( (NOW_EPOCH - LAST_EPOCH) / 60 ))
    
    if [[ $DIFF -gt 70 ]]; then
        echo "Last voice send was $DIFF minutes ago (expected within 70)"
        return 1
    fi
    
    return 0
}

# Send alert if not already sent
send_alert() {
    if [[ -f "$ALERT_FILE" ]]; then
        # Don't spam alerts
        return
    fi
    
    # Check last log entries for errors
    LAST_ERRORS=$(tail -20 "$LOG_FILE" 2>/dev/null | grep -E "(failed|error|Error)" | tail -5)
    
    openclaw message send \
        --target "$TELEGRAM_GROUP" \
        --message "🚨 **MANIFESTATION VOICE SYSTEM ALERT**

Voice messages not delivering properly.

Last errors:
${LAST_ERRORS}

Checking system..." 2>/dev/null
    
    touch "$ALERT_FILE"
}

# Clear alert if working
clear_alert() {
    rm -f "$ALERT_FILE"
}

# Main check
if ! check_voice_delivery; then
    send_alert
    # Try to fix by running manually
    echo "$(date): Voice delivery failed, attempting manual fix" >> /tmp/manifestation-monitor.log
    bash /root/.openclaw/workspace/neural-nexus/send-manifestation-cron.sh 2>&1 >> /tmp/manifestation-monitor.log
else
    clear_alert
fi
