const cron = require('node-cron');
const EventBus = require('./event-bus');

class SmartScheduler {
  constructor() {
    this.schedules = new Map();
    this.adaptiveHistory = new Map();
    this.running = false;
  }
  
  /**
   * Schedule a task with smart conditions
   * @param {string} taskId - Unique task identifier
   * @param {object} config - Scheduling configuration
   */
  schedule(taskId, config) {
    const { 
      agent,           // Agent name
      cronExpression,  // Traditional cron (optional)
      eventTriggers,   // ['job.posted', 'trend.spike'] (optional)
      signalCheck,     // Function to check if should run (optional)
      priority = 5,    // 1-10
      adaptive = true  // Learn from history
    } = config;
    
    this.schedules.set(taskId, {
      agent,
      cronExpression,
      eventTriggers: eventTriggers || [],
      signalCheck,
      priority,
      adaptive,
      lastRun: null,
      runCount: 0,
      successCount: 0
    });
    
    // Set up cron if provided
    if (cronExpression) {
      cron.schedule(cronExpression, () => {
        this.execute(taskId);
      }, {
        timezone: 'Europe/London'
      });
    }
    
    // Set up event listeners
    if (eventTriggers.length > 0) {
      eventTriggers.forEach(eventType => {
        this.setupEventListener(taskId, eventType);
      });
    }
    
    console.log(`[SmartScheduler] Scheduled: ${taskId} (${agent})`);
  }
  
  /**
   * Set up event-based triggering
   */
  setupEventListener(taskId, eventType) {
    // Poll for events every minute
    setInterval(async () => {
      await EventBus.consume(eventType, async (payload) => {
        console.log(`[SmartScheduler] Event triggered: ${taskId} via ${eventType}`);
        await this.execute(taskId, { eventTriggered: true, payload });
      });
    }, 60000);
  }
  
  /**
   * Execute a scheduled task
   */
  async execute(taskId, context = {}) {
    const schedule = this.schedules.get(taskId);
    if (!schedule) {
      console.error(`[SmartScheduler] Unknown task: ${taskId}`);
      return;
    }
    
    // Check signal conditions
    if (schedule.signalCheck && !schedule.signalCheck()) {
      console.log(`[SmartScheduler] Signal check failed for: ${taskId}`);
      return;
    }
    
    // Adaptive: Check if we should run based on history
    if (schedule.adaptive && !this.shouldRunNow(taskId)) {
      console.log(`[SmartScheduler] Adaptive delay for: ${taskId}`);
      return;
    }
    
    console.log(`[SmartScheduler] Executing: ${taskId}`);
    
    // Emit event for agent to pick up
    EventBus.emit('task.triggered', {
      taskId,
      agent: schedule.agent,
      priority: schedule.priority,
      context
    }, schedule.priority);
    
    // Update history
    schedule.lastRun = new Date().toISOString();
    schedule.runCount++;
    
    this.schedules.set(taskId, schedule);
  }
  
  /**
   * Adaptive: Determine if we should run now
   */
  shouldRunNow(taskId) {
    const schedule = this.schedules.get(taskId);
    const history = this.adaptiveHistory.get(taskId) || [];
    
    // If never run, always run
    if (history.length === 0) return true;
    
    // Calculate success rate
    const successRate = history.filter(h => h.success).length / history.length;
    
    // If low success rate, reduce frequency
    if (successRate < 0.5 && schedule.runCount > 5) {
      // Skip every other run
      return schedule.runCount % 2 === 0;
    }
    
    return true;
  }
  
  /**
   * Record task result for adaptive learning
   */
  recordResult(taskId, success, metrics = {}) {
    const history = this.adaptiveHistory.get(taskId) || [];
    history.push({
      timestamp: new Date().toISOString(),
      success,
      metrics
    });
    
    // Keep last 20 records
    if (history.length > 20) history.shift();
    
    this.adaptiveHistory.set(taskId, history);
    
    // Update schedule success count
    const schedule = this.schedules.get(taskId);
    if (schedule && success) {
      schedule.successCount++;
      this.schedules.set(taskId, schedule);
    }
  }
  
  /**
   * Trigger a task immediately
   */
  triggerNow(taskId, context = {}) {
    console.log(`[SmartScheduler] Manual trigger: ${taskId}`);
    return this.execute(taskId, { manual: true, ...context });
  }
  
  /**
   * Get schedule statistics
   */
  getStats() {
    const stats = {};
    for (const [taskId, schedule] of this.schedules) {
      const history = this.adaptiveHistory.get(taskId) || [];
      stats[taskId] = {
        agent: schedule.agent,
        runCount: schedule.runCount,
        successCount: schedule.successCount,
        successRate: schedule.runCount > 0 ? (schedule.successCount / schedule.runCount).toFixed(2) : 0,
        lastRun: schedule.lastRun,
        historySize: history.length
      };
    }
    return stats;
  }
  
  /**
   * List all schedules
   */
  listSchedules() {
    return Array.from(this.schedules.entries()).map(([id, config]) => ({
      id,
      ...config
    }));
  }
}

// Export singleton
module.exports = new SmartScheduler();

// Example usage
if (require.main === module) {
  const scheduler = new SmartScheduler();
  
  // Schedule Raz's agents with smart triggers
  scheduler.schedule('claw-researcher', {
    agent: 'claw-researcher',
    cronExpression: '0 9 * * 1', // Mondays 9am
    eventTriggers: ['trend.spike'],
    priority: 7
  });
  
  scheduler.schedule('claw-hunter', {
    agent: 'claw-hunter',
    cronExpression: '0 9 * * 2', // Tuesdays 9am
    eventTriggers: ['job.posted'],
    priority: 8
  });
  
  scheduler.schedule('claw-video-editor', {
    agent: 'claw-video-editor',
    cronExpression: '0 11 * * 1', // Mondays 11am
    eventTriggers: ['research.complete'],
    priority: 6
  });
  
  console.log('\nSmartScheduler initialized');
  console.log('Stats:', scheduler.getStats());
}
