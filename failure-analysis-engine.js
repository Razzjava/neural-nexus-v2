#!/usr/bin/env node

/**
 * Neural Nexus Failure Analysis Engine
 * 
 * Deep failure diagnosis with:
 * - Root cause analysis
 * - Pattern recognition across agents
 * - Predictive failure prevention
 * - Cross-agent learning from failures
 */

const fs = require('fs');
const path = require('path');

const NEXUS_DIR = '/root/.openclaw/workspace/neural-nexus';
const ANALYSIS_DIR = path.join(NEXUS_DIR, 'analysis');
const LOG_DIR = path.join(NEXUS_DIR, 'logs');

// Ensure directories exist
[ANALYSIS_DIR, LOG_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

class FailureAnalysisEngine {
  constructor() {
    this.failureDB = this.loadFailureDB();
    this.patternDB = this.loadPatternDB();
    this.correlationMatrix = this.loadCorrelations();
  }

  loadFailureDB() {
    const file = path.join(ANALYSIS_DIR, 'failure-db.json');
    if (fs.existsSync(file)) {
      return JSON.parse(fs.readFileSync(file, 'utf8'));
    }
    return { failures: [], stats: {} };
  }

  saveFailureDB() {
    fs.writeFileSync(
      path.join(ANALYSIS_DIR, 'failure-db.json'),
      JSON.stringify(this.failureDB, null, 2)
    );
  }

  loadPatternDB() {
    const file = path.join(ANALYSIS_DIR, 'patterns.json');
    if (fs.existsSync(file)) {
      return JSON.parse(fs.readFileSync(file, 'utf8'));
    }
    return { patterns: [], learnedRules: [] };
  }

  savePatternDB() {
    fs.writeFileSync(
      path.join(ANALYSIS_DIR, 'patterns.json'),
      JSON.stringify(this.patternDB, null, 2)
    );
  }

  loadCorrelations() {
    const file = path.join(ANALYSIS_DIR, 'correlations.json');
    if (fs.existsSync(file)) {
      return JSON.parse(fs.readFileSync(file, 'utf8'));
    }
    return {};
  }

  saveCorrelations() {
    fs.writeFileSync(
      path.join(ANALYSIS_DIR, 'correlations.json'),
      JSON.stringify(this.correlationMatrix, null, 2)
    );
  }

  /**
   * Record and analyze a new failure
   */
  async analyzeFailure(failure) {
    const enriched = this.enrichFailure(failure);
    
    // Store in DB
    this.failureDB.failures.push(enriched);
    this.failureDB.stats.total = (this.failureDB.stats.total || 0) + 1;
    this.failureDB.stats.byAgent = this.failureDB.stats.byAgent || {};
    this.failureDB.stats.byAgent[failure.agent] = (this.failureDB.stats.byAgent[failure.agent] || 0) + 1;
    
    // Analyze
    const analysis = {
      rootCause: this.identifyRootCause(enriched),
      contributingFactors: this.identifyContributingFactors(enriched),
      similarFailures: this.findSimilarFailures(enriched),
      cascadeRisk: this.assessCascadeRisk(enriched),
      preventionStrategy: this.suggestPrevention(enriched),
      crossAgentLearning: this.extractLessons(enriched)
    };
    
    // Update patterns
    this.updatePatterns(enriched, analysis);
    
    // Update correlations
    this.updateCorrelations(enriched);
    
    // Save
    this.saveFailureDB();
    this.savePatternDB();
    this.saveCorrelations();
    
    return analysis;
  }

  /**
   * Enrich failure data with context
   */
  enrichFailure(failure) {
    const timestamp = new Date();
    
    return {
      id: `fail-${timestamp.getTime()}`,
      timestamp: timestamp.toISOString(),
      hour: timestamp.getHours(),
      dayOfWeek: timestamp.getDay(),
      agent: failure.agent,
      error: failure.error?.message || failure.error,
      errorType: this.classifyError(failure.error),
      errorCode: this.extractErrorCode(failure.error),
      stackTrace: failure.error?.stack,
      task: failure.task,
      context: {
        ...failure.context,
        systemLoad: this.getSystemLoad(),
        recentChanges: this.getRecentChanges(failure.agent),
        dependencyStatus: this.checkDependencies(failure.agent)
      },
      history: this.getAgentHistory(failure.agent)
    };
  }

  /**
   * Classify error into detailed categories
   */
  classifyError(error) {
    const msg = (error?.message || error || '').toLowerCase();
    const stack = (error?.stack || '').toLowerCase();
    
    // Network errors
    if (msg.includes('econnrefused')) return 'NETWORK_CONNECTION_REFUSED';
    if (msg.includes('enotfound')) return 'NETWORK_DNS_FAILURE';
    if (msg.includes('etimedout') || msg.includes('timeout')) return 'NETWORK_TIMEOUT';
    if (msg.includes('socket hang up')) return 'NETWORK_SOCKET_ERROR';
    
    // API errors
    if (msg.includes('429') || msg.includes('rate limit')) return 'API_RATE_LIMIT';
    if (msg.includes('401') || msg.includes('403')) return 'API_AUTH_FAILURE';
    if (msg.includes('500') || msg.includes('502') || msg.includes('503')) return 'API_SERVER_ERROR';
    
    // Resource errors
    if (msg.includes('enoent')) return 'RESOURCE_NOT_FOUND';
    if (msg.includes('eacces') || msg.includes('permission')) return 'RESOURCE_PERMISSION_DENIED';
    if (msg.includes('enospc')) return 'RESOURCE_DISK_FULL';
    if (msg.includes('memory') || stack.includes('heap')) return 'RESOURCE_MEMORY_EXHAUSTION';
    
    // Logic errors
    if (msg.includes('cannot read property') || msg.includes('undefined')) return 'LOGIC_NULL_REFERENCE';
    if (msg.includes('is not a function')) return 'LOGIC_TYPE_ERROR';
    if (msg.includes('parse') || msg.includes('unexpected token')) return 'LOGIC_PARSE_ERROR';
    if (msg.includes('validation') || msg.includes('invalid')) return 'LOGIC_VALIDATION_FAILURE';
    
    // External service errors
    if (msg.includes('openclaw')) return 'EXTERNAL_OPENCLAW_ERROR';
    if (msg.includes('telegram')) return 'EXTERNAL_TELEGRAM_ERROR';
    if (msg.includes('github') || msg.includes('gh ')) return 'EXTERNAL_GITHUB_ERROR';
    
    return 'UNKNOWN';
  }

  /**
   * Extract specific error codes if present
   */
  extractErrorCode(error) {
    const msg = error?.message || error || '';
    const match = msg.match(/(E[A-Z]+|\d{3})/);
    return match ? match[1] : null;
  }

  /**
   * Identify root cause using decision tree
   */
  identifyRootCause(enriched) {
    const { errorType, context, agent } = enriched;
    
    // Decision tree for root cause analysis
    const decisions = [
      {
        condition: () => errorType.startsWith('NETWORK_'),
        cause: 'external_network_dependency',
        confidence: 0.9,
        evidence: 'Network-related error indicates external service issue'
      },
      {
        condition: () => errorType.startsWith('API_'),
        cause: 'external_api_failure',
        confidence: 0.85,
        evidence: 'API error code indicates third-party service issue'
      },
      {
        condition: () => errorType.startsWith('RESOURCE_'),
        cause: 'insufficient_system_resources',
        confidence: 0.8,
        evidence: 'Resource error indicates system capacity issue'
      },
      {
        condition: () => errorType.startsWith('LOGIC_'),
        cause: 'code_defect',
        confidence: 0.85,
        evidence: 'Logic error indicates programming error'
      },
      {
        condition: () => errorType.startsWith('EXTERNAL_'),
        cause: 'integration_failure',
        confidence: 0.9,
        evidence: 'External service integration failure'
      },
      {
        condition: () => context.systemLoad?.cpu > 80 || context.systemLoad?.memory > 90,
        cause: 'system_overload',
        confidence: 0.75,
        evidence: 'High system load during failure'
      },
      {
        condition: () => context.recentChanges?.length > 0,
        cause: 'recent_change_regression',
        confidence: 0.7,
        evidence: 'Recent changes may have introduced defect'
      }
    ];
    
    const matches = decisions.filter(d => d.condition());
    
    if (matches.length === 0) {
      return {
        cause: 'unknown',
        confidence: 0.3,
        evidence: 'No clear pattern identified'
      };
    }
    
    // Return highest confidence match
    const best = matches.sort((a, b) => b.confidence - a.confidence)[0];
    return {
      cause: best.cause,
      confidence: best.confidence,
      evidence: best.evidence,
      alternativeCauses: matches.slice(1).map(m => m.cause)
    };
  }

  /**
   * Identify contributing factors
   */
  identifyContributingFactors(enriched) {
    const factors = [];
    const { context, hour, dayOfWeek } = enriched;
    
    // Time-based factors
    if (hour >= 2 && hour <= 5) {
      factors.push({ type: 'time', factor: 'off_hours', severity: 'low' });
    }
    
    // System load factors
    if (context.systemLoad?.cpu > 70) {
      factors.push({ type: 'resource', factor: 'high_cpu_load', severity: 'medium' });
    }
    if (context.systemLoad?.memory > 80) {
      factors.push({ type: 'resource', factor: 'high_memory_usage', severity: 'high' });
    }
    
    // Dependency factors
    const failedDeps = Object.entries(context.dependencyStatus || {})
      .filter(([_, status]) => !status.healthy);
    if (failedDeps.length > 0) {
      factors.push({ 
        type: 'dependency', 
        factor: 'failed_dependencies', 
        severity: 'high',
        details: failedDeps.map(([name]) => name)
      });
    }
    
    // History factors
    const recentFailures = enriched.history?.filter(f => 
      new Date(f.timestamp) > Date.now() - 3600000
    ).length;
    if (recentFailures > 3) {
      factors.push({ type: 'pattern', factor: 'recent_failure_spike', severity: 'high' });
    }
    
    return factors;
  }

  /**
   * Find similar historical failures
   */
  findSimilarFailures(enriched) {
    const { errorType, agent, error } = enriched;
    
    return this.failureDB.failures
      .filter(f => {
        const sameType = f.errorType === errorType;
        const sameAgent = f.agent === agent;
        const similarError = this.stringSimilarity(
          f.error?.toString() || '',
          error?.toString() || ''
        ) > 0.7;
        
        return sameType && (sameAgent || similarError);
      })
      .slice(-5)
      .map(f => ({
        id: f.id,
        timestamp: f.timestamp,
        agent: f.agent,
        resolution: f.resolution
      }));
  }

  /**
   * Assess risk of cascade failure
   */
  assessCascadeRisk(enriched) {
    const { agent, errorType } = enriched;
    
    // Check if other agents depend on this one
    const dependentAgents = this.findDependentAgents(agent);
    
    // Check correlation with recent failures
    const recentSimilar = this.failureDB.failures.filter(f => 
      f.errorType === errorType &&
      new Date(f.timestamp) > Date.now() - 300000 // 5 minutes
    );
    
    const risk = {
      level: 'low',
      probability: 0.1,
      affectedAgents: dependentAgents,
      reasoning: 'Isolated failure'
    };
    
    if (dependentAgents.length > 2 || recentSimilar.length > 2) {
      risk.level = 'high';
      risk.probability = 0.7;
      risk.reasoning = 'Multiple dependencies or pattern of similar failures';
    } else if (dependentAgents.length > 0 || recentSimilar.length > 0) {
      risk.level = 'medium';
      risk.probability = 0.4;
      risk.reasoning = 'Some dependencies or recent similar failures';
    }
    
    return risk;
  }

  /**
   * Find agents that depend on a given agent
   */
  findDependentAgents(agent) {
    // This would come from a dependency graph
    // Simplified version based on known relationships
    const dependencies = {
      'video-producer': ['script-writer', 'research-specialist'],
      'script-writer': ['research-specialist'],
      'claw-ceo': ['claw-researcher', 'claw-hunter', 'claw-video-editor']
    };
    
    return Object.entries(dependencies)
      .filter(([_, deps]) => deps.includes(agent))
      .map(([name]) => name);
  }

  /**
   * Suggest prevention strategy
   */
  suggestPrevention(enriched) {
    const { errorType, rootCause, agent } = enriched;
    
    const strategies = {
      'NETWORK_TIMEOUT': [
        'Increase timeout thresholds',
        'Implement request caching',
        'Add retry with exponential backoff',
        'Consider async queue for non-critical requests'
      ],
      'API_RATE_LIMIT': [
        'Implement token bucket rate limiting',
        'Cache responses to reduce API calls',
        'Add request batching',
        'Consider upgrading API tier'
      ],
      'RESOURCE_MEMORY_EXHAUSTION': [
        'Implement memory limits per agent',
        'Add memory monitoring alerts',
        'Optimize data structures',
        'Consider streaming for large datasets'
      ],
      'LOGIC_NULL_REFERENCE': [
        'Add null checks throughout codebase',
        'Implement strict TypeScript types',
        'Add defensive programming patterns'
      ],
      'integration_failure': [
        'Add health checks for external services',
        'Implement graceful degradation',
        'Add circuit breakers for external calls'
      ]
    };
    
    return strategies[errorType] || [
      'Add comprehensive error handling',
      'Implement retry logic',
      'Add detailed logging for diagnostics'
    ];
  }

  /**
   * Extract lessons for cross-agent learning
   */
  extractLessons(enriched) {
    const lessons = [];
    const { errorType, agent, resolution } = enriched;
    
    // General lessons based on error type
    if (errorType.startsWith('NETWORK_')) {
      lessons.push({
        type: 'resilience',
        lesson: 'Always assume network calls can fail',
        applicableTo: ['all-agents'],
        priority: 'high'
      });
    }
    
    if (errorType.startsWith('RESOURCE_')) {
      lessons.push({
        type: 'resource_management',
        lesson: 'Monitor and limit resource usage',
        applicableTo: ['all-agents'],
        priority: 'high'
      });
    }
    
    // Specific lessons from this failure
    if (resolution) {
      lessons.push({
        type: 'resolution_pattern',
        lesson: resolution.method,
        applicableTo: [agent, 'similar-agents'],
        priority: 'medium'
      });
    }
    
    return lessons;
  }

  /**
   * Update pattern database
   */
  updatePatterns(enriched, analysis) {
    const pattern = {
      id: `pattern-${Date.now()}`,
      errorType: enriched.errorType,
      rootCause: analysis.rootCause.cause,
      context: enriched.context,
      frequency: 1,
      firstSeen: enriched.timestamp,
      lastSeen: enriched.timestamp
    };
    
    // Check if similar pattern exists
    const existing = this.patternDB.patterns.find(p => 
      p.errorType === pattern.errorType &&
      p.rootCause === pattern.rootCause
    );
    
    if (existing) {
      existing.frequency++;
      existing.lastSeen = pattern.lastSeen;
    } else {
      this.patternDB.patterns.push(pattern);
    }
    
    // Generate learned rule if pattern is strong
    if (existing?.frequency >= 3) {
      const rule = this.generateRule(existing);
      if (!this.patternDB.learnedRules.find(r => r.condition === rule.condition)) {
        this.patternDB.learnedRules.push(rule);
      }
    }
  }

  /**
   * Generate a learned rule from pattern
   */
  generateRule(pattern) {
    return {
      id: `rule-${Date.now()}`,
      condition: `errorType === '${pattern.errorType}' && rootCause === '${pattern.rootCause}'`,
      action: this.suggestPrevention({ errorType: pattern.errorType })[0],
      confidence: Math.min(pattern.frequency / 10, 0.95),
      sourcePattern: pattern.id
    };
  }

  /**
   * Update correlation matrix
   */
  updateCorrelations(enriched) {
    const { agent, errorType } = enriched;
    
    // Track which agents fail together
    const recent = this.failureDB.failures.filter(f => 
      new Date(f.timestamp) > Date.now() - 600000 // 10 minutes
    );
    
    for (const failure of recent) {
      if (failure.agent === agent) continue;
      
      const pair = [agent, failure.agent].sort().join('::');
      
      if (!this.correlationMatrix[pair]) {
        this.correlationMatrix[pair] = { count: 0, types: {} };
      }
      
      this.correlationMatrix[pair].count++;
      this.correlationMatrix[pair].types[errorType] = 
        (this.correlationMatrix[pair].types[errorType] || 0) + 1;
    }
  }

  /**
   * Get system load metrics
   */
  getSystemLoad() {
    try {
      const { execSync } = require('child_process');
      
      const cpuOutput = execSync('top -bn1 | grep "Cpu(s)"', { encoding: 'utf8' });
      const cpuMatch = cpuOutput.match(/(\d+\.?\d*)%?\s*us/);
      const cpu = cpuMatch ? parseFloat(cpuMatch[1]) : 0;
      
      const memOutput = execSync('free | grep Mem', { encoding: 'utf8' });
      const memParts = memOutput.trim().split(/\s+/);
      const memory = Math.round((parseInt(memParts[2]) / parseInt(memParts[1])) * 100);
      
      return { cpu, memory, timestamp: new Date().toISOString() };
    } catch {
      return { cpu: 0, memory: 0, timestamp: new Date().toISOString() };
    }
  }

  /**
   * Get recent changes for an agent
   */
  getRecentChanges(agent) {
    try {
      const { execSync } = require('child_process');
      const output = execSync(
        `git -C ${NEXUS_DIR} log --since="24 hours ago" --oneline -- "*${agent}*" 2>/dev/null || echo ""`,
        { encoding: 'utf8' }
      );
      return output.trim().split('\n').filter(Boolean);
    } catch {
      return [];
    }
  }

  /**
   * Check dependencies for an agent
   */
  checkDependencies(agent) {
    // Map of agent dependencies
    const deps = {
      'claw-video-editor': ['remotion', 'ffmpeg'],
      'claw-researcher': ['openclaw-gateway'],
      'claw-social': ['openclaw-gateway'],
      'claw-hunter': ['openclaw-gateway', 'github-api']
    };
    
    const result = {};
    for (const dep of deps[agent] || []) {
      result[dep] = { healthy: this.checkDependencyHealth(dep) };
    }
    
    return result;
  }

  /**
   * Check if a dependency is healthy
   */
  checkDependencyHealth(dep) {
    try {
      const { execSync } = require('child_process');
      
      switch(dep) {
        case 'openclaw-gateway':
          execSync('openclaw gateway status', { timeout: 5000 });
          return true;
        case 'ffmpeg':
          execSync('which ffmpeg', { timeout: 1000 });
          return true;
        default:
          return true;
      }
    } catch {
      return false;
    }
  }

  /**
   * Get agent failure history
   */
  getAgentHistory(agent) {
    return this.failureDB.failures
      .filter(f => f.agent === agent)
      .slice(-10);
  }

  /**
   * Simple string similarity (Jaccard)
   */
  stringSimilarity(a, b) {
    const setA = new Set(a.split(' '));
    const setB = new Set(b.split(' '));
    const intersection = new Set([...setA].filter(x => setB.has(x)));
    const union = new Set([...setA, ...setB]);
    return intersection.size / union.size;
  }

  /**
   * Get failure forecast
   */
  getForecast() {
    const recent = this.failureDB.failures.filter(f => 
      new Date(f.timestamp) > Date.now() - 86400000 // 24 hours
    );
    
    const byHour = {};
    recent.forEach(f => {
      const hour = new Date(f.timestamp).getHours();
      byHour[hour] = (byHour[hour] || 0) + 1;
    });
    
    const highRiskHours = Object.entries(byHour)
      .filter(([_, count]) => count > 2)
      .map(([hour]) => parseInt(hour));
    
    const currentHour = new Date().getHours();
    const isHighRisk = highRiskHours.includes(currentHour);
    
    return {
      riskLevel: isHighRisk ? 'high' : recent.length > 10 ? 'medium' : 'low',
      recentFailureCount: recent.length,
      highRiskHours,
      correlatedAgents: this.getTopCorrelations(),
      learnedRules: this.patternDB.learnedRules.slice(-5)
    };
  }

  /**
   * Get top agent correlations
   */
  getTopCorrelations() {
    return Object.entries(this.correlationMatrix)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 5)
      .map(([pair, data]) => ({
        agents: pair.split('::'),
        coFailureCount: data.count,
        dominantErrorType: Object.entries(data.types)
          .sort((a, b) => b[1] - a[1])[0]?.[0]
      }));
  }

  /**
   * Export insights for other agents to learn from
   */
  exportInsights() {
    return {
      topFailureTypes: this.getTopFailureTypes(),
      agentVulnerabilities: this.getAgentVulnerabilities(),
      learnedStrategies: this.patternDB.learnedRules,
      correlations: this.getTopCorrelations(),
      lessons: this.failureDB.failures
        .flatMap(f => f.lessons || [])
        .filter((v, i, a) => a.findIndex(t => t.lesson === v.lesson) === i) // dedupe
    };
  }

  getTopFailureTypes() {
    const counts = {};
    this.failureDB.failures.forEach(f => {
      counts[f.errorType] = (counts[f.errorType] || 0) + 1;
    });
    
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([type, count]) => ({ type, count }));
  }

  getAgentVulnerabilities() {
    const agentFailures = {};
    this.failureDB.failures.forEach(f => {
      if (!agentFailures[f.agent]) {
        agentFailures[f.agent] = { count: 0, types: {} };
      }
      agentFailures[f.agent].count++;
      agentFailures[f.agent].types[f.errorType] = 
        (agentFailures[f.agent].types[f.errorType] || 0) + 1;
    });
    
    return Object.entries(agentFailures)
      .map(([agent, data]) => ({
        agent,
        totalFailures: data.count,
        primaryVulnerability: Object.entries(data.types)
          .sort((a, b) => b[1] - a[1])[0]?.[0]
      }))
      .sort((a, b) => b.totalFailures - a.totalFailures);
  }
}

// Export singleton
const analysisEngine = new FailureAnalysisEngine();

// CLI usage
if (require.main === module) {
  const command = process.argv[2];
  
  switch(command) {
    case 'forecast':
      console.log(JSON.stringify(analysisEngine.getForecast(), null, 2));
      break;
    case 'insights':
      console.log(JSON.stringify(analysisEngine.exportInsights(), null, 2));
      break;
    case 'stats':
      console.log(JSON.stringify({
        totalFailures: analysisEngine.failureDB.stats.total,
        byAgent: analysisEngine.failureDB.stats.byAgent,
        topPatterns: analysisEngine.patternDB.patterns
          .sort((a, b) => b.frequency - a.frequency)
          .slice(0, 10)
      }, null, 2));
      break;
    default:
      console.log('Usage: node failure-analysis-engine.js [forecast|insights|stats]');
  }
}

module.exports = analysisEngine;
