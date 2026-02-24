#!/usr/bin/env node

/**
 * Neural Nexus Performance Tracker
 * 
 * Tracks all agent performance, user engagement, and improvement metrics
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = '/root/.openclaw/workspace/agents-output/performance';
const LOG_FILE = path.join(DATA_DIR, 'agent-performance.jsonl');
const DASHBOARD_FILE = path.join(DATA_DIR, 'dashboard.json');

// Ensure directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

class PerformanceTracker {
  constructor() {
    this.agents = [
      'claw-researcher',
      'claw-hunter', 
      'claw-video-editor',
      'claw-dev',
      'claw-qa',
      'claw-coach',
      'claw-ceo',
      'claw-social'
    ];
  }

  /**
   * Log an agent run with full metrics
   */
  logAgentRun(data) {
    const entry = {
      timestamp: new Date().toISOString(),
      agent: data.agent,
      task: data.task,
      duration: data.duration, // seconds
      success: data.success,
      qualityScore: data.qualityScore || null, // 1-10
      tokensUsed: data.tokensUsed || null,
      outputSize: data.outputSize || null, // bytes
      userEngagement: data.userEngagement || null, // did user act on it?
      userFeedback: data.userFeedback || null, // explicit feedback
      error: data.error || null,
      metadata: data.metadata || {}
    };

    // Append to log file
    fs.appendFileSync(LOG_FILE, JSON.stringify(entry) + '\n');
    
    console.log(`[Performance] Logged: ${data.agent} - ${data.task} - ${data.success ? 'SUCCESS' : 'FAILED'}`);
    
    return entry;
  }

  /**
   * Get performance stats for an agent
   */
  getAgentStats(agent, days = 7) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    
    const entries = this.getEntriesSince(cutoff);
    const agentEntries = entries.filter(e => e.agent === agent);
    
    if (agentEntries.length === 0) {
      return { agent, runs: 0, message: 'No data' };
    }

    const runs = agentEntries.length;
    const successes = agentEntries.filter(e => e.success).length;
    const avgDuration = agentEntries.reduce((sum, e) => sum + (e.duration || 0), 0) / runs;
    const avgQuality = agentEntries
      .filter(e => e.qualityScore)
      .reduce((sum, e) => sum + e.qualityScore, 0) / agentEntries.filter(e => e.qualityScore).length || 0;
    const engagementRate = agentEntries.filter(e => e.userEngagement).length / runs;
    
    return {
      agent,
      period: `${days} days`,
      runs,
      successRate: (successes / runs * 100).toFixed(1) + '%',
      avgDuration: Math.round(avgDuration) + 's',
      avgQuality: avgQuality.toFixed(1) + '/10',
      engagementRate: (engagementRate * 100).toFixed(1) + '%',
      trend: this.calculateTrend(agentEntries)
    };
  }

  /**
   * Calculate performance trend (improving/declining/stable)
   */
  calculateTrend(entries) {
    if (entries.length < 10) return 'insufficient_data';
    
    const half = Math.floor(entries.length / 2);
    const firstHalf = entries.slice(0, half);
    const secondHalf = entries.slice(half);
    
    const firstQuality = firstHalf.filter(e => e.qualityScore).reduce((sum, e) => sum + e.qualityScore, 0) / firstHalf.filter(e => e.qualityScore).length || 0;
    const secondQuality = secondHalf.filter(e => e.qualityScore).reduce((sum, e) => sum + e.qualityScore, 0) / secondHalf.filter(e => e.qualityScore).length || 0;
    
    const diff = secondQuality - firstQuality;
    if (diff > 0.5) return 'improving';
    if (diff < -0.5) return 'declining';
    return 'stable';
  }

  /**
   * Get all entries since a date
   */
  getEntriesSince(date) {
    try {
      const content = fs.readFileSync(LOG_FILE, 'utf8');
      return content
        .split('\n')
        .filter(line => line.trim())
        .map(line => JSON.parse(line))
        .filter(entry => new Date(entry.timestamp) >= date);
    } catch {
      return [];
    }
  }

  /**
   * Generate full dashboard
   */
  generateDashboard() {
    const dashboard = {
      generated: new Date().toISOString(),
      summary: {
        totalRuns: 0,
        overallSuccess: 0,
        avgQuality: 0
      },
      agents: {}
    };

    this.agents.forEach(agent => {
      const stats = this.getAgentStats(agent, 7);
      dashboard.agents[agent] = stats;
      if (stats.runs > 0) {
        dashboard.summary.totalRuns += stats.runs;
      }
    });

    // Calculate overall stats
    const allEntries = this.getEntriesSince(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));
    if (allEntries.length > 0) {
      const successes = allEntries.filter(e => e.success).length;
      dashboard.summary.overallSuccess = (successes / allEntries.length * 100).toFixed(1) + '%';
      
      const qualityScores = allEntries.filter(e => e.qualityScore).map(e => e.qualityScore);
      if (qualityScores.length > 0) {
        dashboard.summary.avgQuality = (qualityScores.reduce((a, b) => a + b, 0) / qualityScores.length).toFixed(1) + '/10';
      }
    }

    // Save dashboard
    fs.writeFileSync(DASHBOARD_FILE, JSON.stringify(dashboard, null, 2));
    
    return dashboard;
  }

  /**
   * Get improvement suggestions
   */
  getImprovementSuggestions() {
    const suggestions = [];
    
    this.agents.forEach(agent => {
      const stats = this.getAgentStats(agent, 7);
      
      if (stats.runs === 0) {
        suggestions.push({ agent, issue: 'no_runs', action: 'Check if cron is enabled' });
      } else if (parseFloat(stats.successRate) < 80) {
        suggestions.push({ agent, issue: 'low_success_rate', action: 'Review error logs, simplify tasks' });
      } else if (parseFloat(stats.avgQuality) < 7) {
        suggestions.push({ agent, issue: 'low_quality', action: 'Improve prompts, add examples' });
      } else if (stats.trend === 'declining') {
        suggestions.push({ agent, issue: 'declining_trend', action: 'Analyze recent failures' });
      }
    });
    
    return suggestions;
  }

  /**
   * Log user feedback
   */
  logFeedback(agent, feedback, metadata = {}) {
    return this.logAgentRun({
      agent,
      task: 'user_feedback',
      duration: 0,
      success: true,
      userFeedback: feedback,
      metadata
    });
  }
}

// Export singleton
const tracker = new PerformanceTracker();

// CLI usage
if (require.main === module) {
  const command = process.argv[2];
  
  switch(command) {
    case 'dashboard':
      console.log(JSON.stringify(tracker.generateDashboard(), null, 2));
      break;
    case 'suggestions':
      console.log(JSON.stringify(tracker.getImprovementSuggestions(), null, 2));
      break;
    case 'test':
      // Log test entries
      tracker.logAgentRun({
        agent: 'claw-researcher',
        task: 'research trends',
        duration: 120,
        success: true,
        qualityScore: 8.5,
        userEngagement: true
      });
      console.log('Test entry logged');
      break;
    default:
      console.log('Usage: node performance-tracker.js [dashboard|suggestions|test]');
  }
}

module.exports = tracker;
