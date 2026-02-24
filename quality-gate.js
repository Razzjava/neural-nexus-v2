const fs = require('fs');
const path = require('path');

class QualityGate {
  constructor() {
    this.threshold = 8; // Minimum score to pass
    this.dimensions = [
      'completeness',
      'accuracy', 
      'relevance',
      'actionability',
      'presentation'
    ];
    this.reviewHistory = [];
  }
  
  /**
   * Review agent output and score it
   * @param {object} output - The agent output to review
   * @param {string} agentName - Name of the agent
   * @returns {object} Review result
   */
  async review(output, agentName) {
    console.log(`[QualityGate] Reviewing output from ${agentName}`);
    
    const scores = this.scoreDimensions(output, agentName);
    const overallScore = this.calculateOverall(scores);
    
    const review = {
      id: Date.now().toString(),
      agent: agentName,
      timestamp: new Date().toISOString(),
      scores,
      overallScore,
      passed: overallScore >= this.threshold,
      feedback: this.generateFeedback(scores),
      output: this.summarizeOutput(output)
    };
    
    this.reviewHistory.push(review);
    
    // Keep only last 100 reviews
    if (this.reviewHistory.length > 100) {
      this.reviewHistory.shift();
    }
    
    console.log(`[QualityGate] Score: ${overallScore}/10 - ${review.passed ? 'PASSED' : 'NEEDS IMPROVEMENT'}`);
    
    return review;
  }
  
  /**
   * Score individual dimensions
   */
  scoreDimensions(output, agentName) {
    const scores = {};
    
    // Completeness: Does it cover all required aspects?
    scores.completeness = this.scoreCompleteness(output, agentName);
    
    // Accuracy: Is the information correct?
    scores.accuracy = this.scoreAccuracy(output);
    
    // Relevance: Does it align with Raz's goals?
    scores.relevance = this.scoreRelevance(output, agentName);
    
    // Actionability: Can Raz act on this?
    scores.actionability = this.scoreActionability(output);
    
    // Presentation: Is it well-formatted and clear?
    scores.presentation = this.scorePresentation(output);
    
    return scores;
  }
  
  scoreCompleteness(output, agentName) {
    // Agent-specific completeness checks
    const checks = {
      'claw-researcher': () => output.topics && output.topics.length >= 8 ? 9 : 6,
      'claw-hunter': () => output.jobs && output.jobs.length >= 4 ? 9 : 6,
      'claw-video-editor': () => output.videos && output.videos.length >= 2 ? 9 : 5,
      'claw-dev': () => output.code && output.tests ? 9 : 7,
      'claw-qa': () => output.coverage && output.tests ? 9 : 7,
      'claw-coach': () => output.goals && output.feedback ? 9 : 7,
      'claw-ceo': () => output.summary && output.metrics ? 9 : 7,
      'default': () => 7
    };
    
    return (checks[agentName] || checks['default'])();
  }
  
  scoreAccuracy(output) {
    // Check for common accuracy indicators
    let score = 8; // Base score
    
    // Penalize if no sources cited for research
    if (output.sources && output.sources.length > 0) score += 1;
    
    // Penalize if no data/numbers for jobs
    if (output.jobs && output.jobs.some(j => !j.salary)) score -= 1;
    
    return Math.max(1, Math.min(10, score));
  }
  
  scoreRelevance(output, agentName) {
    // Check alignment with Raz's goals
    const razGoals = ['job', 'youtube', 'manifestation', 'wealth'];
    
    let score = 7;
    const outputStr = JSON.stringify(output).toLowerCase();
    
    razGoals.forEach(goal => {
      if (outputStr.includes(goal)) score += 0.5;
    });
    
    return Math.min(10, score);
  }
  
  scoreActionability(output) {
    let score = 7;
    
    // Check for action items
    if (output.actions && output.actions.length > 0) score += 2;
    if (output.nextSteps) score += 1;
    if (output.deadline) score += 1;
    
    return Math.min(10, score);
  }
  
  scorePresentation(output) {
    let score = 7;
    
    // Check formatting
    if (output.formatted || output.markdown) score += 1;
    if (output.structured || typeof output === 'object') score += 1;
    if (output.summary) score += 1;
    
    return Math.min(10, score);
  }
  
  calculateOverall(scores) {
    const values = Object.values(scores);
    const average = values.reduce((a, b) => a + b, 0) / values.length;
    return Math.round(average * 10) / 10;
  }
  
  generateFeedback(scores) {
    const feedback = [];
    
    if (scores.completeness < 8) {
      feedback.push('Add more comprehensive coverage of the topic');
    }
    if (scores.accuracy < 8) {
      feedback.push('Include sources or verify data accuracy');
    }
    if (scores.relevance < 8) {
      feedback.push('Connect more directly to Raz\'s goals');
    }
    if (scores.actionability < 8) {
      feedback.push('Add specific action items or next steps');
    }
    if (scores.presentation < 8) {
      feedback.push('Improve formatting and structure');
    }
    
    return feedback.length > 0 ? feedback : ['Excellent work!'];
  }
  
  summarizeOutput(output) {
    // Create a summary for storage
    return {
      type: typeof output,
      hasContent: Object.keys(output).length > 0,
      keys: Object.keys(output).slice(0, 5),
      size: JSON.stringify(output).length
    };
  }
  
  /**
   * Request improvement for failed outputs
   */
  async requestImprovement(output, review) {
    console.log(`[QualityGate] Requesting improvement from ${review.agent}`);
    
    return {
      action: 'improve',
      originalOutput: output,
      feedback: review.feedback,
      targetScore: this.threshold,
      message: `Output scored ${review.overallScore}/10. Needs improvement: ${review.feedback.join(', ')}`
    };
  }
  
  /**
   * Approve output for delivery to Raz
   */
  approve(output, review) {
    console.log(`[QualityGate] Approving output from ${review.agent}`);
    
    return {
      action: 'approve',
      output,
      review,
      message: `Quality approved (${review.overallScore}/10). Delivering to Raz.`
    };
  }
  
  /**
   * Get agent performance stats
   */
  getAgentStats(agentName) {
    const agentReviews = this.reviewHistory.filter(r => r.agent === agentName);
    
    if (agentReviews.length === 0) return null;
    
    const avgScore = agentReviews.reduce((sum, r) => sum + r.overallScore, 0) / agentReviews.length;
    const passRate = agentReviews.filter(r => r.passed).length / agentReviews.length;
    
    return {
      agent: agentName,
      totalReviews: agentReviews.length,
      averageScore: Math.round(avgScore * 10) / 10,
      passRate: Math.round(passRate * 100),
      recentTrend: agentReviews.slice(-5).map(r => r.overallScore)
    };
  }
  
  /**
   * Get all stats
   */
  getAllStats() {
    const agents = [...new Set(this.reviewHistory.map(r => r.agent))];
    return agents.map(a => this.getAgentStats(a));
  }
}

// Export singleton
module.exports = new QualityGate();

// Test
if (require.main === module) {
  const gate = new QualityGate();
  
  // Test with sample outputs
  const testOutputs = [
    {
      agent: 'claw-researcher',
      output: {
        topics: Array(10).fill({ name: 'AI', score: 9 }),
        sources: ['github', 'twitter'],
        summary: 'AI is trending'
      }
    },
    {
      agent: 'claw-hunter',
      output: {
        jobs: [
          { company: 'Test', role: 'Dev', salary: '£70k' }
        ]
      }
    }
  ];
  
  testOutputs.forEach(async ({ agent, output }) => {
    const review = await gate.review(output, agent);
    console.log(`\n${agent}:`, review.passed ? '✓ PASSED' : '✗ NEEDS WORK');
  });
}
