#!/bin/bash
# Neural Nexus v2 Cron Wrapper
# Routes all agent execution through the self-healing orchestrator

set -e

NEXUS_DIR="/root/.openclaw/workspace/neural-nexus"
AGENT_NAME="$1"
shift  # Remove agent name, pass remaining args

cd "$NEXUS_DIR"

# Determine agent type from name mapping
map_agent() {
    case "$1" in
        # Content/YouTube agents
        "scout-subagent"|"youtube-scout"|"scout")
            echo "claw-researcher"
            ;;
        "writer-subagent"|"youtube-writer"|"writer")
            echo "claw-script-writer"
            ;;
        "render-subagent"|"video-render"|"renderer")
            echo "claw-video-editor"
            ;;
        "daily-video-cleanup"|"cleanup")
            echo "claw-cleanup"
            ;;
        # Social/CEO agents
        "claw-social"|"social-daily")
            echo "claw-social"
            ;;
        "claw-ceo"|"ceo-daily")
            echo "claw-ceo"
            ;;
        "claw-qa"|"qa-daily")
            echo "claw-qa"
            ;;
        # Job search
        "startup-lab-scout"|"job-scout")
            echo "claw-hunter"
            ;;
        # Quality/Auditing
        "quality-auditor"|"auditor")
            echo "quality-auditor"
            ;;
        # Manifestation
        "manifestation-voice"|"manifestation")
            echo "claw-coach"
            ;;
        # GitHub
        "github-autosync"|"autosync")
            echo "claw-dev"
            ;;
        *)
            echo "$1"
            ;;
    esac
}

MAPPED_AGENT=$(map_agent "$AGENT_NAME")

echo "[Nexus Cron] Routing $AGENT_NAME → $MAPPED_AGENT"

# Execute through system manager with full orchestration
exec node system-manager-v2.js execute "$MAPPED_AGENT" "$@"
