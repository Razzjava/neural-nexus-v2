#!/usr/bin/env node

/**
 * Neural Nexus Meta-Learning Engine
 * 
 * Cross-agent learning system:
 * - Transfers successful strategies between agents
 * - Maintains collective knowledge base
 * - Identifies emergent patterns across the system
 * - Evolves agent capabilities based on system-wide learnings
 */

const fs = require('fs');
const path = require('path');
const failureAnalysis = require('./failure-analysis-engine');

const NEXUS_DIR = '/root/.openclaw/workspace/neural-nexus';
const META_DIR = path.join(NEXUS_DIR, 'meta-learning');
const KNOWLEDGE_FILE = path.join(META_DIR, 'collective-knowledge.json');

// Ensure directory exists
if (!fs.existsSync(META_DIR)) {
  fs.mkdirSync(META_DIR, { recursive: true });
}

class MetaLearningEngine {
  constructor() {
    this.knowledge = this.loadKnowledge();
    this.learningQueue = [];
    this.transferLog = [];
  }

  loadKnowledge() {
    if (fs.existsSync(KNOWLEDGE_FILE)) {
      return JSON.parse(fs.readFileSync(KNOWLEDGE_FILE, 'utf8'));
    }
    return {
      strategies: [],
      patterns: [],
      capabilities: {},
      emergentBehaviors: [],
      version: 1
    };
  }

  saveKnowledge() {
    fs.writeFileSync(KNOWLEDGE_FILE, JSON.stringify(this.knowledge, null, 2));
  }

  /**
   * Record a successful strategy from any agent
   */
  recordStrategy(strategy) {
    const enriched = {
      ...strategy,
      id: `strat-${Date.now()}`,
      timestamp: new Date().toISOString(),
      transferCount: 0,
      successRate: strategy.initialSuccess || 0.5,
      applicableDomains: this.identifyApplicableDomains(strategy)
    };
    
    this.knowledge.strategies.push(enriched);
    
    // Keep only top strategies
    if (this.knowledge.strategies.length > 100) {
      this.knowledge.strategies = this.knowledge.strategies
        .sort((a, b) => b.successRate - a.successRate)
        .slice(0, 100);
    }
    
    this.saveKnowledge();
    this.log('strategy_recorded', strategy.agent, { strategyId: enriched.id });
    
    // Check if this strategy can help other agents
    this.identifyTransferOpportunities(enriched);
  }

  /**
   * Identify which domains/strategies this could apply to
   */
  identifyApplicableDomains(strategy) {
    const domains = [];
    
    // Map capabilities to domains
    const capabilityDomains = {
      'web-search': ['research', 'trend-analysis'],
      'error-handling': ['all'],
      'caching': ['network-heavy', 'api-dependent'],
      'batching': ['high-throughput', 'api-rate-limited'],
      'retry-logic': ['network-dependent', 'external-api'],
      'parallelization': ['cpu-intensive', 'io-bound']
    };
    
    for (const cap of strategy.capabilities || []) {
      if (capabilityDomains[cap]) {
        domains.push(...capabilityDomains[cap]);
      }
    }
    
    return [...new Set(domains)];
  }

  /**
   * Find agents that could benefit from a strategy
   */
  identifyTransferOpportunities(strategy) {
    const dnaFile = path.join(NEXUS_DIR, 'dna', 'agent-registry.json');
    if (!fs.existsSync(dnaFile)) return;
    
    const dna = JSON.parse(fs.readFileSync(dnaFile, 'utf8'));
    
    for (const [agentName, agentDNA] of Object.entries(dna)) {
      if (agentName === strategy.agent) continue; // Don't transfer to self
      
      // Check if agent has similar needs
      const agentDomains = this.identifyApplicableDomains({ 
        capabilities: agentDNA.capabilities 
      });
      
      const overlap = strategy.applicableDomains.filter(d => 
        agentDomains.includes(d) || d === 'all'
      );
      
      if (overlap.length > 0 && agentDNA.successRate < strategy.successRate) {
        this.queueTransfer(strategy, agentName, overlap);
      }
    }
  }

  /**
   * Queue a knowledge transfer
   */
  queueTransfer(strategy, targetAgent, reason) {
    this.learningQueue.push({
      type: 'strategy_transfer',
      strategy: strategy.id,
      from: strategy.agent,
      to: targetAgent,
      reason,
      priority: strategy.successRate - 0.5,
      timestamp: new Date().toISOString()
    });
    
    this.log('transfer_queued', targetAgent, { 
      from: strategy.agent, 
      strategy: strategy.id 
    });
  }

  /**
   * Execute pending knowledge transfers
   */
  async executeTransfers() {
    const transfers = this.learningQueue
      .sort((a, b) => b.priority - a.priority)
      .slice(0, 5); // Process top 5 per cycle
    
    for (const transfer of transfers) {
      await this.executeTransfer(transfer);
    }
    
    // Remove processed transfers
    this.learningQueue = this.learningQueue.filter(t => 
      !transfers.find(pt => pt.strategy === t.strategy && pt.to === t.to)
    );
  }

  /**
   * Execute a single transfer
   */
  async executeTransfer(transfer) {
    const strategy = this.knowledge.strategies.find(s => s.id === transfer.strategy);
    if (!strategy) return;
    
    this.log('executing_transfer', transfer.to, { 
      from: transfer.from, 
      strategy: strategy.name || strategy.id 
    });
    
    // Spawn transfer agent
    const { execSync } = require('child_process');
    
    try {
      const task = `You are receiving a knowledge transfer from '${transfer.from}'.\n\n` +
        `Strategy to adopt:\n${JSON.stringify(strategy, null, 2)}\n\n` +
        `Your task:\n` +
        `1. Study this successful strategy\n` +
        `2. Adapt it to your specific context as ${transfer.to}\n` +
        `3. Implement the adapted strategy\n` +
        `4. Test and validate the implementation\n` +
        `5. Report success with metrics`;
      
      execSync(`openclaw sessions spawn --mode run --timeout 600 --task "${task.replace(/"/g, '\\"')}"`, {
        timeout: 10000
      });
      
      // Record successful transfer
      strategy.transferCount++;
      this.transferLog.push({
        ...transfer,
        executedAt: new Date().toISOString(),
        success: true
      });
      
      this.log('transfer_complete', transfer.to, { success: true });
      
    } catch (error) {
      this.transferLog.push({
        ...transfer,
        executedAt: new Date().toISOString(),
        success: false,
        error: error.message
      });
      
      this.log('transfer_failed', transfer.to, { error: error.message });
    }
    
    this.saveKnowledge();
  }

  /**
   * Identify emergent patterns across agents
   */
  identifyEmergentPatterns() {
    const patterns = [];
    
    // Get failure insights
    const failureInsights = failureAnalysis.exportInsights();
    
    // Pattern 1: Agents that fail together
    for (const corr of failureInsights.correlations || []) {
      if (corr.coFailureCount >= 3) {
        patterns.push({
          type: 'co_failure_cluster',
          agents: corr.agents,
          strength: corr.coFailureCount,
          likelyCause: 'shared_dependency_failure',
          recommendation: 'Implement circuit breaker for shared dependency'
        });
      }
    }
    
    // Pattern 2: Time-based failure clusters
    const timeClusters = this.analyzeTemporalPatterns();
    patterns.push(...timeClusters);
    
    // Pattern 3: Capability gaps
    const capabilityGaps = this.identifyCapabilityGaps();
    patterns.push(...capabilityGaps);
    
    // Pattern 4: Success clusters
    const successClusters = this.identifySuccessClusters();
    patterns.push(...successClusters);
    
    this.knowledge.patterns = patterns;
    this.saveKnowledge();
    
    return patterns;
  }

  /**
   * Analyze temporal patterns in failures/successes
   */
  analyzeTemporalPatterns() {
    const patterns = [];
    const dnaFile = path.join(NEXUS_DIR, 'dna', 'agent-registry.json');
    if (!fs.existsSync(dnaFile)) return patterns;
    
    const dna = JSON.parse(fs.readFileSync(dnaFile, 'utf8'));
    
    // Analyze each agent's performance history
    for (const [agent, data] of Object.entries(dna)) {
      if (!data.performanceHistory || data.performanceHistory.length < 10) continue;
      
      const history = data.performanceHistory;
      
      // Check for time-of-day patterns
      const hourPerformance = {};
      history.forEach(h => {
        const hour = new Date(h.timestamp).getHours();
        if (!hourPerformance[hour]) {
          hourPerformance[hour] = { success: 0, total: 0 };
        }
        hourPerformance[hour].total++;
        if (h.success) hourPerformance[hour].success++;
      });
      
      // Find best and worst hours
      const hourRates = Object.entries(hourPerformance).map(([hour, stats]) => ({
        hour: parseInt(hour),
        rate: stats.success / stats.total,
        samples: stats.total
      })).filter(h => h.samples >= 3);
      
      if (hourRates.length > 0) {
        const best = hourRates.sort((a, b) => b.rate - a.rate)[0];
        const worst = hourRates.sort((a, b) => a.rate - b.rate)[0];
        
        if (best.rate - worst.rate > 0.3) {
          patterns.push({
            type: 'time_sensitivity',
            agent,
            bestHour: best.hour,
            worstHour: worst.hour,
            performanceGap: (best.rate - worst.rate).toFixed(2),
            recommendation: `Schedule ${agent} runs during hour ${best.hour}`
          });
        }
      }
    }
    
    return patterns;
  }

  /**
   * Identify gaps in system capabilities
   */
  identifyCapabilityGaps() {
    const patterns = [];
    const dnaFile = path.join(NEXUS_DIR, 'dna', 'agent-registry.json');
    if (!fs.existsSync(dnaFile)) return patterns;
    
    const dna = JSON.parse(fs.readFileSync(dnaFile, 'utf8'));
    
    // Collect all capabilities
    const allCapabilities = new Set();
    const agentCapabilities = {};
    
    for (const [agent, data] of Object.entries(dna)) {
      agentCapabilities[agent] = new Set(data.capabilities || []);
      data.capabilities?.forEach(c => allCapabilities.add(c));
    }
    
    // Find unique capabilities (only one agent has them)
    for (const cap of allCapabilities) {
      const holders = Object.entries(agentCapabilities)
        .filter(([_, caps]) => caps.has(cap))
        .map(([agent]) => agent);
      
      if (holders.length === 1) {
        patterns.push({
          type: 'single_point_of_failure',
          capability: cap,
          onlyAgent: holders[0],
          risk: 'high',
          recommendation: `Train additional agents on ${cap} or create dedicated backup`
        });
      }
    }
    
    return patterns;
  }

  /**
   * Identify clusters of successful strategies
   */
  identifySuccessClusters() {
    const clusters = [];
    
    // Group strategies by domain
    const byDomain = {};
    for (const strategy of this.knowledge.strategies) {
      for (const domain of strategy.applicableDomains || []) {
        if (!byDomain[domain]) byDomain[domain] = [];
        byDomain[domain].push(strategy);
      }
    }
    
    // Find domains with multiple high-success strategies
    for (const [domain, strategies] of Object.entries(byDomain)) {
      const highSuccess = strategies.filter(s => s.successRate > 0.8);
      if (highSuccess.length >= 3) {
        clusters.push({
          type: 'success_cluster',
          domain,
          strategyCount: highSuccess.length,
          avgSuccessRate: (highSuccess.reduce((a, s) => a + s.successRate, 0) / highSuccess.length).toFixed(2),
          recommendation: `${domain} is a strength area - consider expanding capabilities`
        });
      }
    }
    
    return clusters;
  }

  /**
   * Suggest system-wide improvements
   */
  suggestSystemImprovements() {
    const suggestions = [];
    
    // Get all insights
    const patterns = this.identifyEmergentPatterns();
    const failureInsights = failureAnalysis.exportInsights();
    
    // Suggestion 1: Based on co-failure patterns
    const coFailurePatterns = patterns.filter(p => p.type === 'co_failure_cluster');
    if (coFailurePatterns.length > 0) {
      suggestions.push({
        priority: 'high',
        area: 'resilience',
        suggestion: 'Implement shared dependency health checks',
        reason: `${coFailurePatterns.length} agent clusters fail together`,
        action: 'Create dependency monitor agent'
      });
    }
    
    // Suggestion 2: Based on capability gaps
    const gapPatterns = patterns.filter(p => p.type === 'single_point_of_failure');
    for (const gap of gapPatterns) {
      suggestions.push({
        priority: 'medium',
        area: 'redundancy',
        suggestion: `Cross-train agents on ${gap.capability}`,
        reason: `Only ${gap.onlyAgent} has this critical capability`,
        action: `Spawn capability transfer from ${gap.onlyAgent}`
      });
    }
    
    // Suggestion 3: Based on temporal patterns
    const timePatterns = patterns.filter(p => p.type === 'time_sensitivity');
    if (timePatterns.length > 0) {
      suggestions.push({
        priority: 'medium',
        area: 'scheduling',
        suggestion: 'Implement dynamic scheduling based on agent performance patterns',
        reason: `${timePatterns.length} agents show time-of-day performance variation`,
        action: 'Update scheduler to use optimal time windows'
      });
    }
    
    // Suggestion 4: Based on most common failures
    const topFailures = failureInsights.topFailureTypes?.[0];
    if (topFailures?.count > 5) {
      suggestions.push({
        priority: 'high',
        area: 'error_prevention',
        suggestion: `System-wide hardening against ${topFailures.type}`,
        reason: `${topFailures.count} occurrences in analysis period`,
        action: 'Review and update error handling across all agents'
      });
    }
    
    return suggestions;
  }

  /**
   * Evolve the system based on learnings
   */
  async evolveSystem() {
    this.log('system_evolution', 'meta-engine', { version: this.knowledge.version });
    
    // 1. Execute pending transfers
    await this.executeTransfers();
    
    // 2. Identify new patterns
    const patterns = this.identifyEmergentPatterns();
    
    // 3. Get improvement suggestions
    const improvements = this.suggestSystemImprovements();
    
    // 4. Spawn evolution agents for high-priority improvements
    for (const improvement of improvements.filter(i => i.priority === 'high')) {
      await this.spawnEvolutionAgent(improvement);
    }
    
    // 5. Update system version
    this.knowledge.version++;
    this.knowledge.lastEvolution = new Date().toISOString();
    this.saveKnowledge();
    
    return {
      version: this.knowledge.version,
      patternsIdentified: patterns.length,
      improvementsSuggested: improvements.length,
      transfersExecuted: this.transferLog.filter(t => 
        new Date(t.executedAt) > Date.now() - 3600000
      ).length
    };
  }

  /**
   * Spawn an agent to implement system improvement
   */
  async spawnEvolutionAgent(improvement) {
    this.log('spawning_evolution', improvement.area, improvement);
    
    const { execSync } = require('child_process');
    
    try {
      const task = `You are a System Evolution Agent. Implement this improvement:\n\n` +
        `Area: ${improvement.area}\n` +
        `Suggestion: ${improvement.suggestion}\n` +
        `Reason: ${improvement.reason}\n` +
        `Required Action: ${improvement.action}\n\n` +
        `Your task:\n` +
        `1. Analyze current system state\n` +
        `2. Design the improvement\n` +
        `3. Implement the changes\n` +
        `4. Test the implementation\n` +
        `5. Document what was changed`;
      
      execSync(`openclaw sessions spawn --mode run --timeout 900 --task "${task.replace(/"/g, '\\"')}"`, {
        timeout: 10000
      });
      
      this.log('evolution_spawned', improvement.area, { success: true });
      
    } catch (error) {
      this.log('evolution_spawn_failed', improvement.area, { error: error.message });
    }
  }

  /**
   * Get collective intelligence summary
   */
  getCollectiveIntelligence() {
    return {
      knowledgeVersion: this.knowledge.version,
      totalStrategies: this.knowledge.strategies.length,
      topStrategies: this.knowledge.strategies
        .sort((a, b) => b.successRate - a.successRate)
        .slice(0, 5),
      emergentPatterns: this.knowledge.patterns,
      pendingTransfers: this.learningQueue.length,
      totalTransfers: this.transferLog.length,
      successfulTransfers: this.transferLog.filter(t => t.success).length,
      recentLearnings: this.knowledge.strategies
        .filter(s => new Date(s.timestamp) > Date.now() - 86400000)
        .length
    };
  }

  log(event, agent, data = {}) {
    const entry = {
      timestamp: new Date().toISOString(),
      event,
      agent,
      ...data
    };
    
    const logFile = path.join(META_DIR, 'meta-learning.log');
    fs.appendFileSync(logFile, JSON.stringify(entry) + '\n');
    console.log(`[MetaLearning] ${event}: ${agent}`);
  }
}

// Export singleton
const metaLearning = new MetaLearningEngine();

// CLI usage
if (require.main === module) {
  const command = process.argv[2];
  
  switch(command) {
    case 'evolve':
      metaLearning.evolveSystem().then(result => {
        console.log(JSON.stringify(result, null, 2));
      });
      break;
    case 'patterns':
      console.log(JSON.stringify(metaLearning.identifyEmergentPatterns(), null, 2));
      break;
    case 'intelligence':
      console.log(JSON.stringify(metaLearning.getCollectiveIntelligence(), null, 2));
      break;
    case 'improvements':
      console.log(JSON.stringify(metaLearning.suggestSystemImprovements(), null, 2));
      break;
    case 'record':
      const strategy = {
        agent: process.argv[3],
        name: process.argv[4],
        capabilities: (process.argv[5] || '').split(','),
        initialSuccess: parseFloat(process.argv[6]) || 0.5
      };
      metaLearning.recordStrategy(strategy);
      console.log('Strategy recorded');
      break;
    default:
      console.log('Usage: node meta-learning-engine.js [evolve|patterns|intelligence|improvements|record]');
  }
}

module.exports = metaLearning;
