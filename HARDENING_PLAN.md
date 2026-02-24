# Neural Nexus Hardening Plan
## Production-Ready Autonomous Agent System

## Executive Summary
Current state: Functional prototype with 600+ lines of generated code
Target state: Hardened, resilient, self-healing production system

---

## Phase 1: Reliability & Fault Tolerance (Week 1)

### 1.1 Circuit Breakers & Retry Logic
**Problem:** Agents crash, APIs fail, renders hang indefinitely

**Implementation:**
```javascript
// Circuit breaker for external APIs
class CircuitBreaker {
  constructor(name, options = {}) {
    this.name = name;
    this.failureThreshold = options.failureThreshold || 5;
    this.resetTimeout = options.resetTimeout || 60000;
    this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
    this.failures = 0;
  }

  async execute(fn) {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailure > this.resetTimeout) {
        this.state = 'HALF_OPEN';
      } else {
        throw new Error(`Circuit breaker OPEN for ${this.name}`);
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (err) {
      this.onFailure();
      throw err;
    }
  }
}

// Usage for HackerNews API
const hnBreaker = new CircuitBreaker('hackernews', {
  failureThreshold: 3,
  resetTimeout: 300000 // 5 minutes
});
```

### 1.2 Agent Health Monitoring
**Problem:** Agents silently fail, memory leaks, infinite loops

**Implementation:**
- Heartbeat with payload (not just ping)
- Memory usage tracking
- CPU throttling detection
- Stuck task detection (>30min on same task)

```javascript
class AgentHealthMonitor {
  checkAgent(agentId) {
    const agent = this.getAgent(agentId);
    const checks = {
      heartbeatStale: Date.now() - agent.lastHeartbeat > 30000,
      memoryHigh: agent.memoryMB > 500,
      cpuHigh: agent.cpuPercent > 90,
      taskStuck: agent.currentTask && 
                 Date.now() - agent.taskStart > 30 * 60 * 1000
    };
    
    if (Object.values(checks).some(c => c)) {
      this.triggerRecovery(agentId, checks);
    }
  }
}
```

### 1.3 Graceful Degradation
**Problem:** One failing component kills entire pipeline

**Strategy:**
| Component | Degraded Mode |
|-----------|--------------|
| HackerNews API | Use cached trends from last 24h |
| GitHub API | Skip trending repos |
| Remotion render | Queue for retry, alert human |
| Telegram notify | Log to file, retry later |
| SQLite | Switch to JSON file backup |

---

## Phase 2: Security Hardening (Week 1-2)

### 2.1 Input Validation & Sanitization
**Problem:** Agent-generated scripts could contain malicious content

**Implementation:**
```javascript
// Content sanitization
const DANGEROUS_PATTERNS = [
  /eval\s*\(/i,
  /Function\s*\(/i,
  /child_process/i,
  /require\s*\(\s*['"]fs['"]\s*\)/i,
  /\b(rm|del|delete)\s+/i
];

function sanitizeScript(content) {
  for (const pattern of DANGEROUS_PATTERNS) {
    if (pattern.test(content)) {
      throw new SecurityError(`Dangerous pattern detected: ${pattern}`);
    }
  }
  return content;
}
```

### 2.2 Sandboxed Execution
**Problem:** Agent code runs with full system access

**Implementation:**
- Use Docker containers for renders
- Restrict file system access (chroot)
- Network isolation for untrusted agents
- Resource limits (CPU, memory, disk)

```dockerfile
# Dockerfile.agent
FROM node:20-alpine
RUN adduser -D -s /bin/sh agent
USER agent
WORKDIR /workspace
COPY --chown=agent:agent . .
CMD ["node", "agent.js"]
```

### 2.3 Secrets Management
**Problem:** API keys in plain text

**Implementation:**
- Move secrets to environment variables
- Use systemd credential storage
- Rotate keys automatically
- Audit log all API key usage

```bash
# /etc/systemd/system/neural-nexus.service
[Service]
Environment="OPENAI_API_KEY={{OPENAI_API_KEY}}"
Environment="TELEGRAM_BOT_TOKEN={{TELEGRAM_BOT_TOKEN}}"
LoadCredential=openai_key:/etc/neural-nexus/secrets/openai
```

---

## Phase 3: Observability (Week 2)

### 3.1 Structured Logging
**Problem:** Logs are unstructured, hard to query

**Implementation:**
```javascript
const logger = winston.createLogger({
  format: winston.format.json(),
  defaultMeta: { 
    service: 'neural-nexus',
    agent: process.env.AGENT_ID,
    version: '1.0.0'
  },
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
    new winston.transports.Console()
  ]
});

// Usage
logger.info('Research completed', {
  topic: 'AI Agents',
  score: 47.5,
  sources: ['hackernews', 'github'],
  durationMs: 2450
});
```

### 3.2 Metrics Collection
**Problem:** No visibility into system performance

**Key Metrics:**
| Metric | Type | Alert Threshold |
|--------|------|-----------------|
| agent_uptime | gauge | < 95% |
| tasks_completed | counter | - |
| task_duration | histogram | p99 > 10min |
| render_queue_depth | gauge | > 5 |
| api_error_rate | gauge | > 5% |
| memory_usage | gauge | > 80% |

### 3.3 Distributed Tracing
**Problem:** Can't trace requests across agents

**Implementation:**
```javascript
// Trace a video pipeline execution
const trace = tracer.startSpan('video-pipeline', {
  attributes: {
    'pipeline.id': uuid(),
    'topic': 'AI Agents',
    'requesting_agent': 'orchestrator'
  }
});

try {
  await researchAgent.run({ parentSpan: trace });
  await scriptAgent.generate({ parentSpan: trace });
  await renderAgent.render({ parentSpan: trace });
  trace.setStatus({ code: SpanStatusCode.OK });
} catch (err) {
  trace.recordException(err);
  trace.setStatus({ code: SpanStatusCode.ERROR });
} finally {
  trace.end();
}
```

---

## Phase 4: Data Integrity & Recovery (Week 2-3)

### 4.1 Database Backups
**Problem:** SQLite corruption = lost everything

**Implementation:**
- Hourly automated backups
- Point-in-time recovery
- Backup verification (restore test)
- Offsite backup replication

```bash
#!/bin/bash
# backup.sh
BACKUP_DIR="/backups/neural-nexus"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

sqlite3 /data/neural-nexus.db ".backup '${BACKUP_DIR}/backup_${TIMESTAMP}.db'"

# Keep only last 24 backups
ls -t ${BACKUP_DIR}/backup_*.db | tail -n +25 | xargs rm -f
```

### 4.2 State Snapshots
**Problem:** Can't rollback bad agent decisions

**Implementation:**
```javascript
class StateManager {
  async snapshot() {
    const snapshot = {
      timestamp: Date.now(),
      agents: await this.getAgentStates(),
      tasks: await this.getTaskStates(),
      events: await this.getRecentEvents(1000)
    };
    
    await this.saveSnapshot(snapshot);
    return snapshot.id;
  }

  async rollback(snapshotId) {
    const snapshot = await this.loadSnapshot(snapshotId);
    await this.restoreState(snapshot);
    this.log.info('State rolled back', { to: snapshotId });
  }
}
```

### 4.3 Idempotent Operations
**Problem:** Duplicate renders, double notifications

**Implementation:**
```javascript
// Deduplication via idempotency keys
async function renderVideo(topic, idempotencyKey) {
  const existing = await db.findRender(idempotencyKey);
  if (existing) {
    logger.info('Deduplicated render', { key: idempotencyKey });
    return existing;
  }
  
  // Proceed with render
  const result = await doRender(topic);
  await db.saveRender({ ...result, idempotencyKey });
  return result;
}
```

---

## Phase 5: Scaling & Performance (Week 3)

### 5.1 Agent Pooling
**Problem:** Single agent bottleneck

**Implementation:**
```javascript
class AgentPool {
  constructor(agentType, minSize = 2, maxSize = 10) {
    this.agentType = agentType;
    this.minSize = minSize;
    this.maxSize = maxSize;
    this.pool = [];
    this.queue = [];
  }

  async acquire() {
    if (this.pool.length > 0) {
      return this.pool.pop();
    }
    if (this.pool.length + this.active < this.maxSize) {
      return this.createAgent();
    }
    return new Promise(resolve => this.queue.push(resolve));
  }

  release(agent) {
    if (this.queue.length > 0) {
      const next = this.queue.shift();
      next(agent);
    } else {
      this.pool.push(agent);
    }
  }
}
```

### 5.2 Render Queue Management
**Problem:** Multiple renders compete for resources

**Implementation:**
- Priority queue (shorts before longs)
- Resource reservation (CPU, memory)
- Queue depth limits
- Auto-scaling render workers

### 5.3 Caching Strategy
**Problem:** Repeated API calls, slow responses

| Cache | TTL | Storage |
|-------|-----|---------|
| HN Top Stories | 15 min | Memory |
| GitHub Trending | 1 hour | Disk |
| Research Results | 3 hours | SQLite |
| Rendered Videos | 7 days | Disk |
| Agent Telemetry | 1 hour | Memory |

---

## Phase 6: Human Oversight (Week 3-4)

### 6.1 Approval Gates
**Problem:** Agents might do something harmful

**Implementation:**
```javascript
const CRITICAL_ACTIONS = [
  'DELETE_VIDEO',
  'DEPLOY_PRODUCTION',
  'MODIFY_SYSTEMD',
  'COST > $10'
];

async function executeCritical(action) {
  if (CRITICAL_ACTIONS.includes(action.type)) {
    await notifyHuman(action);
    const approval = await waitForApproval(action.id, { timeout: 300000 });
    if (!approval.granted) {
      throw new Error('Action rejected by human');
    }
  }
  return execute(action);
}
```

### 6.2 Budget Controls
**Problem:** API costs could spiral

**Implementation:**
- Daily spend limits per API
- Cost estimation before execution
- Auto-shutdown on budget breach
- Monthly cost reports

### 6.3 Kill Switches
**Problem:** Runaway agents

**Implementation:**
```javascript
// Emergency stop
class KillSwitch {
  constructor() {
    this.active = false;
    this.reason = null;
  }

  activate(reason) {
    this.active = true;
    this.reason = reason;
    this.notifyAllAgents();
    this.pauseAllPipelines();
    this.alertHuman(reason);
  }

  check() {
    if (this.active) {
      throw new Error(`System halted: ${this.reason}`);
    }
  }
}

// Usage in agents
killSwitch.check();
```

---

## Phase 7: Testing & Validation (Week 4)

### 7.1 Chaos Engineering
**Problem:** Unknown failure modes

**Tests:**
- Random agent kills
- Network partition simulation
- Disk full scenarios
- API latency injection
- Database corruption

### 7.2 Load Testing
**Problem:** Unknown capacity limits

**Scenarios:**
- 100 concurrent renders
- 1000 events/second
- 24-hour sustained load
- Recovery from crash

### 7.3 Acceptance Criteria

| Test | Target | Current |
|------|--------|---------|
| System uptime | 99.9% | ~95% |
| Mean recovery time | <5 min | Manual |
| False positive alerts | <1/day | N/A |
| API error rate | <0.1% | ~5% |
| Cost per video | <$0.50 | Unknown |

---

## Implementation Priority

**P0 (Critical - Week 1):**
1. Circuit breakers for APIs
2. Agent health monitoring
3. Kill switch
4. Structured logging

**P1 (High - Week 2):**
5. Input sanitization
6. Database backups
7. Metrics collection
8. Secrets management

**P2 (Medium - Week 3-4):**
9. Agent pooling
10. Caching layer
11. Approval gates
12. Chaos testing

---

## Success Metrics

After hardening:
- Zero unplanned downtime
- Self-healing from common failures
- Human intervention <1x per week
- Complete audit trail
- Security audit passed
