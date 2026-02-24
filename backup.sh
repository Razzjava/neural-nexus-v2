#!/bin/bash
# Neural Nexus Automated Backup Script
# Run via cron: 0 * * * * /root/.openclaw/workspace/neural-nexus/backup.sh

set -e

BACKUP_DIR="/backups/neural-nexus"
DATA_DIR="/root/.openclaw/workspace/neural-nexus/data"
RETENTION_HOURS=48
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
HOSTNAME=$(hostname)

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Function to log with timestamp
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

log "Starting backup..."

# Backup SQLite database
if [ -f "$DATA_DIR/neural-nexus.db" ]; then
    BACKUP_FILE="$BACKUP_DIR/db_${TIMESTAMP}.sql"
    sqlite3 "$DATA_DIR/neural-nexus.db" ".dump" > "$BACKUP_FILE"
    gzip "$BACKUP_FILE"
    log "Database backed up: ${BACKUP_FILE}.gz"
else
    log "No database found at $DATA_DIR/neural-nexus.db"
fi

# Backup state files
if [ -d "$DATA_DIR" ]; then
    STATE_BACKUP="$BACKUP_DIR/state_${TIMESTAMP}.tar.gz"
    tar -czf "$STATE_BACKUP" -C "$DATA_DIR" . 2>/dev/null || true
    log "State files backed up: $STATE_BACKUP"
fi

# Backup event logs
EVENT_LOG="/root/.openclaw/workspace/neural-nexus/state/event-log.jsonl"
if [ -f "$EVENT_LOG" ]; then
    cp "$EVENT_LOG" "$BACKUP_DIR/events_${TIMESTAMP}.jsonl"
    gzip "$BACKUP_DIR/events_${TIMESTAMP}.jsonl"
    log "Event log backed up"
fi

# Clean up old backups
log "Cleaning up backups older than $RETENTION_HOURS hours..."
find "$BACKUP_DIR" -name "*.gz" -type f -mmin +$((RETENTION_HOURS * 60)) -delete
find "$BACKUP_DIR" -name "*.tar.gz" -type f -mmin +$((RETENTION_HOURS * 60)) -delete

# Verify backup
LATEST_DB=$(ls -t "$BACKUP_DIR"/db_*.sql.gz 2>/dev/null | head -1)
if [ -n "$LATEST_DB" ]; then
    # Test integrity
    if gunzip -t "$LATEST_DB" 2>/dev/null; then
        log "✅ Backup verified: $LATEST_DB"
        
        # Create status file
        cat > "$BACKUP_DIR/last-backup-status.json" << EOF
{
  "status": "success",
  "timestamp": "$(date -Iseconds)",
  "latest_backup": "$LATEST_DB",
  "retention_hours": $RETENTION_HOURS,
  "total_backups": $(ls "$BACKUP_DIR"/*.gz 2>/dev/null | wc -l)
}
EOF
    else
        log "❌ Backup verification failed: $LATEST_DB"
        exit 1
    fi
else
    log "❌ No backup created"
    exit 1
fi

log "Backup complete!"
