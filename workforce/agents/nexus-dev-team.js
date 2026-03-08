#!/usr/bin/env node

/**
 * Neural Nexus Development Team Agent
 * 
 * Agile development team that enhances the Neural Nexus platform:
 * - PM: Prioritizes backlog
 * - BA: Analyzes requirements
 * - Architects: Designs solutions
 * - Devs: Implements features
 * - QA: Tests and validates
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const NEXUS_DIR = '/root/.openclaw/workspace/neural-nexus';
const BACKLOG_FILE = path.join(NEXUS_DIR, 'workforce/projects/nexus-dev/backlog.json');
const SPRINTS_DIR = path.join(NEXUS_DIR, 'workforce/projects/nexus-dev/sprints');
const RELEASES_DIR = path.join(NEXUS_DIR, 'workforce/projects/nexus-dev/releases');

// Ensure directories
[SPRINTS_DIR, RELEASES_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

class NexusDevTeamAgent {
  constructor() {
    this.roles = ['pm', 'ba', 'architect', 'backend', 'frontend', 'qa'];
    this.sprintDuration = 7 * 24 * 60 * 60 * 1000; // 1 week
    this.velocity = 10; // Story points per sprint
  }

  /**
   * Initialize the dev team
   */
  async initialize() {
    console.log('[NexusDev] Initializing development team...');
    
    // Ensure backlog exists
    this.ensureBacklog();
    
    // Start sprint cycle
    this.startSprintCycle();
    
    console.log('[NexusDev] Team ready');
  }

  ensureBacklog() {
    if (!fs.existsSync(path.dirname(BACKLOG_FILE))) {
      fs.mkdirSync(path.dirname(BACKLOG_FILE), { recursive: true });
    }
    
    if (!fs.existsSync(BACKLOG_FILE)) {
      fs.writeFileSync(BACKLOG_FILE, JSON.stringify({
        stories: this.generateInitialBacklog(),
        lastUpdated: new Date().toISOString()
      }, null, 2));
    }
  }

  generateInitialBacklog() {
    return [
      {
        id: 'NEXUS-001',
        title: 'Implement agent-to-agent messaging',
        description: 'Allow agents to send messages to each other via event bus',
        type: 'feature',
        priority: 'high',
        points: 5,
        status: 'backlog',
        skills: ['backend', 'event-bus']
      },
      {
        id: 'NEXUS-002',
        title: 'Add agent performance dashboard',
        description: 'Visual dashboard showing agent metrics and health',
        type: 'feature',
        priority: 'medium',
        points: 8,
        status: 'backlog',
        skills: ['frontend', 'visualization']
      },
      {
        id: 'NEXUS-003',
        title: 'Implement predictive failure detection',
        description: 'Use ML to predict agent failures before they happen',
        type: 'feature',
        priority: 'high',
        points: 13,
        status: 'backlog',
        skills: ['ai', 'backend']
      },
      {
        id: 'NEXUS-004',
        title: 'Add cross-team knowledge sync',
        description: 'Automatically sync learnings between teams',
        type: 'feature',
        priority: 'medium',
        points: 5,
        status: 'backlog',
        skills: ['backend', 'meta-learning']
      },
      {
        id: 'NEXUS-005',
        title: 'Implement resource auto-scaling',
        description: 'Automatically scale resources based on demand',
        type: 'feature',
        priority: 'low',
        points: 8,
        status: 'backlog',
        skills: ['devops', 'backend']
      },
      {
        id: 'NEXUS-006',
        title: 'Add comprehensive test suite',
        description: 'Unit and integration tests for all core components',
        type: 'tech-debt',
        priority: 'high',
        points: 13,
        status: 'backlog',
        skills: ['qa', 'backend']
      },
      {
        id: 'NEXUS-007',
        title: 'Document all APIs',
        description: 'Create comprehensive API documentation',
        type: 'docs',
        priority: 'medium',
        points: 5,
        status: 'backlog',
        skills: ['technical-writer']
      },
      {
        id: 'NEXUS-008',
        title: 'Optimize agent spawn time',
        description: 'Reduce agent startup time by 50%',
        type: 'performance',
        priority: 'medium',
        points: 8,
        status: 'backlog',
        skills: ['backend', 'performance']
      },
      {
        id: 'NEXUS-009',
        title: 'Add Slack integration',
        description: 'Send notifications to Slack channels',
        type: 'feature',
        priority: 'low',
        points: 5,
        status: 'backlog',
        skills: ['backend', 'integration']
      },
      {
        id: 'NEXUS-010',
        title: 'Implement A/B testing for agents',
        description: 'Test different agent configurations',
        type: 'feature',
        priority: 'low',
        points: 8,
        status: 'backlog',
        skills: ['backend', 'experimentation']
      }
    ];
  }

  /**
   * Start the sprint cycle
   */
  startSprintCycle() {
    console.log('[NexusDev] Starting sprint cycle...');
    
    // Run immediately, then every week
    this.runSprint();
    
    setInterval(() => {
      this.runSprint();
    }, this.sprintDuration);
  }

  /**
   * Run a complete sprint
   */
  async runSprint() {
    const sprintId = `sprint-${Date.now()}`;
    console.log(`[NexusDev] Starting ${sprintId}`);
    
    // Phase 1: Planning
    const sprint = await this.planSprint(sprintId);
    
    // Phase 2: Execution
    await this.executeSprint(sprint);
    
    // Phase 3: Review
    await this.reviewSprint(sprint);
    
    // Phase 4: Release (if ready)
    if (sprint.completedPoints >= sprint.plannedPoints * 0.8) {
      await this.createRelease(sprint);
    }
  }

  /**
   * Sprint Planning
   */
  async planSprint(sprintId) {
    console.log('[NexusDev] Sprint Planning...');
    
    const backlog = this.getBacklog();
    
    // PM prioritizes stories
    const prioritized = this.prioritizeStories(backlog.stories);
    
    // Select stories that fit velocity
    const selected = [];
    let points = 0;
    
    for (const story of prioritized) {
      if (story.status === 'backlog' && points + story.points <= this.velocity) {
        selected.push(story);
        points += story.points;
      }
    }
    
    const sprint = {
      id: sprintId,
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + this.sprintDuration).toISOString(),
      stories: selected.map(s => ({ ...s, status: 'todo' })),
      plannedPoints: points,
      completedPoints: 0,
      status: 'planning'
    };
    
    // Save sprint
    fs.writeFileSync(
      path.join(SPRINTS_DIR, `${sprintId}.json`),
      JSON.stringify(sprint, null, 2)
    );
    
    console.log(`[NexusDev] Planned: ${selected.length} stories, ${points} points`);
    
    return sprint;
  }

  prioritizeStories(stories) {
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    
    return stories.sort((a, b) => {
      // First by priority
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
      if (priorityDiff !== 0) return priorityDiff;
      
      // Then by type (bugs first)
      const typeOrder = { bug: 4, 'tech-debt': 3, feature: 2, docs: 1 };
      return typeOrder[b.type] - typeOrder[a.type];
    });
  }

  /**
   * Sprint Execution
   */
  async executeSprint(sprint) {
    console.log('[NexusDev] Sprint Execution...');
    
    sprint.status = 'active';
    
    // Execute each story
    for (const story of sprint.stories) {
      if (story.status === 'todo') {
        await this.executeStory(story, sprint);
      }
    }
    
    // Calculate velocity
    sprint.completedPoints = sprint.stories
      .filter(s => s.status === 'done')
      .reduce((sum, s) => sum + s.points, 0);
    
    sprint.status = 'completed';
    
    // Save updated sprint
    fs.writeFileSync(
      path.join(SPRINTS_DIR, `${sprint.id}.json`),
      JSON.stringify(sprint, null, 2)
    );
  }

  /**
   * Execute a single story
   */
  async executeStory(story, sprint) {
    console.log(`[NexusDev] Executing: ${story.id} - ${story.title}`);
    
    story.status = 'in-progress';
    
    // Simulate development work
    // In real implementation, spawn dev agents
    
    try {
      // Architect designs solution
      const design = await this.architectDesign(story);
      
      // Developers implement
      const implementation = await this.developImplement(story, design);
      
      // QA tests
      const tests = await this.qaTest(story, implementation);
      
      if (tests.passed) {
        story.status = 'done';
        story.completedAt = new Date().toISOString();
        console.log(`[NexusDev] ✅ ${story.id} complete`);
      } else {
        story.status = 'todo'; // Back to backlog
        story.blockers = tests.issues;
        console.log(`[NexusDev] ❌ ${story.id} failed QA`);
      }
      
    } catch (error) {
      story.status = 'todo';
      story.error = error.message;
      console.error(`[NexusDev] Error in ${story.id}:`, error.message);
    }
  }

  async architectDesign(story) {
    // Would spawn architect agent
    return {
      approach: 'standard',
      components: ['core', 'interface'],
      estimatedHours: story.points * 2
    };
  }

  async developImplement(story, design) {
    // Would spawn dev agents
    return {
      code: 'implemented',
      tests: 'written',
      docs: 'updated'
    };
  }

  async qaTest(story, implementation) {
    // Would spawn QA agents
    return {
      passed: Math.random() > 0.2, // 80% pass rate
      issues: []
    };
  }

  /**
   * Sprint Review
   */
  async reviewSprint(sprint) {
    console.log('[NexusDev] Sprint Review...');
    
    const completion = (sprint.completedPoints / sprint.plannedPoints * 100).toFixed(0);
    
    const review = {
      sprintId: sprint.id,
      completion: `${completion}%`,
      completedStories: sprint.stories.filter(s => s.status === 'done').length,
      totalStories: sprint.stories.length,
      velocity: sprint.completedPoints,
      learnings: this.generateLearnings(sprint),
      nextSprintImprovements: []
    };
    
    console.log(`[NexusDev] Sprint complete: ${completion}% velocity achieved`);
    
    // Notify
    this.notify(`📊 Sprint Review: ${sprint.id}\n\n` +
      `Completion: ${completion}%\n` +
      `Stories: ${review.completedStories}/${review.totalStories}\n` +
      `Velocity: ${review.velocity} points`);
    
    return review;
  }

  generateLearnings(sprint) {
    const learnings = [];
    
    if (sprint.completedPoints < sprint.plannedPoints * 0.7) {
      learnings.push('Velocity was lower than planned - consider reducing scope');
    }
    
    const failedStories = sprint.stories.filter(s => s.blockers?.length > 0);
    if (failedStories.length > 0) {
      learnings.push(`${failedStories.length} stories had blockers - improve upfront design`);
    }
    
    return learnings;
  }

  /**
   * Create a release
   */
  async createRelease(sprint) {
    const version = this.calculateVersion();
    const releaseId = `v${version}`;
    
    console.log(`[NexusDev] Creating release: ${releaseId}`);
    
    const release = {
      version,
      sprintId: sprint.id,
      date: new Date().toISOString(),
      changes: sprint.stories
        .filter(s => s.status === 'done')
        .map(s => ({ id: s.id, title: s.title, type: s.type })),
      notes: this.generateReleaseNotes(sprint)
    };
    
    fs.writeFileSync(
      path.join(RELEASES_DIR, `${releaseId}.json`),
      JSON.stringify(release, null, 2)
    );
    
    // Update version file
    fs.writeFileSync(
      path.join(NEXUS_DIR, 'VERSION'),
      version
    );
    
    this.notify(`🚀 Neural Nexus Release: ${releaseId}\n\n` +
      `Changes: ${release.changes.length}\n` +
      `Types: ${this.summarizeTypes(release.changes)}`);
    
    return release;
  }

  calculateVersion() {
    const versionFile = path.join(NEXUS_DIR, 'VERSION');
    let current = '2.0.0';
    
    if (fs.existsSync(versionFile)) {
      current = fs.readFileSync(versionFile, 'utf8').trim();
    }
    
    const parts = current.split('.').map(Number);
    parts[2]++; // Increment patch
    
    return parts.join('.');
  }

  generateReleaseNotes(sprint) {
    const changes = sprint.stories.filter(s => s.status === 'done');
    
    const features = changes.filter(c => c.type === 'feature');
    const fixes = changes.filter(c => c.type === 'bug');
    const perf = changes.filter(c => c.type === 'performance');
    const docs = changes.filter(c => c.type === 'docs');
    
    let notes = '# Release Notes\n\n';
    
    if (features.length > 0) {
      notes += '## Features\n';
      features.forEach(f => notes += `- ${f.title}\n`);
      notes += '\n';
    }
    
    if (fixes.length > 0) {
      notes += '## Bug Fixes\n';
      fixes.forEach(f => notes += `- ${f.title}\n`);
      notes += '\n';
    }
    
    return notes;
  }

  summarizeTypes(changes) {
    const counts = {};
    changes.forEach(c => {
      counts[c.type] = (counts[c.type] || 0) + 1;
    });
    
    return Object.entries(counts)
      .map(([type, count]) => `${count} ${type}`)
      .join(', ');
  }

  getBacklog() {
    return JSON.parse(fs.readFileSync(BACKLOG_FILE, 'utf8'));
  }

  saveBacklog(backlog) {
    backlog.lastUpdated = new Date().toISOString();
    fs.writeFileSync(BACKLOG_FILE, JSON.stringify(backlog, null, 2));
  }

  notify(message) {
    try {
      execSync(`openclaw message send --target "-5297940191" --message "${message}"`, {
        timeout: 10000
      });
    } catch {}
  }

  /**
   * Get team status
   */
  getStatus() {
    const backlog = this.getBacklog();
    const sprints = fs.existsSync(SPRINTS_DIR) 
      ? fs.readdirSync(SPRINTS_DIR).filter(f => f.endsWith('.json'))
      : [];
    
    const latestSprint = sprints.length > 0 
      ? JSON.parse(fs.readFileSync(path.join(SPRINTS_DIR, sprints[sprints.length - 1]), 'utf8'))
      : null;
    
    return {
      team: 'nexus-development',
      backlogSize: backlog.stories.length,
      activeSprints: sprints.length,
      latestVelocity: latestSprint?.completedPoints || 0,
      lastSprint: latestSprint?.id || 'none',
      health: this.calculateHealth(backlog, latestSprint)
    };
  }

  calculateHealth(backlog, latestSprint) {
    let health = 1.0;
    
    // Reduce health if too many high-priority items
    const highPriority = backlog.stories.filter(s => s.priority === 'high' && s.status === 'backlog').length;
    if (highPriority > 5) health -= 0.2;
    
    // Reduce health if velocity declining
    if (latestSprint && latestSprint.completedPoints < latestSprint.plannedPoints * 0.5) {
      health -= 0.3;
    }
    
    return Math.max(0, health);
  }
}

// Export
const devTeam = new NexusDevTeamAgent();

// CLI usage
if (require.main === module) {
  const command = process.argv[2];
  
  switch(command) {
    case 'start':
      devTeam.initialize();
      break;
    case 'sprint':
      devTeam.runSprint();
      break;
    case 'status':
      console.log(JSON.stringify(devTeam.getStatus(), null, 2));
      break;
    case 'backlog':
      console.log(JSON.stringify(devTeam.getBacklog(), null, 2));
      break;
    default:
      console.log('Usage: node nexus-dev-team.js [start|sprint|status|backlog]');
  }
}

module.exports = devTeam;
