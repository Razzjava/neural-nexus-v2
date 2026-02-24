# Neural Nexus — Intelligent Agent Architecture

## Overview
Multi-agent system for autonomous content creation. Agents communicate via event bus, share state through central store, and make decisions based on goals + feedback.

## Agent Roles

### 1. Research Agent (Building First)
**Purpose:** Discover trending topics worth covering
**Inputs:** Hacker News, Reddit, GitHub, Google Trends, YouTube trending
**Outputs:** `ResearchEvent` with ranked topics
**Decision Logic:** 
- Score = trend_velocity × relevance_to_audience × content_potential
- Trigger pipeline when score > threshold
- Avoid topics covered in last 7 days

### 2. Script Agent
**Purpose:** Generate platform-optimized scripts
**Inputs:** ResearchEvent, performance history
**Outputs:** `ScriptEvent` with short + long versions
**Decision Logic:**
- Adapt hook style based on past viral videos
- A/B test variations when uncertain

### 3. Visual Agent
**Purpose:** Design scenes, pick components, handle aspect ratios
**Inputs:** ScriptEvent
**Outputs:** `VisualPlanEvent` with scene breakdown
**Decision Logic:**
- Match component to content type (stats → Counter, comparison → Split)
- Optimize pacing for retention

### 4. Render Agent
**Purpose:** Execute Remotion renders, handle failures
**Inputs:** VisualPlanEvent
**Outputs:** `RenderCompleteEvent` or `RenderFailedEvent`
**Decision Logic:**
- Queue management (prioritize shorts?)
- Auto-retry with adjusted settings on failure
- Escalate to human after 3 failures

### 5. Distribution Agent
**Purpose:** Publish to platforms, track performance
**Inputs:** RenderCompleteEvent
**Outputs:** `PublishedEvent`, `PerformanceMetrics`
**Decision Logic:**
- Schedule for optimal post times
- Cross-post with platform-specific tweaks

### 6. Orchestrator Agent
**Purpose:** Coordinate workflow, resolve conflicts
**Inputs:** All events
**Outputs:** Task assignments, priority adjustments
**Decision Logic:**
- Prevent resource contention (only one render at a time)
- Balance exploration (new topics) vs exploitation (proven formats)

## Event Bus

```typescript
// Core event types
type Event = 
  | { type: 'RESEARCH_FOUND', topics: RankedTopic[], timestamp }
  | { type: 'SCRIPT_CREATED', script: Script, sourceTopic: string }
  | { type: 'VISUAL_PLANNED', scenes: Scene[], duration }
  | { type: 'RENDER_STARTED', jobId, priority }
  | { type: 'RENDER_COMPLETE', videoPath, metadata }
  | { type: 'RENDER_FAILED', error, retryCount }
  | { type: 'PUBLISHED', platform, url, metrics }
  | { type: 'PERFORMANCE_REPORT', videoId, views, engagement }
  | { type: 'AGENT_HEARTBEAT', agentId, status, load }
```

## State Store

```typescript
interface SystemState {
  // Active work
  activeRenders: RenderJob[];
  pendingScripts: Script[];
  
  // History
  publishedVideos: Video[];
  topicHistory: { topic: string, date: Date, performance: Metrics }[];
  
  // Learning
  hookPerformance: Record<string, Metrics>;  // which hooks work
  componentRetention: Record<string, number>; // which scenes hold attention
  
  // Config
  contentGoals: { shortsPerDay: number, longsPerWeek: number };
  qualityThreshold: number;
}
```

## Communication Patterns

1. **Pub/Sub:** Agents broadcast events, interested agents subscribe
2. **Direct:** Orchestrator assigns specific tasks to specific agents
3. **Query:** Agents can query state store for context

## Failure Handling

- Agent crash → Orchestrator restarts, replays missed events
- Render fail → Auto-retry → Escalate to human
- Research API down → Use cached trends → Degrade gracefully

## First Milestone

Research Agent running every 2 hours, emitting `RESEARCH_FOUND` events. Orchestrator logs them. No pipeline trigger yet — just observation and scoring validation.
