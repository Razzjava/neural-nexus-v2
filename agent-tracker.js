#!/usr/bin/env node

/**
 * Agent Performance Wrapper
 * 
 * Wraps agent execution with automatic performance tracking
 */

const tracker = require('./performance-tracker');

class TrackedAgent {
  constructor(agentName) {
    this.agent = agentName;
    this.startTime = null;
  }

  /**
   * Start tracking a task
   */
  start(task) {
    this.startTime = Date.now();
    this.task = task;
    console.log(`[${this.agent}] Starting: ${task}`);
    return this;
  }

  /**
   * End tracking with success
   */
  success(data = {}) {
    const duration = (Date.now() - this.startTime) / 1000;
    
    tracker.logAgentRun({
      agent: this.agent,
      task: this.task,
      duration,
      success: true,
      qualityScore: data.qualityScore,
      tokensUsed: data.tokensUsed,
      outputSize: data.outputSize,
      userEngagement: data.userEngagement,
      metadata: data.metadata
    });
    
    console.log(`[${this.agent}] Completed: ${this.task} (${duration.toFixed(1)}s)`);
    return this;
  }

  /**
   * End tracking with failure
   */
  failure(error, data = {}) {
    const duration = (Date.now() - this.startTime) / 1000;
    
    tracker.logAgentRun({
      agent: this.agent,
      task: this.task,
      duration,
      success: false,
      error: error.message || error,
      metadata: data.metadata
    });
    
    console.log(`[${this.agent}] Failed: ${this.task} - ${error.message || error}`);
    return this;
  }

  /**
   * Log explicit user feedback
   */
  feedback(feedback, metadata = {}) {
    tracker.logFeedback(this.agent, feedback, metadata);
    console.log(`[${this.agent}] Feedback: ${feedback}`);
    return this;
  }
}

// Export factory function
function trackAgent(agentName) {
  return new TrackedAgent(agentName);
}

// Example usage
if (require.main === module) {
  // Simulate tracked agent run
  const agent = trackAgent('claw-researcher');
  
  agent.start('research trending topics');
  
  // Simulate work
  setTimeout(() => {
    agent.success({
      qualityScore: 8.5,
      tokensUsed: 1500,
      userEngagement: true
    });
    
    // Generate dashboard
    console.log('\n--- Dashboard ---');
    console.log(JSON.stringify(tracker.generateDashboard(), null, 2));
  }, 100);
}

module.exports = { trackAgent, TrackedAgent };
