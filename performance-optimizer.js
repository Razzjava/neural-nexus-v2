/**
 * Neural Nexus Performance Optimizer
 * 
 * Auto-tunes system parameters based on performance data
 */

const LearningEngine = require('./learning-engine');
const QualityGate = require('./quality-gate');

class PerformanceOptimizer {
  constructor() {
    this.learning = LearningEngine;
    this.optimizations = [];
  }
  
  /**
   * Analyze and optimize Quality Gate thresholds
   */
  optimizeQualityThresholds() {
    console.log('[Optimizer] Analyzing Quality Gate thresholds...');
    
    const agents = Object.keys(this.learning.data.agentPerformance);
    const recommendations = [];
    
    agents.forEach(agent => {
      const perf = this.learning.data.agentPerformance[agent];
      if (perf.runs.length < 10) return;
      
      const avgScore = perf.avgScore;
      const successRate = perf.successRate;
      
      // If consistently scoring high, can raise threshold
      if (avgScore > 8.5 && successRate > 0.9) {
        recommendations.push({
          agent,
          action: 'raise_threshold',
          from: 8,
          to: 8.5,
          reason: 'Consistently high performance'
        });
      }
      
      // If struggling, lower threshold temporarily
      if (avgScore < 7.5 && successRate < 0.6) {
        recommendations.push({
          agent,
          action: 'lower_threshold',
          from: 8,
          to: 7,
          reason: 'High failure rate, needs adjustment'
        });
      }
    });
    
    return recommendations;
  }
  
  /**
   * Optimize agent timeout settings
   */
  optimizeTimeouts() {
    console.log('[Optimizer] Analyzing timeout settings...');
    
    const agents = Object.keys(this.learning.data.agentPerformance);
    const recommendations = [];
    
    agents.forEach(agent => {
      const perf = this.learning.data.agentPerformance[agent];
      const durations = perf.runs.map(r => r.duration).filter(d => d);
      
      if (durations.length < 5) return;
      
      const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
      const maxDuration = Math.max(...durations);
      
      // Recommend timeout at 150% of average, minimum 120s
      const recommendedTimeout = Math.max(120, Math.ceil(avgDuration * 1.5));
      
      recommendations.push({
        agent,
        currentTimeout: 'unknown', // Would need to track this
        recommendedTimeout,
        avgActualDuration: Math.ceil(avgDuration),
        reason: `Based on ${durations.length} runs`
      });
    });
    
    return recommendations;
  }
  
  /**
   * Suggest model/parameter changes
   */
  suggestModelOptimizations() {
    console.log('[Optimizer] Suggesting model optimizations...');
    
    const suggestions = [];
    const agents = Object.keys(this.learning.data.agentPerformance);
    
    agents.forEach(agent => {
      const perf = this.learning.data.agentPerformance[agent];
      
      // If agent is slow but high quality, suggest faster model
      const avgDuration = perf.runs
        .map(r => r.duration)
        .filter(d => d)
        .reduce((a, b, _, arr) => a + b / arr.length, 0);
      
      if (avgDuration > 300 && perf.avgScore > 8) {
        suggestions.push({
          agent,
          suggestion: 'Try faster model (kimi-coding/k2p5 with thinking=off)',
          reason: 'High quality but slow - may maintain quality with faster model',
          expectedImprovement: '30-50% faster'
        });
      }
      
      // If agent has low quality, suggest better model
      if (perf.avgScore < 7.5) {
        suggestions.push({
          agent,
          suggestion: 'Consider more capable model or enable thinking',
          reason: 'Quality below threshold',
          expectedImprovement: 'Better reasoning, higher scores'
        });
      }
    });
    
    return suggestions;
  }
  
  /**
   * Optimize cron schedules based on performance
   */
  optimizeSchedules() {
    console.log('[Optimizer] Optimizing schedules...');
    
    const recommendations = [];
    const optimalTimes = this.learning.predictOptimalSchedule();
    
    for (const [agent, timing] of Object.entries(optimalTimes)) {
      if (timing.confidence > 0.8) {
        recommendations.push({
          agent,
          action: 'reschedule',
          currentTime: 'existing cron time',
          suggestedTime: timing.bestTime,
          expectedScore: timing.expectedScore,
          reason: `Optimal performance at ${timing.bestTime}`
        });
      }
    }
    
    return recommendations;
  }
  
  /**
   * Identify redundant or low-value tasks
   */
  identifyInefficiencies() {
    console.log('[Optimizer] Identifying inefficiencies...');
    
    const inefficiencies = [];
    const agents = Object.keys(this.learning.data.agentPerformance);
    
    agents.forEach(agent => {
      const perf = this.learning.data.agentPerformance[agent];
      
      // Low value: high frequency but low engagement
      if (perf.runs.length > 20 && perf.avgScore < 7) {
        inefficiencies.push({
          agent,
          issue: 'low_value_high_frequency',
          recommendation: 'Reduce frequency or improve quality',
          data: {
            runs: perf.runs.length,
            avgScore: perf.avgScore.toFixed(1)
          }
        });
      }
      
      // High failure rate
      if (perf.successRate < 0.5) {
        inefficiencies.push({
          agent,
          issue: 'high_failure_rate',
          recommendation: 'Review task complexity, provide better instructions',
          data: {
            successRate: (perf.successRate * 100).toFixed(0) + '%'
          }
        });
      }
    });
    
    return inefficiencies;
  }
  
  /**
   * Run all optimizations
   */
  async runOptimization() {
    console.log('\n⚡ Running Performance Optimization...\n');
    
    const results = {
      qualityThresholds: this.optimizeQualityThresholds(),
      timeouts: this.optimizeTimeouts(),
      modelSuggestions: this.suggestModelOptimizations(),
      scheduleOptimizations: this.optimizeSchedules(),
      inefficiencies: this.identifyInefficiencies(),
      timestamp: new Date().toISOString()
    };
    
    this.optimizations.push(results);
    
    return results;
  }
  
  /**
   * Apply recommended optimizations (manual review recommended)
   */
  applyOptimizations(recommendations) {
    console.log('[Optimizer] Applying optimizations...');
    
    // This would actually modify configs
    // For safety, just log what would change
    recommendations.forEach(rec => {
      console.log(`Would apply: ${rec.agent} - ${rec.action}`);
    });
    
    return {
      applied: recommendations.length,
      requiresRestart: false
    };
  }
  
  /**
   * Get optimization report
   */
  getReport() {
    const latest = this.optimizations[this.optimizations.length - 1];
    
    if (!latest) {
      return { message: 'No optimizations run yet' };
    }
    
    return {
      timestamp: latest.timestamp,
      summary: {
        qualityAdjustments: latest.qualityThresholds.length,
        timeoutAdjustments: latest.timeouts.length,
        modelSuggestions: latest.modelSuggestions.length,
        scheduleChanges: latest.scheduleOptimizations.length,
        inefficienciesFound: latest.inefficiencies.length
      },
      recommendations: [
        ...latest.qualityThresholds,
        ...latest.timeouts,
        ...latest.modelSuggestions,
        ...latest.scheduleOptimizations
      ]
    };
  }
}

module.exports = new PerformanceOptimizer();

// Test
if (require.main === module) {
  const optimizer = new PerformanceOptimizer();
  
  optimizer.runOptimization().then(results => {
    console.log('\nOptimization Results:', JSON.stringify(results, null, 2));
  });
}
