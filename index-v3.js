#!/usr/bin/env node

/**
 * Neural Nexus - Complete System (Phase 3)
 * 
 * Fully autonomous multi-agent system with:
 * - Event-driven architecture
 * - Smart scheduling
 * - Quality gating
 * - Natural language commands
 * - Learning engine
 * - Predictive orchestration
 * - Performance optimization
 */

const EventBus = require('./event-bus');
const SmartScheduler = require('./smart-scheduler');
const QualityGate = require('./quality-gate');
const ClawCommand = require('./claw-command');
const { agents, setupCrossAgentTriggers } = require('./agent-wrapper');
const LearningEngine = require('./learning-engine');
const PredictiveOrchestrator = require('./predictive-orchestrator');
const PerformanceOptimizer = require('./performance-optimizer');

class NeuralNexus {
  constructor() {
    this.name = 'Neural Nexus';
    this.version = '3.0.0';
    this.phase = 'Predictive Orchestration & Adaptive Learning';
    this.components = {
      eventBus: EventBus,
      scheduler: SmartScheduler,
      qualityGate: QualityGate,
      command: ClawCommand,
      agents,
      learning: LearningEngine,
      predictor: PredictiveOrchestrator,
      optimizer: PerformanceOptimizer
    };
    this.status = 'initializing';
    this.startTime = Date.now();
  }
  
  /**
   * Initialize the complete Neural Nexus
   */
  async initialize() {
    console.log(`\n🧠 ${this.name} v${this.version}`);
    console.log(`   ${this.phase}\n`);
    
    // Phase 1: Core infrastructure
    this.setupEventListeners();
    this.scheduleAgents();
    
    // Phase 2: Agent integration
    setupCrossAgentTriggers();
    
    // Phase 3: Learning & prediction
    await this.initializeLearning();
    await this.runInitialPredictions();
    
    this.status = 'running';
    console.log('✅ Neural Nexus is fully operational\n');
    
    // Emit startup event
    EventBus.emit('nexus.started', {
      version: this.version,
      phase: this.phase,
      timestamp: new Date().toISOString()
    }, 10);
    
    // Start maintenance loops
    this.startMaintenanceLoops();
  }
  
  /**
   * Initialize learning systems
   */
  async initializeLearning() {
    console.log('[Nexus] Initializing learning engine...');
    
    // Load historical data
    const summary = LearningEngine.getSummary();
    console.log(`[Nexus] Learning data loaded:`, summary);
    
    // Set up learning event listeners
    EventBus.consume('agent.completed', async (payload) => {
      LearningEngine.recordAgentPerformance(payload.agent, {
        score: payload.review?.overallScore || 0,
        success: true,
        duration: payload.duration
      });
    });
    
    EventBus.consume('raz.interaction', async (payload) => {
      LearningEngine.recordRazPattern(payload.type, payload.data);
    });
  }
  
  /**
   * Run initial predictions
   */
  async runInitialPredictions() {
    console.log('[Nexus] Running initial predictions...');
    
    const predictions = await PredictiveOrchestrator.runPredictions();
    console.log(`[Nexus] Predictions: ${predictions.trends.length} trends, ${predictions.preFetchQueue.length} pre-fetches`);
  }
  
  /**
   * Start maintenance loops
   */
  startMaintenanceLoops() {
    // Hourly: Run predictions
    setInterval(async () => {
      await PredictiveOrchestrator.runPredictions();
    }, 3600000);
    
    // Daily: Performance optimization
    setInterval(async () => {
      const optimizations = await PerformanceOptimizer.runOptimization();
      console.log('[Nexus] Daily optimization complete:', optimizations.summary);
    }, 86400000);
    
    // Weekly: Full system report
    setInterval(() => {
      this.generateWeeklyReport();
    }, 604800000);
  }
  
  /**
   * Generate weekly executive report
   */
  generateWeeklyReport() {
    const report = {
      timestamp: new Date().toISOString(),
      learning: LearningEngine.getSummary(),
      predictions: PredictiveOrchestrator.getSummary(),
      optimizations: PerformanceOptimizer.getReport(),
      system: this.getStatus()
    };
    
    EventBus.emit('nexus.weekly_report', report, 9);
    
    return report;
  }
  
  /**
   * Core event setup (from Phase 1)
   */
  setupEventListeners() {
    // Quality review pipeline
    EventBus.consume('agent.completed', async (payload) => {
      const review = await QualityGate.review(payload.output, payload.agent);
      
      if (review.passed) {
        this.deliverToRaz({ output: payload.output, review });
      } else {
        this.requestImprovement({ agent: payload.agent, review });
      }
    });
    
    console.log('[Nexus] Core event listeners configured');
  }
  
  /**
   * Agent scheduling (from Phase 1)
   */
  scheduleAgents() {
    const schedules = [
      { name: 'claw-researcher', cron: '0 9 * * 1', priority: 7 },
      { name: 'claw-hunter', cron: '0 9 * * 2', priority: 8 },
      { name: 'claw-video-editor', cron: '0 11 * * 1', priority: 6 },
      { name: 'claw-dev', cron: '0 14 * * 3', priority: 5 },
      { name: 'claw-qa', cron: '0 16 * * 4', priority: 5 },
      { name: 'claw-coach', cron: '0 18 * * 0', priority: 7 },
      { name: 'claw-ceo', cron: '0 12 * * 0', priority: 9 }
    ];
    
    schedules.forEach(s => {
      SmartScheduler.schedule(s.name, {
        agent: s.name,
        cronExpression: s.cron,
        priority: s.priority,
        adaptive: true
      });
    });
    
    console.log('[Nexus] Agents scheduled');
  }
  
  /**
   * Deliver approved content to Raz
   */
  deliverToRaz(approval) {
    EventBus.emit('raz.delivery', {
      agent: approval.review.agent,
      output: approval.output,
      score: approval.review.overallScore,
      timestamp: new Date().toISOString()
    }, 9);
  }
  
  /**
   * Request agent improvement
   */
  requestImprovement({ agent, review }) {
    EventBus.emit('agent.improve', {
      agent,
      feedback: review.feedback,
      timestamp: new Date().toISOString()
    }, 8);
  }
  
  /**
   * Process natural language command
   */
  async processCommand(input) {
    return await ClawCommand.execute(input);
  }
  
  /**
   * Get full system status
   */
  getStatus() {
    return {
      name: this.name,
      version: this.version,
      phase: this.phase,
      status: this.status,
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
      components: {
        scheduler: SmartScheduler.getStats(),
        learning: LearningEngine.getSummary(),
        predictions: PredictiveOrchestrator.getSummary(),
        pendingEvents: EventBus.listEvents().length
      }
    };
  }
  
  /**
   * Predict and optimize
   */
  async predictAndOptimize() {
    const predictions = await PredictiveOrchestrator.runPredictions();
    const optimizations = await PerformanceOptimizer.runOptimization();
    
    return {
      predictions,
      optimizations,
      learning: LearningEngine.getSummary()
    };
  }
}

// Export and run
const nexus = new NeuralNexus();

if (require.main === module) {
  nexus.initialize().then(() => {
    console.log('\n🎯 Neural Nexus Phase 3 is live\n');
    console.log('Commands:');
    console.log('  - "Find viral video ideas"');
    console.log('  - "System status"');
    console.log('  - "Predict trends"');
  });
}

module.exports = nexus;
