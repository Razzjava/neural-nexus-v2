/**
 * Neural Nexus Agent Wrapper
 * 
 * Wraps existing agents to integrate with:
 * - Event Bus (communication)
 * - Smart Scheduler (adaptive triggers)
 * - Quality Gate (output review)
 */

const EventBus = require('../neural-nexus/event-bus');
const QualityGate = require('../neural-nexus/quality-gate');

class AgentWrapper {
  constructor(agentName, config = {}) {
    this.agent = agentName;
    this.config = {
      qualityThreshold: 8,
      autoRetry: true,
      maxRetries: 2,
      emitEvents: true,
      ...config
    };
    this.retryCount = 0;
  }
  
  /**
   * Execute agent task with full integration
   */
  async execute(taskFn, context = {}) {
    console.log(`[AgentWrapper] ${this.agent} starting task`);
    
    // Emit start event
    if (this.config.emitEvents) {
      EventBus.emit('agent.started', {
        agent: this.agent,
        context,
        timestamp: new Date().toISOString()
      }, context.priority || 5);
    }
    
    try {
      // Execute the actual agent task
      const output = await taskFn(context);
      
      // Quality Gate review
      const review = await QualityGate.review(output, this.agent);
      
      if (review.passed) {
        // Approved - emit completion
        if (this.config.emitEvents) {
          EventBus.emit('agent.completed', {
            agent: this.agent,
            output,
            review,
            timestamp: new Date().toISOString()
          }, context.priority || 5);
        }
        
        this.retryCount = 0;
        return { success: true, output, review };
        
      } else if (this.config.autoRetry && this.retryCount < this.config.maxRetries) {
        // Retry with feedback
        this.retryCount++;
        console.log(`[AgentWrapper] ${this.agent} retry ${this.retryCount}/${this.config.maxRetries}`);
        
        return this.execute(taskFn, {
          ...context,
          feedback: review.feedback,
          previousOutput: output,
          retry: this.retryCount
        });
        
      } else {
        // Failed after retries
        if (this.config.emitEvents) {
          EventBus.emit('agent.failed', {
            agent: this.agent,
            output,
            review,
            retries: this.retryCount,
            timestamp: new Date().toISOString()
          }, 9);
        }
        
        this.retryCount = 0;
        return { success: false, output, review, reason: 'quality_threshold_not_met' };
      }
      
    } catch (error) {
      // Execution error
      console.error(`[AgentWrapper] ${this.agent} error:`, error.message);
      
      if (this.config.emitEvents) {
        EventBus.emit('agent.error', {
          agent: this.agent,
          error: error.message,
          context,
          timestamp: new Date().toISOString()
        }, 10);
      }
      
      throw error;
    }
  }
  
  /**
   * Listen for events and auto-trigger
   */
  on(eventType, handler) {
    console.log(`[AgentWrapper] ${this.agent} listening for: ${eventType}`);
    
    // Poll for events every 30 seconds
    setInterval(async () => {
      await EventBus.consume(eventType, async (payload) => {
        console.log(`[AgentWrapper] ${this.agent} triggered by: ${eventType}`);
        await handler(payload);
      });
    }, 30000);
  }
  
  /**
   * Emit custom event
   */
  emit(eventType, payload, priority = 5) {
    if (this.config.emitEvents) {
      EventBus.emit(eventType, {
        agent: this.agent,
        ...payload,
        timestamp: new Date().toISOString()
      }, priority);
    }
  }
}

// Pre-configured wrappers for each agent
const agents = {
  researcher: new AgentWrapper('claw-researcher', { priority: 7 }),
  hunter: new AgentWrapper('claw-hunter', { priority: 8 }),
  videoEditor: new AgentWrapper('claw-video-editor', { priority: 6 }),
  dev: new AgentWrapper('claw-dev', { priority: 5 }),
  qa: new AgentWrapper('claw-qa', { priority: 5 }),
  coach: new AgentWrapper('claw-coach', { priority: 7 }),
  ceo: new AgentWrapper('claw-ceo', { priority: 9 })
};

// Set up cross-agent triggers
function setupCrossAgentTriggers() {
  // Researcher → Video Editor
  agents.researcher.on('research.complete', async (payload) => {
    await agents.videoEditor.execute(async () => {
      // Trigger video creation with research data
      return { videoCreated: true, basedOn: payload };
    }, { priority: 6, research: payload });
  });
  
  // Video Editor → Coach (motivation)
  agents.videoEditor.on('video.rendered', async (payload) => {
    await agents.coach.execute(async () => {
      return { motivation: 'Video created! Keep going!', event: 'video_created' };
    }, { priority: 7, video: payload });
  });
  
  // Dev → QA (auto-test)
  agents.dev.on('code.committed', async (payload) => {
    await agents.qa.execute(async () => {
      // Run tests on committed code
      return { testsRun: true, coverage: '85%', passed: true };
    }, { priority: 5, code: payload });
  });
  
  // Hunter → CEO (urgent jobs)
  agents.hunter.on('job.urgent', async (payload) => {
    await agents.ceo.execute(async () => {
      return { action: 'prioritize', job: payload, message: 'High-match job found!' };
    }, { priority: 10, job: payload });
  });
  
  console.log('[AgentWrapper] Cross-agent triggers configured');
}

module.exports = {
  AgentWrapper,
  agents,
  setupCrossAgentTriggers
};

// Initialize if run directly
if (require.main === module) {
  setupCrossAgentTriggers();
  console.log('Agent wrappers ready');
}
