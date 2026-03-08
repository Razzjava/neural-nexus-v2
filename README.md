# Neural Nexus v2.0

A self-healing, self-evolving multi-agent system for autonomous content creation and task automation.

## 🧠 Core Philosophy

Neural Nexus doesn't just run agents—it **understands** them, **heals** them, and **evolves** them.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    SYSTEM MANAGER v2                         │
│              (Unified Control & Orchestration)               │
└─────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
┌───────────────┐    ┌───────────────┐    ┌───────────────┐
│ SELF-HEALING  │    │   FAILURE     │    │   META-       │
│ ORCHESTRATOR  │◄──►│   ANALYSIS    │◄──►│   LEARNING    │
│               │    │    ENGINE     │    │    ENGINE     │
└───────────────┘    └───────────────┘    └───────────────┘
        │
        ▼
┌─────────────────────────────────────────────────────────────┐
│                    AGENT DNA REGISTRY                        │
│  • Capabilities  • Success Rates  • Lineage  • Mutations    │
└─────────────────────────────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────────────────────────┐
│                    DYNAMIC AGENT POOL                        │
│   Research  │  Script  │  Video  │  Code  │  Healing ...   │
└─────────────────────────────────────────────────────────────┘
```

## Key Features

### 1. Agent DNA
Every agent has a genetic profile:
```json
{
  "capabilities": ["web-search", "trend-analysis"],
  "successRate": 0.85,
  "lineage": ["base-v1", "research-v2"],
  "specializationScore": 0.8,
  "failurePatterns": []
}
```

### 2. Self-Healing
When agents fail:
- Automatic failure classification (TIMEOUT, NETWORK, RESOURCE_EXHAUSTION, etc.)
- Root cause analysis with confidence scoring
- Cascade risk assessment (will this break other agents?)
- Dynamic healing specialist spawning
- Automatic repair and testing

### 3. Meta-Learning
- Successful strategies transfer between agents
- Emergent pattern detection ("These 3 agents always fail together")
- Collective intelligence building over time
- Automatic knowledge transfer to struggling agents

### 4. Evolution
Agents evolve automatically:
- **High performers** → Gain new capabilities, increased complexity
- **Low performers** → Simplified focus, targeted improvements
- **Stale agents** → Refreshed with new strategies

## Quick Start

```bash
# Start the system
node system-manager-v2.js start

# Check status
node system-manager-v2.js status

# Run health check
node system-manager-v2.js health

# Manual healing for an agent
node agents/healing-specialist.js <agent-name>
```

## Components

| Component | Purpose |
|-----------|---------|
| `system-manager-v2.js` | Main entry point, coordinates all systems |
| `self-healing-orchestrator.js` | Failure detection, healing dispatch, evolution |
| `failure-analysis-engine.js` | Deep diagnosis, pattern recognition, forecasting |
| `meta-learning-engine.js` | Knowledge transfer, emergent patterns, system evolution |
| `quality-gate.js` | Output quality scoring and improvement requests |
| `healing-specialist.js` | 5-phase healing protocol (investigate → diagnose → repair → test → report) |

## Cron Jobs

The system maintains itself through scheduled jobs:

| Job | Schedule | Purpose |
|-----|----------|---------|
| `nexus-quality-auditor` | Every 6h | Health monitoring, DNA checks |
| `nexus-meta-evolution` | Every 8h | Knowledge transfers, pattern detection |
| `nexus-system-deep-check` | Every 12h | Deep analysis, forecasting |

## Agent Types

### Base Agents
- `research-specialist` — Trend discovery, content research
- `script-writer` — YouTube script generation
- `video-producer` — Remotion video rendering
- `code-architect` — System design, code generation
- `healing-specialist` — Meta-agent for repairing other agents

### Dynamic Agents
Spawned on-demand based on task requirements:
- Purpose-built for specific tasks
- Inherit from successful agent DNA
- Auto-terminate after completion

## Directory Structure

```
neural-nexus/
├── agents/              # Agent implementations
├── agents-output/       # Generated content
├── analysis/           # Failure analysis data
├── dna/                # Agent DNA registry
├── lib/                # Shared utilities
├── logs/               # System logs
├── meta-learning/      # Collective knowledge
├── mission-control/    # Dashboard (optional)
├── state/              # System state
└── *.js                # Core engines
```

## Failure Recovery

The system handles failures through escalating responses:

1. **Retry** — Simple retry with exponential backoff
2. **Mutation** — Retry with adjusted parameters
3. **Healing** — Spawn specialist agent for diagnosis/repair
4. **Evolution** — Evolve agent to next version
5. **Escalation** — Notify human if all else fails

## Event Bus

All components communicate via events:
- `AGENT_FAILED` → Triggers healing
- `AGENT_COMPLETED` → Quality check → DNA update
- `QUALITY_REJECTED` → Improvement cycle
- `HEALING_COMPLETED` → Learning recorded

## Monitoring

System health tracked via:
- Per-agent success rates
- Failure pattern analysis
- Knowledge base growth
- Cascade risk predictions

Notifications sent to Telegram for:
- Agent failures
- Healing completions
- System health issues
- Evolution milestones

## License

MIT — Built by agents, for agents.
