/**
 * Neural Nexus System Manager v2.0
 * 
 * Integrated management layer that coordinates:
 * - Self-healing orchestrator
 * - Failure analysis engine
 * - Meta-learning engine
 * - Quality gate
 * - All agents
 * - Agent-to-Agent Messaging System (NEXUS-001)
 * 
 * This is the main entry point for the enhanced Neural Nexus.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Import enhanced components
const orchestrator = require('./self-healing-orchestrator');
const failureAnalysis = require('./failure-analysis-engine');
const metaLearning = require('./meta-learning-engine');
const qualityGate = require('./quality-gate');
const { EventBus } = require('./event-bus');

// Import NEXUS-001: Agent-to-Agent Messaging
const { EnhancedEventBus, MESSAGE_TYPE } = require('./enhanced-event-bus');
const { AgentMessageProtocol } = require('./messaging-protocol');
const { MessageHistoryTracker } = require('./message-history');

const NEXUS_DIR = '/root/.openclaw/workspace/neural-nexus';
const TELEGRAM_GROUP = '-5297940191';

class NeuralNexusSystem {
  constructor() {
    // NEXUS-001: Use Enhanced Event Bus with messaging capabilities
    this.bus = new EnhancedEventBus('nexus-system');
    this.startedAt = new Date().toISOString();
    this.status = 'initializing';
    this.healthStatus = {};
    
    // Message routing registry
    this.messageRoutes = new Map();
    this.agentRegistry = new Map();
    
    // Subscribe to all system events
    this.bus.subscribe([
      'AGENT_FAILED', 'AGENT_COMPLETED', 'AGENT_STARTED',
      'QUALITY_REJECTED', 'QUALITY_APPROVED',
      'HEALING_REQUIRED', 'HEALING_COMPLETED',
      'SYSTEM_ALERT'
    ], this.handleSystemEvent.bind(this));
    
    // NEXUS-001: Subscribe to agent messages
    this.bus.onMessage(this.handleAgentMessage.bind(this));
    
    // Register message routes for system components
    this.registerMessageRoutes();
  }

  /**
   * NEXUS-001: Register message routes for system components
   */
  registerMessageRoutes() {
    // Route messages to appropriate handlers
    this.messageRoutes.set('orchestrator', this.routeToOrchestrator.bind(this));
    this.messageRoutes.set('failure-analysis', this.routeToFailureAnalysis.bind(this));
    this.messageRoutes.set('meta-learning', this.routeToMetaLearning.bind(this));
    this.messageRoutes.set('quality-gate', this.routeToQualityGate.bind(this));
    this.messageRoutes.set('system-manager', this.handleSystemMessage.bind(this));
  }

  /**
   * NEXUS-001: Handle incoming agent messages
   */
  async handleAgentMessage(payload, message) {
    console.log(`[Messaging] Received ${message.type} from ${message.sender}`);
    
    // Log message receipt
    this.logMessage('received', message);
    
    // Route based on message type and target
    const target = payload.target || message.metadata?.target || 'system-manager';
    const route = this.messageRoutes.get(target);
    
    if (route) {
      try {
        const result = await route(payload, message);
        
        // Send acknowledgment if requested
        if (payload.ack !== false) {
          await this.sendAcknowledgment(message, result);
        }
      } catch (error) {
        console.error(`[Messaging] Route error for ${target}:`, error.message);
        await this.sendErrorResponse(message, error);
      }
    } else {
      console.warn(`[Messaging] No route for target: ${target}`);
    }
  }

  /**
   * NEXUS-001: Send acknowledgment response
   */
  async sendAcknowledgment(originalMessage, result) {
    await this.bus.respond(originalMessage, {
      status: 'acknowledged',
      result: result !== undefined ? result : null,
      processedAt: new Date().toISOString()
    });
  }

  /**
   * NEXUS-001: Send error response
   */
  async sendErrorResponse(originalMessage, error) {
    await this.bus.respond(originalMessage, {
      status: 'error',
      error: {
        message: error.message,
        type: error.name
      },
      processedAt: new Date().toISOString()
    });
  }

  /**
   * NEXUS-001: Route to orchestrator
   */
  async routeToOrchestrator(payload, message) {
    switch (payload.action) {
      case 'spawn-agent':
        return await orchestrator.spawnDynamicAgent(payload.params);
      case 'evolve-agent':
        return await orchestrator.evolveAgent(payload.agentId, payload.dna);
      case 'get-dna':
        return orchestrator.agentDNA[payload.agentId];
      case 'update-dna':
        await orchestrator.updateAgentDNA(payload.agentId, payload.metrics);
        return { updated: true };
      default:
        throw new Error(`Unknown orchestrator action: ${payload.action}`);
    }
  }

  /**
   * NEXUS-001: Route to failure analysis
   */
  async routeToFailureAnalysis(payload, message) {
    switch (payload.action) {
      case 'analyze':
        return await failureAnalysis.analyzeFailure(payload.failure);
      case 'get-forecast':
        return failureAnalysis.getForecast();
      default:
        throw new Error(`Unknown failure-analysis action: ${payload.action}`);
    }
  }

  /**
   * NEXUS-001: Route to meta-learning
   */
  async routeToMetaLearning(payload, message) {
    switch (payload.action) {
      case 'record-strategy':
        metaLearning.recordStrategy(payload.strategy);
        return { recorded: true };
      case 'get-collective-intelligence':
        return metaLearning.getCollectiveIntelligence();
      case 'evolve-system':
        return await metaLearning.evolveSystem();
      default:
        throw new Error(`Unknown meta-learning action: ${payload.action}`);
    }
  }

  /**
   * NEXUS-001: Route to quality gate
   */
  async routeToQualityGate(payload, message) {
    switch (payload.action) {
      case 'review':
        return await qualityGate.review(payload.output, payload.agent);
      case 'get-criteria':
        return qualityGate.reviewCriteria;
      default:
        throw new Error(`Unknown quality-gate action: ${payload.action}`);
    }
  }

  /**
   * NEXUS-001: Handle system-level messages
   */
  async handleSystemMessage(payload, message) {
    switch (payload.action) {
      case 'get-status':
        return this.getStatus();
      case 'health-check':
        return await this.runHealthCheck();
      case 'register-agent':
        this.registerAgent(payload.agentId, payload.capabilities);
        return { registered: true };
      case 'broadcast':
        return await this.broadcastToAgents(payload.message, payload.filter);
      case 'send-direct':
        return await this.sendDirectMessage(payload.recipient, payload.content, payload.options);
      default:
        return { status: 'unknown-action', action: payload.action };
    }
  }

  /**
   * NEXUS-001: Register an agent with the system
   */
  registerAgent(agentId, capabilities = []) {
    this.agentRegistry.set(agentId, {
      id: agentId,
      capabilities,
      registeredAt: new Date().toISOString(),
      lastSeen: new Date().toISOString(),
      status: 'active'
    });
    
    console.log(`[Messaging] Registered agent: ${agentId}`);
    
    // Register route for this agent if needed
    this.bus.registerRoute(agentId, { type: 'local', priority: 1 });
  }

  /**
   * NEXUS-001: Unregister an agent
   */
  unregisterAgent(agentId) {
    const agent = this.agentRegistry.get(agentId);
    if (agent) {
      agent.status = 'inactive';
      agent.unregisteredAt = new Date().toISOString();
      this.agentRegistry.set(agentId, agent);
      console.log(`[Messaging] Unregistered agent: ${agentId}`);
    }
  }

  /**
   * NEXUS-001: Send direct message to specific agent
   */
  async sendDirectMessage(recipient, content, options = {}) {
    const result = await this.bus.send(recipient, content, options);
    this.logMessage('sent', { id: result.messageId, recipient, content });
    return result;
  }

  /**
   * NEXUS-001: Broadcast message to all or filtered agents
   */
  async broadcastToAgents(message, filter = null) {
    let targets = Array.from(this.agentRegistry.keys());
    
    if (filter) {
      if (filter.capabilities) {
        targets = targets.filter(id => {
          const agent = this.agentRegistry.get(id);
          return filter.capabilities.every(cap => agent.capabilities.includes(cap));
        });
      }
      if (filter.status) {
        targets = targets.filter(id => {
          const agent = this.agentRegistry.get(id);
          return agent.status === filter.status;
        });
      }
    }
    
    const results = await this.bus.broadcast(targets, message, { type: MESSAGE_TYPE.BROADCAST });
    this.logMessage('broadcast', { recipients: targets, message });
    return { sent: results.length, recipients: targets };
  }

  /**
   * NEXUS-001: Get conversation history between agents
   */
  getConversation(agent1, agent2) {
    return this.bus.getConversation(agent1, agent2);
  }

  /**
   * NEXUS-001: Query message history
   */
  queryMessageHistory(filters = {}) {
    return this.bus.queryHistory(filters);
  }

  /**
   * NEXUS-001: Log message activity
   */
  logMessage(direction, message) {
    const logEntry = {
      direction,
      timestamp: new Date().toISOString(),
      messageId: message.id || message.messageId,
      sender: message.sender,
      recipient: message.recipient,
      type: message.type
    };
    
    const logFile = path.join(NEXUS_DIR, 'logs', 'message-routing.log');
    fs.appendFileSync(logFile, JSON.stringify(logEntry) + '\n');
  }

  /**
   * Initialize and start the system
   */
  async initialize() {
    console.log('🧠 Neural Nexus v2.0 Initializing...');
    console.log('📨 Agent-to-Agent Messaging: Enabled (NEXUS-001)');
    
    // Ensure directory structure
    this.ensureDirectories();
    
    // Run health check
    this.healthStatus = await this.runHealthCheck();
    
    if (!this.healthStatus.healthy) {
      console.log('⚠️  System has health issues, but continuing...');
      await this.notify(`⚠️ Neural Nexus starting with health issues:\n${this.formatHealthIssues()}`);
    }
    
    // Start event polling
    this.startEventPolling();
    
    // Start periodic maintenance
    this.startMaintenanceLoop();
    
    this.status = 'running';
    console.log('✅ Neural Nexus v2.0 Running');
    console.log('✅ Agent Messaging System Active');
    
    await this.notify('🧠 Neural Nexus v2.0 is now online\n\nSelf-healing: Active\nMeta-learning: Active\nFailure analysis: Active\nAgent Messaging: Active (NEXUS-001)');
    
    return { status: 'running', health: this.healthStatus };
  }

  /**
   * Ensure all required directories exist
   */
  ensureDirectories() {
    const dirs = [
      'dna', 'logs', 'analysis', 'meta-learning',
      'state', 'agents', 'agents-output',
      'state/message-history', 'state/message-queue'
    ];
    
    for (const dir of dirs) {
      const fullPath = path.join(NEXUS_DIR, dir);
      if (!fs.existsSync(fullPath)) {
        fs.mkdirSync(fullPath, { recursive: true });
      }
    }
  }

  /**
   * Handle system events
   */
  async handleSystemEvent(payload, event) {
    console.log(`[System] ${event.type} from ${event.agent}`);
    
    switch(event.type) {
      case 'AGENT_FAILED':
        await this.handleAgentFailure(payload);
        break;
      case 'AGENT_COMPLETED':
        await this.handleAgentCompletion(payload);
        break;
      case 'QUALITY_REJECTED':
        await this.handleQualityRejection(payload);
        break;
      case 'HEALING_COMPLETED':
        await this.handleHealingComplete(payload);
        break;
      case 'SYSTEM_ALERT':
        await this.notify(`🚨 ${payload.message}`);
        break;
    }
  }

  /**
   * Handle agent failure with full analysis
   */
  async handleAgentFailure(failure) {
    // 1. Deep analysis
    const analysis = await failureAnalysis.analyzeFailure(failure);
    
    console.log(`[System] Failure analyzed: ${analysis.rootCause.cause}`);
    
    // 2. Check cascade risk
    if (analysis.cascadeRisk.level === 'high') {
      await this.notify(`⚠️ High cascade risk detected:\n` +
        `Failed: ${failure.agent}\n` +
        `At risk: ${analysis.cascadeRisk.affectedAgents.join(', ')}\n` +
        `Action: Initiating protective measures`);
    }
    
    // 3. Trigger healing if needed
    if (analysis.rootCause.requiresHealing) {
      await orchestrator.spawnHealingAgent({
        targetAgent: failure.agent,
        diagnosis: analysis.rootCause,
        failure,
        priority: analysis.cascadeRisk.level
      });
    }
    
    // 4. Record for learning
    metaLearning.recordStrategy({
      agent: failure.agent,
      name: `failure-recovery-${failure.error?.message?.slice(0, 30)}`,
      capabilities: ['error-recovery', analysis.rootCause.cause],
      initialSuccess: 0.3
    });
  }

  /**
   * Handle agent completion
   */
  async handleAgentCompletion(completion) {
    const { agent, output, metrics } = completion;
    
    // 1. Quality check
    const review = await qualityGate.review(output, agent);
    
    if (!review.passed) {
      this.bus.publish('QUALITY_REJECTED', {
        agent,
        output,
        review,
        feedback: review.feedback
      });
      return;
    }
    
    // 2. Update agent DNA
    await orchestrator.updateAgentDNA(agent, metrics);
    
    // 3. Record successful strategy
    metaLearning.recordStrategy({
      agent,
      name: `${agent}-success-pattern`,
      capabilities: metrics.capabilities || ['execution'],
      initialSuccess: (metrics.score || 7) / 10
    });
    
    // 4. Check for evolution opportunity
    const dna = orchestrator.agentDNA[agent];
    if (dna && orchestrator.shouldEvolve(agent, dna)) {
      await orchestrator.evolveAgent(agent, dna);
    }
  }

  /**
   * Handle quality rejection
   */
  async handleQualityRejection(rejection) {
    const { agent, review } = rejection;
    
    console.log(`[System] Quality rejected for ${agent}: ${review.overallScore}/10`);
    
    // Spawn improvement agent
    await orchestrator.spawnImprovementAgent(agent, rejection);
  }

  /**
   * Handle healing completion
   */
  async handleHealingComplete(healing) {
    const { targetAgent, success, changes } = healing;
    
    if (success) {
      await this.notify(`✅ Healing completed for ${targetAgent}\nChanges: ${changes.join(', ')}`);
      
      // Record successful healing strategy
      metaLearning.recordStrategy({
        agent: 'healing-specialist',
        name: `${targetAgent}-healing`,
        capabilities: ['diagnosis', 'repair', 'testing'],
        initialSuccess: 0.9
      });
    } else {
      await this.notify(`❌ Healing failed for ${targetAgent}\nEscalating to manual review`);
    }
  }

  /**
   * Run comprehensive health check
   */
  async runHealthCheck() {
    const checks = {
      disk: await this.checkDisk(),
      memory: await this.checkMemory(),
      gateway: await this.checkGateway(),
      agents: await this.checkAgents(),
      dna: await this.checkDNA(),
      messaging: await this.checkMessaging()  // NEXUS-001
    };
    
    const failed = Object.entries(checks).filter(([_, c]) => !c.healthy);
    
    return {
      healthy: failed.length === 0,
      checks,
      failed: failed.map(([name, check]) => ({ name, ...check }))
    };
  }

  async checkDisk() {
    try {
      const output = execSync('df -h / | tail -1', { encoding: 'utf8' });
      const usage = parseInt(output.match(/(\d+)%/)[1]);
      return { healthy: usage < 90, usage: usage + '%' };
    } catch (e) {
      return { healthy: false, error: e.message };
    }
  }

  async checkMemory() {
    try {
      const output = execSync('free | grep Mem', { encoding: 'utf8' });
      const parts = output.trim().split(/\s+/);
      const usage = Math.round((parseInt(parts[2]) / parseInt(parts[1])) * 100);
      return { healthy: usage < 90, usage: usage + '%' };
    } catch (e) {
      return { healthy: false, error: e.message };
    }
  }

  async checkGateway() {
    try {
      execSync('openclaw gateway status', { timeout: 5000 });
      return { healthy: true };
    } catch {
      return { healthy: false };
    }
  }

  async checkAgents() {
    const agentsDir = path.join(NEXUS_DIR, 'agents');
    if (!fs.existsSync(agentsDir)) {
      return { healthy: false, error: 'Agents directory missing' };
    }
    
    const agents = fs.readdirSync(agentsDir).filter(f => f.endsWith('.js'));
    return { healthy: agents.length > 0, count: agents.length };
  }

  async checkDNA() {
    const dnaFile = path.join(NEXUS_DIR, 'dna', 'agent-registry.json');
    if (!fs.existsSync(dnaFile)) {
      return { healthy: false, error: 'DNA registry missing' };
    }
    
    try {
      const dna = JSON.parse(fs.readFileSync(dnaFile, 'utf8'));
      const count = Object.keys(dna).length;
      return { healthy: count > 0, agentCount: count };
    } catch {
      return { healthy: false, error: 'DNA registry corrupt' };
    }
  }

  /**
   * NEXUS-001: Check messaging system health
   */
  async checkMessaging() {
    try {
      const stats = this.bus.getStats();
      return {
        healthy: true,
        stats,
        registeredAgents: this.agentRegistry.size,
        messageRoutes: this.messageRoutes.size
      };
    } catch (e) {
      return { healthy: false, error: e.message };
    }
  }

  formatHealthIssues() {
    return this.healthStatus.failed
      ?.map(f => `• ${f.name}: ${f.error || f.usage}`)
      .join('\n') || 'Unknown';
  }

  /**
   * Start polling for events
   */
  startEventPolling() {
    setInterval(() => {
      this.bus.poll();
    }, 5000); // Poll every 5 seconds
  }

  /**
   * Start maintenance loop
   */
  startMaintenanceLoop() {
    // Run evolution every hour
    setInterval(async () => {
      console.log('[System] Running scheduled evolution...');
      const result = await metaLearning.evolveSystem();
      console.log('[System] Evolution complete:', result);
    }, 3600000);
    
    // Health check every 10 minutes
    setInterval(async () => {
      this.healthStatus = await this.runHealthCheck();
      if (!this.healthStatus.healthy) {
        await this.notify(`⚠️ Health check failed:\n${this.formatHealthIssues()}`);
      }
    }, 600000);
  }

  /**
   * Execute an agent with full orchestration
   */
  async executeAgent(agentName, task = {}) {
    console.log(`[System] Executing agent: ${agentName}`);
    
    this.bus.publish('AGENT_STARTED', { agent: agentName, task });
    
    try {
      // Use dynamic spawning if agent doesn't exist
      const dnaFile = path.join(NEXUS_DIR, 'dna', 'agent-registry.json');
      const dna = fs.existsSync(dnaFile) ? JSON.parse(fs.readFileSync(dnaFile, 'utf8')) : {};
      
      if (!dna[agentName]) {
        // Spawn dynamic agent
        const result = await orchestrator.spawnDynamicAgent({
          purpose: agentName,
          capabilitiesNeeded: task.capabilities || ['execution'],
          task,
          priority: task.priority || 'normal'
        });
        
        return result;
      }
      
      // Execute existing agent via orchestrator
      // This would integrate with your existing agent scripts
      return { agent: agentName, status: 'executed' };
      
    } catch (error) {
      this.bus.publish('AGENT_FAILED', {
        agent: agentName,
        error,
        task
      });
      throw error;
    }
  }

  /**
   * Get full system status
   */
  getStatus() {
    return {
      status: this.status,
      startedAt: this.startedAt,
      uptime: Date.now() - new Date(this.startedAt).getTime(),
      health: this.healthStatus,
      messaging: {  // NEXUS-001
        enabled: true,
        registeredAgents: Array.from(this.agentRegistry.entries()).map(([id, info]) => ({
          id,
          capabilities: info.capabilities,
          status: info.status
        })),
        routes: Array.from(this.messageRoutes.keys()),
        stats: this.bus.getStats()
      },
      collectiveIntelligence: metaLearning.getCollectiveIntelligence(),
      failureForecast: failureAnalysis.getForecast(),
      agentDNA: orchestrator.agentDNA
    };
  }

  /**
   * Send notification
   */
  async notify(message) {
    try {
      execSync(
        `openclaw message send --target "${TELEGRAM_GROUP}" --message "${message.replace(/"/g, '\\"')}"`,
        { timeout: 10000 }
      );
    } catch (e) {
      console.error('[System] Failed to notify:', e.message);
    }
  }

  /**
   * Shutdown gracefully
   */
  async shutdown() {
    console.log('[System] Shutting down...');
    this.status = 'shutting_down';
    
    await this.notify('🛑 Neural Nexus v2.0 shutting down gracefully');
    
    // Save all state
    metaLearning.saveKnowledge();
    orchestrator.saveAgentDNA();
    
    this.status = 'offline';
    console.log('[System] Offline');
  }
}

// Export singleton
const nexus = new NeuralNexusSystem();

// CLI usage
if (require.main === module) {
  const command = process.argv[2];
  
  switch(command) {
    case 'start':
      nexus.initialize();
      break;
    case 'status':
      console.log(JSON.stringify(nexus.getStatus(), null, 2));
      break;
    case 'execute':
      const agent = process.argv[3];
      if (!agent) {
        console.log('Usage: node system-manager.js execute <agent-name>');
        process.exit(1);
      }
      nexus.executeAgent(agent, { priority: 'normal' })
        .then(result => console.log('Result:', result))
        .catch(err => console.error('Error:', err.message));
      break;
    case 'health':
      nexus.runHealthCheck().then(result => {
        console.log(JSON.stringify(result, null, 2));
      });
      break;
    case 'messaging':  // NEXUS-001: New CLI command
      const msgCommand = process.argv[3];
      const recipient = process.argv[4];
      const content = process.argv[5];
      
      if (msgCommand === 'send' && recipient && content) {
        nexus.sendDirectMessage(recipient, { text: content })
          .then(result => console.log('Sent:', result))
          .catch(err => console.error('Error:', err.message));
      } else if (msgCommand === 'history') {
        const history = nexus.queryMessageHistory({ limit: 20 });
        console.log(JSON.stringify(history, null, 2));
      } else if (msgCommand === 'stats') {
        console.log(JSON.stringify(nexus.bus.getStats(), null, 2));
      } else {
        console.log('Messaging commands:');
        console.log('  messaging send <recipient> <content> - Send direct message');
        console.log('  messaging history - Show recent messages');
        console.log('  messaging stats - Show messaging statistics');
      }
      break;
    case 'shutdown':
      nexus.shutdown();
      break;
    default:
      console.log('Neural Nexus System Manager v2.0');
      console.log('');
      console.log('Usage: node system-manager.js <command>');
      console.log('');
      console.log('Commands:');
      console.log('  start          - Initialize and start the system');
      console.log('  status         - Show full system status');
      console.log('  execute <agent> - Execute an agent');
      console.log('  health         - Run health check');
      console.log('  messaging      - Agent messaging commands (NEXUS-001)');
      console.log('  shutdown       - Graceful shutdown');
  }
}

module.exports = nexus;
