/**
 * Neural Nexus Learning Engine
 * 
 * Collects data, identifies patterns, and optimizes agent performance
 */

const fs = require('fs');
const path = require('path');

const LEARNING_DIR = '/root/.openclaw/workspace/agents-output/learning';

// Ensure directory exists
if (!fs.existsSync(LEARNING_DIR)) {
  fs.mkdirSync(LEARNING_DIR, { recursive: true });
}

class LearningEngine {
  constructor() {
    this.dataFile = path.join(LEARNING_DIR, 'agent-performance.json');
    this.patternsFile = path.join(LEARNING_DIR, 'raz-patterns.json');
    this.predictionsFile = path.join(LEARNING_DIR, 'predictions.json');
    this.data = this.loadData();
  }
  
  loadData() {
    try {
      return {
        agentPerformance: JSON.parse(fs.readFileSync(this.dataFile, 'utf8')),
        razPatterns: JSON.parse(fs.readFileSync(this.patternsFile, 'utf8')),
        predictions: JSON.parse(fs.readFileSync(this.predictionsFile, 'utf8'))
      };
    } catch {
      return {
        agentPerformance: {},
        razPatterns: {
          productivityWindows: [],
          responseTimes: [],
          preferences: {}
        },
        predictions: []
      };
    }
  }
  
  saveData() {
    fs.writeFileSync(this.dataFile, JSON.stringify(this.data.agentPerformance, null, 2));
    fs.writeFileSync(this.patternsFile, JSON.stringify(this.data.razPatterns, null, 2));
    fs.writeFileSync(this.predictionsFile, JSON.stringify(this.data.predictions, null, 2));
  }
  
  /**
   * Record agent performance data
   */
  recordAgentPerformance(agent, metrics) {
    if (!this.data.agentPerformance[agent]) {
      this.data.agentPerformance[agent] = {
        runs: [],
        avgScore: 0,
        bestTime: null,
        successRate: 0,
        trends: []
      };
    }
    
    const perf = this.data.agentPerformance[agent];
    perf.runs.push({
      timestamp: new Date().toISOString(),
      ...metrics
    });
    
    // Keep last 50 runs
    if (perf.runs.length > 50) perf.runs.shift();
    
    // Calculate averages
    const scores = perf.runs.map(r => r.score || 0);
    perf.avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
    
    const successes = perf.runs.filter(r => r.success).length;
    perf.successRate = successes / perf.runs.length;
    
    // Find best time
    const timePerformance = {};
    perf.runs.forEach(r => {
      const hour = new Date(r.timestamp).getHours();
      if (!timePerformance[hour]) timePerformance[hour] = [];
      timePerformance[hour].push(r.score || 0);
    });
    
    let bestHour = null;
    let bestAvg = 0;
    for (const [hour, scores] of Object.entries(timePerformance)) {
      const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
      if (avg > bestAvg) {
        bestAvg = avg;
        bestHour = hour;
      }
    }
    perf.bestTime = bestHour ? `${bestHour}:00` : null;
    
    this.saveData();
  }
  
  /**
   * Record Raz interaction pattern
   */
  recordRazPattern(type, data) {
    switch(type) {
      case 'response':
        this.data.razPatterns.responseTimes.push({
          timestamp: new Date().toISOString(),
          responseTimeMinutes: data.responseTime,
          channel: data.channel
        });
        break;
        
      case 'productivity':
        this.data.razPatterns.productivityWindows.push({
          timestamp: new Date().toISOString(),
          hour: data.hour,
          activity: data.activity,
          engagement: data.engagement
        });
        break;
        
      case 'preference':
        this.data.razPatterns.preferences[data.key] = {
          value: data.value,
          timestamp: new Date().toISOString()
        };
        break;
    }
    
    // Keep last 100 entries per type
    if (this.data.razPatterns.responseTimes.length > 100) {
      this.data.razPatterns.responseTimes.shift();
    }
    if (this.data.razPatterns.productivityWindows.length > 100) {
      this.data.razPatterns.productivityWindows.shift();
    }
    
    this.saveData();
  }
  
  /**
   * Predict optimal timing for agent
   */
  predictOptimalTiming(agent) {
    const perf = this.data.agentPerformance[agent];
    if (!perf || perf.runs.length < 5) return null;
    
    return {
      bestTime: perf.bestTime,
      expectedScore: perf.avgScore.toFixed(1),
      confidence: Math.min(perf.runs.length / 20, 1)
    };
  }
  
  /**
   * Predict when Raz is most responsive
   */
  predictRazAvailability() {
    const windows = this.data.razPatterns.productivityWindows;
    if (windows.length < 10) return null;
    
    const hourEngagement = {};
    windows.forEach(w => {
      if (!hourEngagement[w.hour]) hourEngagement[w.hour] = [];
      hourEngagement[w.hour].push(w.engagement);
    });
    
    let bestHour = null;
    let bestEngagement = 0;
    for (const [hour, engagements] of Object.entries(hourEngagement)) {
      const avg = engagements.reduce((a, b) => a + b, 0) / engagements.length;
      if (avg > bestEngagement) {
        bestEngagement = avg;
        bestHour = hour;
      }
    }
    
    return {
      bestHour: bestHour ? `${bestHour}:00` : null,
      expectedEngagement: bestEngagement.toFixed(2),
      confidence: Math.min(windows.length / 50, 1)
    };
  }
  
  /**
   * Suggest improvements based on patterns
   */
  suggestImprovements(agent) {
    const perf = this.data.agentPerformance[agent];
    if (!perf) return [];
    
    const suggestions = [];
    
    if (perf.avgScore < 8) {
      suggestions.push(`Quality below threshold. Review recent outputs and adjust.`);
    }
    
    if (perf.successRate < 0.8) {
      suggestions.push(`Success rate low. Consider reducing task complexity.`);
    }
    
    if (perf.bestTime) {
      suggestions.push(`Optimal time identified: ${perf.bestTime}. Schedule accordingly.`);
    }
    
    return suggestions;
  }
  
  /**
   * Get learning summary
   */
  getSummary() {
    const agents = Object.keys(this.data.agentPerformance);
    const avgScores = agents.map(a => this.data.agentPerformance[a].avgScore);
    const overallAvg = avgScores.reduce((a, b) => a + b, 0) / avgScores.length || 0;
    
    return {
      agentsTracked: agents.length,
      overallAvgScore: overallAvg.toFixed(1),
      razPatternsRecorded: {
        responses: this.data.razPatterns.responseTimes.length,
        productivity: this.data.razPatterns.productivityWindows.length,
        preferences: Object.keys(this.data.razPatterns.preferences).length
      },
      predictions: this.data.predictions.length,
      suggestions: agents.flatMap(a => this.suggestImprovements(a))
    };
  }
}

module.exports = new LearningEngine();

// Test
if (require.main === module) {
  const engine = new LearningEngine();
  
  // Record sample data
  engine.recordAgentPerformance('claw-researcher', {
    score: 8.5,
    success: true,
    duration: 120
  });
  
  engine.recordRazPattern('productivity', {
    hour: 9,
    activity: 'high',
    engagement: 0.9
  });
  
  console.log('Learning Engine Summary:', engine.getSummary());
}
