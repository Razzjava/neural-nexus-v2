#!/usr/bin/env node

/**
 * Neural Nexus Workforce Orchestrator
 * 
 * Manages multiple autonomous teams:
 * - Startup Generation Team (Full startup lifecycle)
 * - Neural Nexus Dev Team (Platform enhancement)
 * - Social Media Team (Content empire)
 * 
 * Teams coordinate via shared objectives, resource allocation, and cross-pollination.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { EventBus } = require('../event-bus');

const WORKSPACE = '/root/.openclaw/workspace';
const NEXUS_DIR = path.join(WORKSPACE, 'neural-nexus');
const WORKFORCE_DIR = path.join(NEXUS_DIR, 'workforce');
const TEAMS_DIR = path.join(WORKFORCE_DIR, 'teams');
const PROJECTS_DIR = path.join(WORKFORCE_DIR, 'projects');

// Ensure directories
[WORKFORCE_DIR, TEAMS_DIR, PROJECTS_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

class WorkforceOrchestrator {
  constructor() {
    this.bus = new EventBus('workforce-orchestrator');
    this.teams = this.initializeTeams();
    this.activeProjects = new Map();
    this.resourcePool = this.initializeResources();
    
    // Subscribe to team events
    this.bus.subscribe([
      'TEAM_TASK_COMPLETED', 'TEAM_TASK_FAILED', 'PROJECT_MILESTONE',
      'RESOURCE_REQUEST', 'CROSS_TEAM_COLLABORATION'
    ], this.handleEvent.bind(this));
  }

  /**
   * Initialize all autonomous teams
   */
  initializeTeams() {
    return {
      'startup-generation': new StartupGenerationTeam(),
      'nexus-development': new NexusDevTeam(),
      'social-media': new SocialMediaTeam()
    };
  }

  /**
   * Initialize shared resource pool
   */
  initializeResources() {
    return {
      compute: { available: 100, allocated: 0 },
      apiTokens: { openclaw: true, telegram: true, github: true },
      storage: { available: '50GB', used: '0GB' },
      concurrentAgents: { max: 10, active: 0 }
    };
  }

  /**
   * Handle workforce events
   */
  async handleEvent(payload, event) {
    switch(event.type) {
      case 'TEAM_TASK_COMPLETED':
        await this.handleTaskCompletion(payload);
        break;
      case 'TEAM_TASK_FAILED':
        await this.handleTaskFailure(payload);
        break;
      case 'PROJECT_MILESTONE':
        await this.handleMilestone(payload);
        break;
      case 'RESOURCE_REQUEST':
        await this.allocateResources(payload);
        break;
      case 'CROSS_TEAM_COLLABORATION':
        await this.facilitateCollaboration(payload);
        break;
    }
  }

  /**
   * Start the full workforce
   */
  async startWorkforce() {
    console.log('🚀 Starting Neural Nexus Autonomous Workforce...');
    
    // Start all teams
    for (const [name, team] of Object.entries(this.teams)) {
      console.log(`  Starting ${name} team...`);
      await team.initialize();
    }
    
    // Start cross-team coordination
    this.startCoordinationLoop();
    
    console.log('✅ Workforce operational');
    this.notify('🚀 Neural Nexus Workforce Online\n\nTeams Active:\n• Startup Generation\n• Platform Development\n• Social Media Empire');
  }

  /**
   * Cross-team coordination loop
   */
  startCoordinationLoop() {
    // Every 30 minutes: Sync teams, share learnings, allocate resources
    setInterval(async () => {
      await this.syncTeams();
      await this.shareCrossTeamLearnings();
      await this.rebalanceResources();
    }, 1800000);
    
    // Daily: Strategic planning, project portfolio review
    setInterval(async () => {
      await this.strategicReview();
    }, 86400000);
  }

  /**
   * Sync all teams
   */
  async syncTeams() {
    const statuses = {};
    for (const [name, team] of Object.entries(this.teams)) {
      statuses[name] = await team.getStatus();
    }
    
    // Identify collaboration opportunities
    const opportunities = this.findCollaborationOpportunities(statuses);
    for (const opp of opportunities) {
      this.bus.publish('CROSS_TEAM_COLLABORATION', opp);
    }
  }

  /**
   * Find opportunities for teams to collaborate
   */
  findCollaborationOpportunities(statuses) {
    const opportunities = [];
    
    // Example: Social Media team needs content → Startup team has stories
    if (statuses['social-media']?.needs?.includes('content_ideas') &&
        statuses['startup-generation']?.outputs?.includes('founder_stories')) {
      opportunities.push({
        from: 'startup-generation',
        to: 'social-media',
        type: 'content_sharing',
        description: 'Share founder journey stories for content'
      });
    }
    
    // Example: Dev team builds tool → Social Media team uses it
    if (statuses['nexus-development']?.recentReleases?.length > 0) {
      opportunities.push({
        from: 'nexus-development',
        to: 'social-media',
        type: 'tool_adoption',
        description: 'Adopt new content generation tools'
      });
    }
    
    return opportunities;
  }

  /**
   * Share learnings across teams
   */
  async shareCrossTeamLearnings() {
    const learnings = [];
    
    for (const [name, team] of Object.entries(this.teams)) {
      const teamLearnings = await team.getLearnings();
      learnings.push(...teamLearnings.map(l => ({ ...l, sourceTeam: name })));
    }
    
    // Distribute relevant learnings to each team
    for (const [name, team] of Object.entries(this.teams)) {
      const relevant = learnings.filter(l => l.applicableTeams?.includes(name));
      if (relevant.length > 0) {
        await team.receiveLearnings(relevant);
      }
    }
  }

  /**
   * Rebalance resources based on demand
   */
  async rebalanceResources() {
    const demands = {};
    for (const [name, team] of Object.entries(this.teams)) {
      demands[name] = await team.getResourceDemand();
    }
    
    // Simple allocation strategy
    const totalDemand = Object.values(demands).reduce((a, b) => a + b.compute, 0);
    
    if (totalDemand > this.resourcePool.compute.available) {
      // Scale down proportionally
      const scaleFactor = this.resourcePool.compute.available / totalDemand;
      for (const [name, team] of Object.entries(this.teams)) {
        await team.scaleResources(scaleFactor);
      }
    }
  }

  /**
   * Daily strategic review
   */
  async strategicReview() {
    console.log('[Workforce] Running strategic review...');
    
    const portfolio = await this.getProjectPortfolio();
    
    // Check project health
    for (const project of portfolio) {
      if (project.health < 0.5) {
        await this.intervene(project);
      }
    }
    
    // Identify new opportunities
    const opportunities = await this.identifyOpportunities();
    if (opportunities.length > 0) {
      await this.notify(`📊 Strategic Review Complete\n\nNew opportunities identified: ${opportunities.length}\n${opportunities.map(o => `• ${o.name}`).join('\n')}`);
    }
  }

  async getProjectPortfolio() {
    const projects = [];
    for (const [name, team] of Object.entries(this.teams)) {
      const teamProjects = await team.getProjects();
      projects.push(...teamProjects);
    }
    return projects;
  }

  async intervene(project) {
    this.bus.publish('PROJECT_INTERVENTION', {
      project: project.id,
      reason: 'low_health',
      suggestedActions: ['add_resources', 'escalate', 'reprioritize']
    });
  }

  async identifyOpportunities() {
    // Spawn opportunity scout agent
    // This would analyze trends, gaps, etc.
    return []; // Placeholder
  }

  notify(message) {
    try {
      execSync(`openclaw message send --target "-5297940191" --message "${message}"`, {
        timeout: 10000
      });
    } catch {}
  }
}

// =============================================================================
// TEAM DEFINITIONS
// =============================================================================

class BaseTeam {
  constructor(name, config) {
    this.name = name;
    this.config = config;
    this.members = new Map();
    this.tasks = [];
    this.learnings = [];
    this.bus = new EventBus(`team-${name}`);
  }

  async initialize() {
    // Spawn team members
    for (const [role, count] of Object.entries(this.config.roles)) {
      for (let i = 0; i < count; i++) {
        const agentId = `${this.name}-${role}-${i}`;
        this.members.set(agentId, { role, status: 'idle', load: 0 });
      }
    }
    
    // Start team coordination
    this.startTeamLoop();
  }

  startTeamLoop() {
    // Team-specific coordination
    setInterval(async () => {
      await this.assignTasks();
      await this.checkProgress();
      await selfHealTeam();
    }, 300000); // Every 5 minutes
  }

  async getStatus() {
    return {
      name: this.name,
      memberCount: this.members.size,
      activeTasks: this.tasks.filter(t => t.status === 'active').length,
      completedToday: this.tasks.filter(t => 
        t.status === 'completed' && 
        new Date(t.completedAt) > Date.now() - 86400000
      ).length,
      health: this.calculateHealth()
    };
  }

  calculateHealth() {
    if (this.members.size === 0) return 0;
    const activeMembers = Array.from(this.members.values()).filter(m => m.status !== 'failed').length;
    return activeMembers / this.members.size;
  }

  async getLearnings() {
    return this.learnings.slice(-10);
  }

  async receiveLearnings(learnings) {
    this.learnings.push(...learnings);
    // Apply relevant learnings
  }

  async getResourceDemand() {
    return { compute: this.members.size * 10 };
  }

  async scaleResources(factor) {
    // Adjust concurrent task limits
  }

  async getProjects() {
    return this.tasks.filter(t => t.type === 'project');
  }

  async assignTasks() {
    // Assign pending tasks to idle members
  }

  async checkProgress() {
    // Check task progress, escalate stuck tasks
  }

  async selfHealTeam() {
    // Spawn replacement agents for failed members
  }
}

// =============================================================================
// STARTUP GENERATION TEAM
// =============================================================================

class StartupGenerationTeam extends BaseTeam {
  constructor() {
    super('startup-generation', {
      roles: {
        'founder-strategist': 1,    // PM - identifies opportunities
        'market-researcher': 2,     // BA - analyzes markets
        'product-architect': 2,     // Designs MVPs
        'growth-hacker': 2,         // Go-to-market strategy
        'pitch-specialist': 1,      // Investor materials
        'legal-compliance': 1,      // Business formation
        'fullstack-dev': 3,         // Builds MVPs
        'designer': 2,              // UX/UI
        'qa-tester': 2              // Validates MVPs
      }
    });
    
    this.pipeline = [
      'ideation',
      'market-validation',
      'mvp-design',
      'development',
      'launch',
      'growth'
    ];
  }

  async initialize() {
    await super.initialize();
    console.log('  [Startup Team] Initialized with full startup lifecycle pipeline');
  }

  async generateStartup() {
    const projectId = `startup-${Date.now()}`;
    
    const phases = [
      {
        name: 'ideation',
        agents: ['founder-strategist', 'market-researcher'],
        task: 'Generate and validate startup idea',
        output: 'validated-concept.md'
      },
      {
        name: 'market-validation',
        agents: ['market-researcher', 'growth-hacker'],
        task: 'Deep market analysis and competitive research',
        output: 'market-report.md'
      },
      {
        name: 'mvp-design',
        agents: ['product-architect', 'designer'],
        task: 'Design MVP features and user flows',
        output: 'mvp-spec.md'
      },
      {
        name: 'development',
        agents: ['fullstack-dev', 'designer', 'qa-tester'],
        task: 'Build and test MVP',
        output: 'working-mvp'
      },
      {
        name: 'launch',
        agents: ['growth-hacker', 'pitch-specialist'],
        task: 'Prepare launch and investor materials',
        output: 'launch-package'
      }
    ];

    // Execute phases sequentially
    for (const phase of phases) {
      await this.executePhase(projectId, phase);
    }

    return projectId;
  }

  async executePhase(projectId, phase) {
    console.log(`[Startup Team] Phase: ${phase.name}`);
    
    // Spawn phase execution agent
    const task = `You are the Startup Generation Team executing phase: ${phase.name}\n\n` +
      `Task: ${phase.task}\n` +
      `Required Output: ${phase.output}\n\n` +
      `This is part of startup project ${projectId}. Execute with full autonomy.`;
    
    // Would spawn via OpenClaw
    // For now, log the intent
    this.tasks.push({
      id: `${projectId}-${phase.name}`,
      projectId,
      phase: phase.name,
      status: 'active',
      startedAt: new Date().toISOString()
    });
  }
}

// =============================================================================
// NEXUS DEVELOPMENT TEAM
// =============================================================================

class NexusDevTeam extends BaseTeam {
  constructor() {
    super('nexus-development', {
      roles: {
        'pm-lead': 1,              // Product management
        'business-analyst': 2,     // Requirements analysis
        'system-architect': 2,     // High-level design
        'backend-dev': 3,          // Core engine development
        'frontend-dev': 2,         // Dashboard/UI
        'ai-researcher': 2,        // Agent intelligence
        'qa-lead': 2,              // Testing strategy
        'qa-automation': 3,        // Automated testing
        'devops': 2,               // Infrastructure
        'security-engineer': 1,    // Security audits
        'technical-writer': 1      // Documentation
      }
    });
    
    this.backlog = [];
    this.sprints = [];
  }

  async initialize() {
    await super.initialize();
    console.log('  [Dev Team] Initialized with agile development process');
    
    // Start sprint cycle
    this.startSprintCycle();
  }

  startSprintCycle() {
    // 1-week sprints
    setInterval(async () => {
      await this.runSprintPlanning();
      await this.executeSprint();
      await this.runSprintReview();
    }, 604800000);
  }

  async runSprintPlanning() {
    // Analyze backlog, prioritize, assign to team members
    const sprint = {
      id: `sprint-${Date.now()}`,
      startDate: new Date().toISOString(),
      stories: this.backlog.slice(0, 10), // Top 10 priorities
      status: 'planning'
    };
    
    this.sprints.push(sprint);
    console.log(`[Dev Team] Sprint ${sprint.id} planned with ${sprint.stories.length} stories`);
  }

  async executeSprint() {
    const currentSprint = this.sprints[this.sprints.length - 1];
    currentSprint.status = 'active';
    
    // Assign stories to team members
    for (const story of currentSprint.stories) {
      const assignee = this.findBestAssignee(story);
      await this.assignStory(story, assignee);
    }
  }

  findBestAssignee(story) {
    // Find available team member with right skills
    const candidates = Array.from(this.members.entries())
      .filter(([_, m]) => m.status === 'idle')
      .filter(([_, m]) => story.skillsNeeded?.includes(m.role));
    
    return candidates[0]?.[0]; // Return first match
  }

  async assignStory(story, assignee) {
    const task = `You are ${assignee} in the Nexus Dev Team.\n\n` +
      `Story: ${story.title}\n` +
      `Description: ${story.description}\n` +
      `Acceptance Criteria: ${story.criteria.join('\n')}\n\n` +
      `Implement, test, and submit for review.`;
    
    // Spawn execution agent
    console.log(`[Dev Team] Story assigned: ${story.title} → ${assignee}`);
  }

  async runSprintReview() {
    const currentSprint = this.sprints[this.sprints.length - 1];
    
    // Calculate velocity
    const completed = currentSprint.stories.filter(s => s.status === 'done').length;
    const velocity = completed / currentSprint.stories.length;
    
    console.log(`[Dev Team] Sprint complete. Velocity: ${(velocity * 100).toFixed(0)}%`);
    
    // Generate learnings
    this.learnings.push({
      type: 'sprint_retrospective',
      velocity,
      blockers: currentSprint.stories.filter(s => s.blockers?.length > 0),
      timestamp: new Date().toISOString()
    });
  }
}

// =============================================================================
// SOCIAL MEDIA TEAM
// =============================================================================

class SocialMediaTeam extends BaseTeam {
  constructor() {
    super('social-media', {
      roles: {
        'content-strategist': 1,    // Overall strategy
        'trend-researcher': 2,      // What's trending
        'idea-generator': 3,        // Brainstorms content ideas
        'script-writer': 3,         // Writes scripts
        'video-producer': 3,        // Creates videos
        'thumbnail-designer': 2,    // Clickable thumbnails
        'caption-writer': 2,        // Platform-specific captions
        'scheduler': 1,             // Post timing
        'engagement-manager': 2,    // Responds to comments
        'analytics-reviewer': 1,    // Reviews performance
        'cross-promoter': 1         // Promotes across platforms
      }
    });
    
    this.contentPipeline = [
      'research',
      'ideation',
      'scripting',
      'production',
      'post-production',
      'scheduling',
      'publishing',
      'engagement'
    ];
    
    this.channels = ['youtube', 'tiktok', 'twitter', 'linkedin'];
  }

  async initialize() {
    await super.initialize();
    console.log('  [Social Media Team] Initialized with content empire pipeline');
    
    // Start content production loop
    this.startContentProduction();
  }

  startContentProduction() {
    // Continuous content production
    setInterval(async () => {
      await this.produceContentBatch();
    }, 3600000); // Check every hour
  }

  async produceContentBatch() {
    // Check queue depth
    const queueDepth = await this.getQueueDepth();
    
    if (queueDepth < 5) {
      // Produce more content
      const batchSize = 5 - queueDepth;
      
      for (let i = 0; i < batchSize; i++) {
        await this.createContentPiece();
      }
    }
  }

  async createContentPiece() {
    const contentId = `content-${Date.now()}`;
    
    // Phase 1: Research + Ideation
    const trend = await this.researchTrends();
    const idea = await this.generateIdea(trend);
    
    // Phase 2: Scripting
    const scripts = await this.writeScripts(idea);
    
    // Phase 3: Production
    const videos = await this.produceVideos(scripts);
    
    // Phase 4: Post-production
    const finalized = await this.finalizeContent(videos);
    
    // Phase 5: Schedule
    await this.scheduleContent(finalized);
    
    console.log(`[Social Team] Content piece created: ${contentId}`);
  }

  async researchTrends() {
    const task = `You are the Social Media Trend Researcher.\n\n` +
      `Research current trending topics in:\n` +
      `• AI and technology\n` +
      `• Programming and development\n` +
      `• Career and productivity\n` +
      `• Startup and entrepreneurship\n\n` +
      `Return top 3 trending topics with engagement metrics.`;
    
    // Would spawn research agent
    return { topic: 'AI Agents', score: 95 };
  }

  async generateIdea(trend) {
    const task = `You are the Social Media Idea Generator.\n\n` +
      `Trend: ${trend.topic}\n\n` +
      `Generate 5 content ideas (hooks, angles, formats) for this trend.\n` +
      `Consider: educational, entertaining, controversial angles.`;
    
    return { ideas: ['idea1', 'idea2', 'idea3'] };
  }

  async writeScripts(idea) {
    const scripts = {};
    
    for (const channel of this.channels) {
      const task = `You are the Script Writer for ${channel}.\n\n` +
        `Write a script optimized for ${channel} format.\n` +
        `Include: hook, body, CTA\n\n` +
        `Idea: ${JSON.stringify(idea)}`;
      
      scripts[channel] = task;
    }
    
    return scripts;
  }

  async produceVideos(scripts) {
    const videos = {};
    
    for (const [channel, script] of Object.entries(scripts)) {
      const task = `You are the Video Producer for ${channel}.\n\n` +
        `Create a video using Remotion based on this script.\n\n` +
        `Script: ${script}\n\n` +
        `Output: ${channel}-video.mp4`;
      
      videos[channel] = task;
    }
    
    return videos;
  }

  async finalizeContent(videos) {
    const task = `You are the Content Finalizer.\n\n` +
      `Create thumbnails, write captions, generate hashtags.\n\n` +
      `Package everything for scheduling.`;
    
    return videos;
  }

  async scheduleContent(content) {
    const task = `You are the Content Scheduler.\n\n` +
      `Schedule this content for optimal posting times:\n` +
      `• YouTube: 11am EST\n` +
      `• TikTok: 7pm EST\n` +
      `• Twitter: 9am EST\n` +
      `• LinkedIn: 8am EST`;
    
    console.log('[Social Team] Content scheduled');
  }

  async getQueueDepth() {
    // Check how much content is in the queue
    const outputDir = path.join(PROJECTS_DIR, 'social-media', 'queue');
    if (!fs.existsSync(outputDir)) return 0;
    
    const files = fs.readdirSync(outputDir);
    return files.length;
  }
}

// =============================================================================
// EXPORTS
// =============================================================================

module.exports = {
  WorkforceOrchestrator,
  StartupGenerationTeam,
  NexusDevTeam,
  SocialMediaTeam,
  BaseTeam
};

// CLI usage
if (require.main === module) {
  const orchestrator = new WorkforceOrchestrator();
  
  const command = process.argv[2];
  
  switch(command) {
    case 'start':
      orchestrator.startWorkforce();
      break;
    case 'status':
      Promise.all(
        Object.values(orchestrator.teams).map(t => t.getStatus())
      ).then(statuses => {
        console.log(JSON.stringify(statuses, null, 2));
      });
      break;
    case 'startup':
      orchestrator.teams['startup-generation'].generateStartup();
      break;
    default:
      console.log('Usage: node workforce-orchestrator.js [start|status|startup]');
  }
}
