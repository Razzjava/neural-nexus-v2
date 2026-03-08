#!/usr/bin/env node

/**
 * Neural Nexus Self-Healing Orchestrator v2.0
 * 
 * An AI-driven orchestrator that:
 * - Diagnoses failures and spawns repair agents
 * - Dynamically creates specialized agents for tasks
 * - Evolves agent behavior based on performance patterns
 * - Maintains a registry of agent DNA (capabilities + performance history)
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { EventBus, StateStore } = require('./event-bus');
const qualityGate = require('./quality-gate');

const WORKSPACE = '/root/.openclaw/workspace';
const NEXUS_DIR = path.join(WORKSPACE, 'neural-nexus');
const AGENTS_DIR = path.join(NEXUS_DIR, 'agents');
const DNA_DIR = path.join(NEXUS_DIR, 'dna');
const LOG_DIR = path.join(NEXUS_DIR, 'logs');

// Ensure directories exist
[DNA_DIR, LOG_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

class SelfHealingOrchestrator {
  constructor() {
    this.bus = new EventBus('orchestrator-v2');
    this.store = new StateStore();
    this.agentDNA = this.loadAgentDNA();
    this.failureHistory = [];
    this.repairAgents = new Map();
    
    // Subscribe to system events
    this.bus.subscribe(['AGENT_FAILED', 'AGENT_COMPLETED', 'QUALITY_REJECTED', 'HEALING_REQUIRED'], 
      this.handleEvent.bind(this));
  }

  /**
   * Load agent DNA from disk (or initialize defaults)
   */
  loadAgentDNA() {
    const dnaFile = path.join(DNA_DIR, 'agent-registry.json');
    if (fs.existsSync(dnaFile)) {
      return JSON.parse(fs.readFileSync(dnaFile, 'utf8'));
    }
    return this.initializeDefaultDNA();
  }

  /**
   * Initialize default agent DNA with base capabilities
   */
  initializeDefaultDNA() {
    const defaults = {
      'research-specialist': {
        capabilities: ['web-search', 'trend-analysis', 'data-synthesis'],
        successRate: 0.85,
        avgQuality: 8.2,
        avgDuration: 180,
        mutations: 0,
        lineage: ['base-research-v1'],
        specializationScore: 0.7,
        failurePatterns: []
      },
      'script-writer': {
        capabilities: ['copywriting', 'hook-optimization', 'platform-adaptation'],
        successRate: 0.90,
        avgQuality: 8.5,
        avgDuration: 120,
        mutations: 0,
        lineage: ['base-script-v1'],
        specializationScore: 0.8,
        failurePatterns: []
      },
      'video-producer': {
        capabilities: ['remotion', 'visual-design', 'rendering', 'composition'],
        successRate: 0.75,
        avgQuality: 7.8,
        avgDuration: 1800,
        mutations: 0,
        lineage: ['base-video-v1'],
        specializationScore: 0.6,
        failurePatterns: []
      },
      'code-architect': {
        capabilities: ['system-design', 'code-generation', 'refactoring', 'debugging'],
        successRate: 0.88,
        avgQuality: 8.7,
        avgDuration: 300,
        mutations: 0,
        lineage: ['base-code-v1'],
        specializationScore: 0.9,
        failurePatterns: []
      },
      'healing-specialist': {
        capabilities: ['failure-analysis', 'root-cause-diagnosis', 'repair-strategy', 'dna-mutation'],
        successRate: 0.95,
        avgQuality: 9.0,
        avgDuration: 240,
        mutations: 0,
        lineage: ['base-healer-v1'],
        specializationScore: 0.95,
        failurePatterns: [],
        isMetaAgent: true
      }
    };
    
    this.saveAgentDNA(defaults);
    return defaults;
  }

  saveAgentDNA(dna = this.agentDNA) {
    fs.writeFileSync(path.join(DNA_DIR, 'agent-registry.json'), JSON.stringify(dna, null, 2));
  }

  /**
   * Handle system events
   */
  async handleEvent(payload, event) {
    this.log('event_received', event.type, { payload });
    
    switch(event.type) {
      case 'AGENT_FAILED':
        await this.handleAgentFailure(payload);
        break;
      case 'QUALITY_REJECTED':
        await this.handleQualityRejection(payload);
        break;
      case 'AGENT_COMPLETED':
        await this.updateAgentDNA(payload.agent, payload.metrics);
        break;
      case 'HEALING_REQUIRED':
        await this.spawnHealingAgent(payload);
        break;
    }
  }

  /**
   * Handle agent failure with intelligent diagnosis
   */
  async handleAgentFailure(failure) {
    const { agent, error, task, context } = failure;
    
    // Record failure pattern
    this.failureHistory.push({
      timestamp: new Date().toISOString(),
      agent,
      error: error.message,
      errorType: this.classifyError(error),
      task,
      context
    });

    // Limit history size
    if (this.failureHistory.length > 100) {
      this.failureHistory.shift();
    }

    // Analyze failure
    const diagnosis = this.diagnoseFailure(failure);
    this.log('failure_diagnosed', agent, diagnosis);

    // Decide on healing strategy
    if (diagnosis.requiresHealing) {
      await this.spawnHealingAgent({
        targetAgent: agent,
        diagnosis,
        failure,
        priority: diagnosis.severity
      });
    } else if (diagnosis.canRetry) {
      await this.retryWithMutation(agent, task, diagnosis.suggestedMutation);
    }
  }

  /**
   * Classify error type for pattern matching
   */
  classifyError(error) {
    const msg = error.message.toLowerCase();
    
    if (msg.includes('timeout') || msg.includes('etimedout')) return 'TIMEOUT';
    if (msg.includes('enoent') || msg.includes('not found')) return 'MISSING_RESOURCE';
    if (msg.includes('econnrefused') || msg.includes('enotfound')) return 'NETWORK';
    if (msg.includes('permission') || msg.includes('eacces')) return 'PERMISSION';
    if (msg.includes('memory') || msg.includes('heap')) return 'RESOURCE_EXHAUSTION';
    if (msg.includes('parse') || msg.includes('syntax') || msg.includes('unexpected')) return 'PARSE_ERROR';
    if (msg.includes('rate limit') || msg.includes('429')) return 'RATE_LIMIT';
    return 'UNKNOWN';
  }

  /**
   * Diagnose failure and suggest healing strategy
   */
  diagnoseFailure(failure) {
    const { agent, error, task } = failure;
    const errorType = this.classifyError(error);
    const dna = this.agentDNA[agent] || {};
    
    // Check for recurring pattern
    const recentFailures = this.failureHistory.filter(f => 
      f.agent === agent && 
      f.errorType === errorType &&
      new Date(f.timestamp) > Date.now() - 86400000 // 24 hours
    );
    
    const isPattern = recentFailures.length >= 3;
    
    // Determine severity
    let severity = 'low';
    if (isPattern) severity = 'critical';
    else if (recentFailures.length >= 2) severity = 'high';
    else if (errorType === 'RESOURCE_EXHAUSTION') severity = 'high';
    
    // Determine strategy
    let strategy = 'retry';
    let mutation = null;
    
    switch(errorType) {
      case 'TIMEOUT':
        strategy = isPattern ? 'heal' : 'retry';
        mutation = { timeoutMultiplier: 1.5, complexityReduction: 0.2 };
        break;
      case 'MISSING_RESOURCE':
        strategy = 'heal';
        break;
      case 'NETWORK':
        strategy = 'retry';
        mutation = { retryBackoff: 'exponential', maxRetries: 5 };
        break;
      case 'RESOURCE_EXHAUSTION':
        strategy = 'heal';
        mutation = { memoryOptimization: true, batchSizeReduction: 0.5 };
        break;
      case 'RATE_LIMIT':
        strategy = 'retry';
        mutation = { rateLimitDelay: 60000, requestBatching: true };
        break;
      case 'PARSE_ERROR':
        strategy = 'heal';
        break;
      default:
        strategy = isPattern ? 'heal' : 'retry';
    }
    
    return {
      errorType,
      isPattern,
      severity,
      requiresHealing: strategy === 'heal',
      canRetry: strategy === 'retry',
      suggestedMutation: mutation,
      confidence: isPattern ? 0.9 : 0.6,
      recommendedAction: strategy === 'heal' 
        ? `Spawn healing specialist for ${agent}`
        : `Retry with mutation: ${JSON.stringify(mutation)}`
    };
  }

  /**
   * Spawn a healing agent to diagnose and repair
   */
  async spawnHealingAgent(healingRequest) {
    const { targetAgent, diagnosis, failure, priority } = healingRequest;
    
    this.log('spawning_healer', targetAgent, { priority, diagnosis });
    
    // Create healing agent task
    const healingTask = {
      type: 'HEALING_MISSION',
      targetAgent,
      diagnosis,
      failure,
      dnaSnapshot: this.agentDNA[targetAgent],
      failureHistory: this.failureHistory.filter(f => f.agent === targetAgent).slice(-10),
      healingId: `heal-${Date.now()}`
    };

    // Spawn healing specialist via OpenClaw
    try {
      const spawnCmd = `openclaw sessions spawn --mode run --timeout 300 --task "${this.escapeForShell(
        `You are a Healing Specialist Agent in the Neural Nexus system. ` +
        `Your mission: Repair agent '${targetAgent}' which has been failing with ${diagnosis.errorType} errors.\n\n` +
        `Failure Context:\n${JSON.stringify(failure, null, 2)}\n\n` +
        `Diagnosis:\n${JSON.stringify(diagnosis, null, 2)}\n\n` +
        `Agent DNA:\n${JSON.stringify(this.agentDNA[targetAgent], null, 2)}\n\n` +
        `Your tasks:\n` +
        `1. Analyze the root cause of the failure\n` +
        `2. Examine the agent's code and configuration\n` +
        `3. Propose specific fixes (code patches, config changes, strategy adjustments)\n` +
        `4. Apply the fixes\n` +
        `5. Test the repaired agent\n` +
        `6. Report success/failure with detailed findings\n\n` +
        `Use tools freely. You have full repair authority.`
      )}"`;
      
      execSync(spawnCmd, { timeout: 10000 });
      
      this.repairAgents.set(healingTask.healingId, {
        targetAgent,
        status: 'spawned',
        startedAt: new Date().toISOString()
      });
      
      this.log('healer_spawned', targetAgent, { healingId: healingTask.healingId });
      
    } catch (error) {
      this.log('healer_spawn_failed', targetAgent, { error: error.message });
      // Fallback: self-heal
      await this.attemptSelfHeal(targetAgent, diagnosis);
    }
  }

  /**
   * Retry a task with DNA mutation
   */
  async retryWithMutation(agent, task, mutation) {
    this.log('retry_with_mutation', agent, { mutation });
    
    // Apply mutation to execution context
    const mutatedContext = {
      ...task.context,
      mutation,
      attempt: (task.context?.attempt || 0) + 1
    };
    
    // Spawn retry agent with mutated DNA
    const spawnCmd = `openclaw sessions spawn --mode run --timeout ${task.timeout || 300} --task "${this.escapeForShell(
      `You are ${agent} (mutated version). Execute your task with these adjustments:\n` +
      `Mutation: ${JSON.stringify(mutation)}\n` +
      `Original Task: ${JSON.stringify(task)}\n\n` +
      `Apply the mutation to your execution strategy.`
    )}"`;
    
    try {
      execSync(spawnCmd, { timeout: 10000 });
      this.log('retry_spawned', agent, { mutation });
    } catch (error) {
      this.log('retry_spawn_failed', agent, { error: error.message });
    }
  }

  /**
   * Attempt self-healing when healing agent spawn fails
   */
  async attemptSelfHeal(agent, diagnosis) {
    this.log('attempting_self_heal', agent, diagnosis);
    
    // Basic self-healing strategies
    switch(diagnosis.errorType) {
      case 'TIMEOUT':
        // Increase default timeouts in DNA
        if (this.agentDNA[agent]) {
          this.agentDNA[agent].avgDuration *= 1.2;
          this.saveAgentDNA();
        }
        break;
      case 'MISSING_RESOURCE':
        // Mark agent as needing resource check
        this.bus.publish('RESOURCE_CHECK_REQUIRED', { agent });
        break;
      case 'NETWORK':
        // Enable more aggressive retry
        break;
    }
  }

  /**
   * Handle quality rejection - agent output didn't pass quality gate
   */
  async handleQualityRejection(rejection) {
    const { agent, output, review, feedback } = rejection;
    
    this.log('quality_rejected', agent, { score: review.overallScore, feedback });
    
    // Update DNA with quality issue
    if (!this.agentDNA[agent].qualityIssues) {
      this.agentDNA[agent].qualityIssues = [];
    }
    
    this.agentDNA[agent].qualityIssues.push({
      timestamp: new Date().toISOString(),
      score: review.overallScore,
      feedback,
      outputType: typeof output
    });
    
    // Trigger improvement cycle
    await this.spawnImprovementAgent(agent, rejection);
  }

  /**
   * Spawn an agent to improve quality
   */
  async spawnImprovementAgent(agent, rejection) {
    this.log('spawning_improver', agent);
    
    const spawnCmd = `openclaw sessions spawn --mode run --timeout 300 --task "${this.escapeForShell(
      `You are a Quality Improvement Agent. Improve the output quality of '${agent}'.\n\n` +
      `Quality Review:\n${JSON.stringify(rejection.review, null, 2)}\n\n` +
      `Feedback: ${rejection.feedback.join(', ')}\n\n` +
      `Your tasks:\n` +
      `1. Analyze why the output failed quality checks\n` +
      `2. Review the agent's generation logic\n` +
      `3. Implement specific improvements to address: ${rejection.feedback.join(', ')}\n` +
      `4. Regenerate the output with improvements\n` +
      `5. Submit for quality review`
    )}"`;
    
    try {
      execSync(spawnCmd, { timeout: 10000 });
      this.log('improver_spawned', agent);
    } catch (error) {
      this.log('improver_spawn_failed', agent, { error: error.message });
    }
  }

  /**
   * Update agent DNA based on performance metrics
   */
  async updateAgentDNA(agent, metrics) {
    if (!this.agentDNA[agent]) {
      // Auto-register new agent
      this.agentDNA[agent] = this.generateDefaultDNA(agent);
    }
    
    const dna = this.agentDNA[agent];
    
    // Update rolling averages
    const alpha = 0.3; // Learning rate
    dna.successRate = (dna.successRate * (1 - alpha)) + (metrics.success ? alpha : 0);
    dna.avgQuality = (dna.avgQuality * (1 - alpha)) + ((metrics.score || 7) * alpha);
    dna.avgDuration = (dna.avgDuration * (1 - alpha)) + ((metrics.duration || 300) * alpha);
    
    // Track performance trend
    if (!dna.performanceHistory) dna.performanceHistory = [];
    dna.performanceHistory.push({
      timestamp: new Date().toISOString(),
      success: metrics.success,
      score: metrics.score,
      duration: metrics.duration
    });
    
    // Keep last 50 entries
    if (dna.performanceHistory.length > 50) {
      dna.performanceHistory.shift();
    }
    
    // Check for evolution opportunity
    if (this.shouldEvolve(agent, dna)) {
      await this.evolveAgent(agent, dna);
    }
    
    this.saveAgentDNA();
    this.log('dna_updated', agent, { 
      successRate: dna.successRate.toFixed(2),
      avgQuality: dna.avgQuality.toFixed(2)
    });
  }

  /**
   * Check if agent should evolve
   */
  shouldEvolve(agent, dna) {
    // Evolve if:
    // 1. Success rate is consistently high (ready for more complexity)
    // 2. Success rate is consistently low (needs simplification)
    // 3. Hasn't evolved in a while and has enough data
    
    const recent = dna.performanceHistory?.slice(-10) || [];
    if (recent.length < 10) return false;
    
    const recentSuccessRate = recent.filter(r => r.success).length / recent.length;
    const lastEvolution = dna.lastEvolution ? new Date(dna.lastEvolution) : new Date(0);
    const daysSinceEvolution = (Date.now() - lastEvolution) / 86400000;
    
    // High performer ready for complexity
    if (recentSuccessRate > 0.95 && dna.specializationScore < 0.95 && daysSinceEvolution > 7) {
      return 'complexity_increase';
    }
    
    // Low performer needs help
    if (recentSuccessRate < 0.7 && daysSinceEvolution > 3) {
      return 'simplification';
    }
    
    // Stale agent needs refresh
    if (daysSinceEvolution > 30) {
      return 'refresh';
    }
    
    return false;
  }

  /**
   * Evolve agent to next version
   */
  async evolveAgent(agent, dna) {
    const evolutionType = this.shouldEvolve(agent, dna);
    
    this.log('evolving_agent', agent, { evolutionType });
    
    // Create new generation
    const newGeneration = dna.lineage.length + 1;
    const newVersion = `${agent}-v${newGeneration}`;
    
    // Mutation based on evolution type
    const mutations = [];
    
    switch(evolutionType) {
      case 'complexity_increase':
        mutations.push({ type: 'capability_add', value: this.suggestNewCapability(agent) });
        mutations.push({ type: 'specialization_boost', value: 0.1 });
        break;
      case 'simplification':
        mutations.push({ type: 'focus_narrow', value: 'most_successful_task_type' });
        mutations.push({ type: 'complexity_reduce', value: 0.3 });
        break;
      case 'refresh':
        mutations.push({ type: 'exploration', value: 'new_strategy' });
        break;
    }
    
    // Record evolution
    dna.lineage.push(newVersion);
    dna.mutations++;
    dna.lastEvolution = new Date().toISOString();
    dna.evolutionHistory = dna.evolutionHistory || [];
    dna.evolutionHistory.push({
      timestamp: dna.lastEvolution,
      type: evolutionType,
      mutations,
      version: newVersion
    });
    
    // Spawn evolution agent to implement changes
    const spawnCmd = `openclaw sessions spawn --mode run --timeout 600 --task "${this.escapeForShell(
      `You are an Agent Evolution Specialist. Evolve agent '${agent}' to version ${newVersion}.\n\n` +
      `Evolution Type: ${evolutionType}\n` +
      `Mutations: ${JSON.stringify(mutations)}\n` +
      `Current DNA: ${JSON.stringify(dna, null, 2)}\n\n` +
      `Your tasks:\n` +
      `1. Review the agent's current implementation\n` +
      `2. Apply the specified mutations\n` +
      `3. Update code, config, or strategy as needed\n` +
      `4. Test the evolved agent\n` +
      `5. Report the changes made`
    )}"`;
    
    try {
      execSync(spawnCmd, { timeout: 10000 });
      this.log('evolution_spawned', agent, { newVersion });
    } catch (error) {
      this.log('evolution_spawn_failed', agent, { error: error.message });
    }
    
    this.saveAgentDNA();
  }

  /**
   * Suggest a new capability based on agent history and system needs
   */
  suggestNewCapability(agent) {
    const capabilities = {
      'research-specialist': ['sentiment-analysis', 'predictive-trending', 'cross-platform-sync'],
      'script-writer': ['audience-personalization', 'a-b-testing', 'viral-pattern-matching'],
      'video-producer': ['auto-thumbnail', 'caption-generation', 'format-adaptation'],
      'code-architect': ['security-scanning', 'performance-profiling', 'documentation-gen']
    };
    
    const agentCaps = capabilities[agent] || ['learning', 'adaptation'];
    const dna = this.agentDNA[agent];
    
    // Suggest capability not already present
    return agentCaps.find(cap => !dna.capabilities.includes(cap)) || agentCaps[0];
  }

  /**
   * Generate default DNA for new agent
   */
  generateDefaultDNA(agentName) {
    return {
      capabilities: ['base-execution', 'error-handling'],
      successRate: 0.5,
      avgQuality: 5.0,
      avgDuration: 300,
      mutations: 0,
      lineage: [`${agentName}-genesis`],
      specializationScore: 0.3,
      failurePatterns: [],
      createdAt: new Date().toISOString()
    };
  }

  /**
   * Dynamic agent spawning - create purpose-built agents
   */
  async spawnDynamicAgent(requirements) {
    const { purpose, capabilitiesNeeded, task, priority = 'normal' } = requirements;
    
    this.log('spawning_dynamic_agent', purpose, { capabilities: capabilitiesNeeded });
    
    // Check if existing agent can handle this
    const matchingAgent = this.findMatchingAgent(capabilitiesNeeded);
    if (matchingAgent && priority !== 'critical') {
      this.log('reusing_existing_agent', matchingAgent);
      return { agent: matchingAgent, reused: true };
    }
    
    // Generate unique agent name
    const agentName = `${purpose.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}`;
    
    // Create DNA for new agent
    this.agentDNA[agentName] = {
      capabilities: capabilitiesNeeded,
      purpose,
      successRate: 0.5, // Unknown
      avgQuality: 5.0,
      avgDuration: 300,
      mutations: 0,
      lineage: ['dynamic-genesis'],
      specializationScore: 0.3,
      failurePatterns: [],
      isDynamic: true,
      createdFor: task,
      createdAt: new Date().toISOString()
    };
    
    this.saveAgentDNA();
    
    // Spawn the dynamic agent
    const spawnCmd = `openclaw sessions spawn --mode run --timeout ${requirements.timeout || 600} --task "${this.escapeForShell(
      `You are a dynamically spawned agent: ${agentName}\n` +
      `Purpose: ${purpose}\n` +
      `Capabilities: ${capabilitiesNeeded.join(', ')}\n\n` +
      `Task: ${JSON.stringify(task, null, 2)}\n\n` +
      `Execute the task using your capabilities. Report success/failure with metrics.`
    )}"`;
    
    try {
      execSync(spawnCmd, { timeout: 10000 });
      this.log('dynamic_agent_spawned', agentName);
      return { agent: agentName, reused: false };
    } catch (error) {
      this.log('dynamic_agent_spawn_failed', agentName, { error: error.message });
      throw error;
    }
  }

  /**
   * Find existing agent matching capability requirements
   */
  findMatchingAgent(requiredCapabilities) {
    let bestMatch = null;
    let bestScore = 0;
    
    for (const [name, dna] of Object.entries(this.agentDNA)) {
      const matchScore = requiredCapabilities.filter(cap => 
        dna.capabilities.includes(cap)
      ).length / requiredCapabilities.length;
      
      if (matchScore > bestScore && matchScore >= 0.8 && dna.successRate > 0.7) {
        bestScore = matchScore;
        bestMatch = name;
      }
    }
    
    return bestMatch;
  }

  /**
   * Get system health and recommendations
   */
  getSystemHealth() {
    const agents = Object.entries(this.agentDNA);
    const healthyAgents = agents.filter(([_, dna]) => dna.successRate > 0.8);
    const strugglingAgents = agents.filter(([_, dna]) => dna.successRate < 0.6);
    
    const recommendations = [];
    
    if (strugglingAgents.length > 0) {
      recommendations.push(`Focus healing on: ${strugglingAgents.map(([name]) => name).join(', ')}`);
    }
    
    if (this.failureHistory.length > 20) {
      const patterns = this.analyzeFailurePatterns();
      recommendations.push(`Common failure pattern: ${patterns.mostCommon}`);
    }
    
    return {
      totalAgents: agents.length,
      healthyAgents: healthyAgents.length,
      strugglingAgents: strugglingAgents.length,
      recentFailures: this.failureHistory.slice(-10),
      recommendations,
      dna: this.agentDNA
    };
  }

  /**
   * Analyze failure patterns across system
   */
  analyzeFailurePatterns() {
    const patterns = {};
    
    for (const failure of this.failureHistory) {
      const key = failure.errorType;
      patterns[key] = (patterns[key] || 0) + 1;
    }
    
    const mostCommon = Object.entries(patterns)
      .sort((a, b) => b[1] - a[1])[0];
    
    return {
      mostCommon: mostCommon ? `${mostCommon[0]} (${mostCommon[1]} times)` : 'None',
      distribution: patterns
    };
  }

  log(event, agent, data = {}) {
    const entry = {
      timestamp: new Date().toISOString(),
      event,
      agent,
      orchestrator: 'v2-self-healing',
      ...data
    };
    
    fs.appendFileSync(path.join(LOG_DIR, 'orchestrator-v2.log'), JSON.stringify(entry) + '\n');
    console.log(`[Orchestrator-v2] ${event}: ${agent}`);
  }

  escapeForShell(str) {
    return str.replace(/"/g, '\\"').replace(/\n/g, '\\n');
  }
}

// Export singleton
const orchestrator = new SelfHealingOrchestrator();

// CLI usage
if (require.main === module) {
  const command = process.argv[2];
  
  switch(command) {
    case 'health':
      console.log(JSON.stringify(orchestrator.getSystemHealth(), null, 2));
      break;
    case 'spawn':
      const purpose = process.argv[3] || 'task-agent';
      const caps = (process.argv[4] || 'base').split(',');
      orchestrator.spawnDynamicAgent({
        purpose,
        capabilitiesNeeded: caps,
        task: { type: 'cli-spawn', args: process.argv.slice(5) }
      }).then(result => {
        console.log('Spawned:', result);
      });
      break;
    case 'heal':
      const target = process.argv[3];
      orchestrator.spawnHealingAgent({
        targetAgent: target,
        diagnosis: { errorType: 'MANUAL', severity: 'high' },
        failure: { agent: target, error: new Error('Manual healing requested') }
      });
      break;
    default:
      console.log('Usage: node self-healing-orchestrator.js [health|spawn|heal]');
      console.log('  health          - Show system health');
      console.log('  spawn <purpose> <caps> - Spawn dynamic agent');
      console.log('  heal <agent>    - Trigger healing for agent');
  }
}

module.exports = orchestrator;
