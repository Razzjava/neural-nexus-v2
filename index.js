#!/usr/bin/env node

/**
 * Neural Nexus - Main Orchestrator
 * 
 * The central brain of Raz's AI agent ecosystem.
 * Coordinates event-driven architecture, smart scheduling,
 * quality gating, and natural language commands.
 */

const EventBus = require('./event-bus');
const SmartScheduler = require('./smart-scheduler');
const QualityGate = require('./quality-gate');
const ClawCommand = require('./claw-command');

class NeuralNexus {
  constructor() {
    this.name = 'Neural Nexus';
    this.version = '1.0.0';
    this.components = {
      eventBus: EventBus,
      scheduler: SmartScheduler,
      qualityGate: QualityGate,
      command: ClawCommand
    };
    this.status = 'initializing';
  }
  
  /**
   * Initialize the Neural Nexus
   */
  async initialize() {
    console.log(`\n🧠 ${this.name} v${this.version} initializing...\n`);
    
    // Set up event listeners
    this.setupEventListeners();
    
    // Schedule Raz's agents
    this.scheduleAgents();
    
    this.status = 'running';
    console.log('✅ Neural Nexus is online\n');
    
    // Emit startup event
    EventBus.emit('nexus.started', {
      version: this.version,
      timestamp: new Date().toISOString()
    }, 10);
  }
  
  /**
   * Set up core event listeners
   */
  setupEventListeners() {
    // Task triggered events
    EventBus.consume('task.triggered', async (payload) => {
      console.log(`[Nexus] Task triggered: ${payload.taskId}`);
      // Agents pick this up via their own listeners
    });
    
    // Quality review events
    EventBus.consume('task.completed', async (payload) => {
      console.log(`[Nexus] Task completed: ${payload.agent}`);
      
      // Auto-review output
      const review = await QualityGate.review(payload.output, payload.agent);
      
      if (review.passed) {
        // Approve and deliver
        const approval = QualityGate.approve(payload.output, review);
        this.deliverToRaz(approval);
      } else {
        // Request improvement
        const improvement = await QualityGate.requestImprovement(payload.output, review);
        this.requestAgentImprovement(improvement);
      }
    });
    
    // Cross-agent collaboration
    EventBus.consume('research.complete', async (payload) => {
      console.log('[Nexus] Research complete - triggering video editor');
      // Auto-trigger video creation
      SmartScheduler.triggerNow('claw-video-editor', {
        research: payload
      });
    });
    
    EventBus.consume('video.rendered', async (payload) => {
      console.log('[Nexus] Video rendered - sending motivation');
      // Auto-send motivation
      SmartScheduler.triggerNow('claw-coach', {
        event: 'video_created'
      });
    });
    
    console.log('[Nexus] Event listeners configured');
  }
  
  /**
   * Schedule all Raz's agents
   */
  scheduleAgents() {
    // claw-researcher: Mondays 9am + trend spikes
    SmartScheduler.schedule('claw-researcher', {
      agent: 'claw-researcher',
      cronExpression: '0 9 * * 1',
      eventTriggers: ['trend.spike', 'command.research.viral'],
      priority: 7,
      adaptive: true
    });
    
    // claw-hunter: Tuesdays 9am + job postings
    SmartScheduler.schedule('claw-hunter', {
      agent: 'claw-hunter',
      cronExpression: '0 9 * * 2',
      eventTriggers: ['job.posted', 'command.job.search'],
      priority: 8,
      adaptive: true
    });
    
    // claw-video-editor: Mondays 11am + research complete
    SmartScheduler.schedule('claw-video-editor', {
      agent: 'claw-video-editor',
      cronExpression: '0 11 * * 1',
      eventTriggers: ['research.complete', 'command.video.create'],
      priority: 6,
      adaptive: true
    });
    
    // claw-dev: Wednesdays 2pm
    SmartScheduler.schedule('claw-dev', {
      agent: 'claw-dev',
      cronExpression: '0 14 * * 3',
      priority: 5,
      adaptive: true
    });
    
    // claw-qa: Thursdays 4pm
    SmartScheduler.schedule('claw-qa', {
      agent: 'claw-qa',
      cronExpression: '0 16 * * 4',
      priority: 5,
      adaptive: true
    });
    
    // claw-coach: Sundays 6pm + motivation requests
    SmartScheduler.schedule('claw-coach', {
      agent: 'claw-coach',
      cronExpression: '0 18 * * 0',
      eventTriggers: ['command.coach.motivate', 'video.rendered'],
      priority: 7,
      adaptive: false // Always run when requested
    });
    
    // claw-ceo: Sundays 12pm + status requests
    SmartScheduler.schedule('claw-ceo', {
      agent: 'claw-ceo',
      cronExpression: '0 12 * * 0',
      eventTriggers: ['command.ceo.status', 'command.ceo.performance'],
      priority: 9,
      adaptive: false
    });
    
    console.log('[Nexus] All agents scheduled');
  }
  
  /**
   * Deliver approved output to Raz
   */
  deliverToRaz(approval) {
    console.log(`[Nexus] Delivering to Raz: ${approval.review.agent}`);
    
    // Emit delivery event (picked up by Telegram notifier)
    EventBus.emit('raz.delivery', {
      agent: approval.review.agent,
      output: approval.output,
      score: approval.review.overallScore,
      timestamp: new Date().toISOString()
    }, 9);
  }
  
  /**
   * Request agent to improve output
   */
  requestAgentImprovement(improvement) {
    console.log(`[Nexus] Requesting improvement: ${improvement.originalOutput.agent}`);
    
    EventBus.emit('agent.improve', {
      ...improvement,
      timestamp: new Date().toISOString()
    }, 8);
  }
  
  /**
   * Process natural language command
   */
  async processCommand(input) {
    console.log(`[Nexus] Processing command: "${input}"`);
    return await ClawCommand.execute(input);
  }
  
  /**
   * Get full system status
   */
  getStatus() {
    return {
      name: this.name,
      version: this.version,
      status: this.status,
      scheduler: SmartScheduler.getStats(),
      quality: QualityGate.getAllStats(),
      pendingEvents: EventBus.listEvents().length,
      uptime: process.uptime()
    };
  }
  
  /**
   * Run maintenance tasks
   */
  async maintenance() {
    console.log('[Nexus] Running maintenance...');
    
    // Clean up old events
    EventBus.cleanupProcessed(7);
    
    // Log stats
    const stats = this.getStatus();
    console.log('[Nexus] Stats:', JSON.stringify(stats, null, 2));
    
    return stats;
  }
}

// Export and run
const nexus = new NeuralNexus();

if (require.main === module) {
  nexus.initialize().then(() => {
    console.log('\n🎯 Neural Nexus is ready for Raz\n');
    
    // Keep alive
    setInterval(() => {
      nexus.maintenance();
    }, 3600000); // Hourly maintenance
    
    // Test command
    setTimeout(async () => {
      console.log('\n🧪 Testing command interface...\n');
      await nexus.processCommand('Find me viral video ideas');
    }, 2000);
  });
}

module.exports = nexus;
