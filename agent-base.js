#!/usr/bin/env node

/**
 * Neural Nexus Agent Base - Real Operational Daemon
 * All agents extend this for consistent metrics and monitoring
 */

const fs = require('fs');
const path = require('path');

const NEXUS_DIR = '/root/.openclaw/workspace/neural-nexus';
const STATE_DIR = path.join(NEXUS_DIR, 'state');
const LOG_DIR = path.join(NEXUS_DIR, 'logs');

// Ensure directories
[STATE_DIR, LOG_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

class AgentBase {
  constructor(agentId, options = {}) {
    this.agentId = agentId;
    this.name = options.name || agentId;
    this.running = false;
    this.startTime = Date.now();
    this.cycleCount = 0;
    this.metrics = {
      tasksCompleted: 0,
      errors: 0,
      lastTask: null,
      ...options.defaultMetrics
    };
    this.options = {
      workInterval: 5 * 60 * 1000, // 5 minutes default
      ...options
    };
  }

  log(msg) {
    const timestamp = new Date().toISOString();
    const logLine = `[${timestamp}] [${this.agentId}] ${msg}\n`;
    console.log(logLine.trim());
    
    // Also write to log file
    const logFile = path.join(LOG_DIR, `${this.agentId}.log`);
    fs.appendFileSync(logFile, logLine);
  }

  /**
   * Update state file for supervisor monitoring
   */
  updateState(status, data = {}) {
    const stateFile = path.join(STATE_DIR, `${this.agentId}.json`);
    const state = {
      agentId: this.agentId,
      name: this.name,
      status,
      pid: process.pid,
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
      cycleCount: this.cycleCount,
      metrics: this.metrics,
      lastUpdate: Date.now(),
      ...data
    };
    
    try {
      fs.writeFileSync(stateFile, JSON.stringify(state, null, 2));
    } catch (e) {
      this.log(`Failed to update state: ${e.message}`);
    }
  }

  /**
   * Main work cycle - override in subclass
   */
  async doWork() {
    // Override this method
    this.log('No work defined - override doWork()');
  }

  /**
   * Run one cycle
   */
  async runCycle() {
    this.cycleCount++;
    this.log(`Starting cycle ${this.cycleCount}...`);
    
    try {
      this.updateState('WORKING', { currentTask: 'executing' });
      await this.doWork();
      this.metrics.tasksCompleted++;
      this.updateState('IDLE', { currentTask: null, lastCycle: Date.now() });
      this.log(`Cycle ${this.cycleCount} complete`);
    } catch (error) {
      this.log(`Error in cycle: ${error.message}`);
      this.metrics.errors++;
      this.updateState('ERROR', { error: error.message });
    }
  }

  /**
   * Daemon mode - run continuously
   */
  async runDaemon() {
    this.log(`Starting daemon mode (PID ${process.pid})...`);
    this.running = true;
    
    // Initial state
    this.updateState('STARTING');
    
    // Handle shutdown signals
    const shutdown = (signal) => {
      this.log(`Received ${signal}, shutting down...`);
      this.running = false;
      this.updateState('STOPPING');
      process.exit(0);
    };
    
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
    
    // Run immediately, then on interval
    await this.runCycle();
    
    while (this.running) {
      await this.sleep(this.options.workInterval);
      if (this.running) {
        await this.runCycle();
      }
    }
  }

  /**
   * One-shot mode - run once and exit
   */
  async runOnce() {
    this.log('Running in one-shot mode...');
    await this.runCycle();
    this.log('Complete.');
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = AgentBase;
