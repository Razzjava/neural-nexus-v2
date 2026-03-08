#!/usr/bin/env node

/**
 * Neural Nexus Agent Supervisor
 * Real process manager for workforce agents
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const NEXUS_DIR = '/root/.openclaw/workspace/neural-nexus';
const AGENTS_DIR = path.join(NEXUS_DIR, 'workforce/agents');
const STATE_DIR = path.join(NEXUS_DIR, 'state');
const LOG_DIR = path.join(NEXUS_DIR, 'logs');

// Ensure directories
[STATE_DIR, LOG_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// Agent Registry - Real operational agents
const AGENTS = {
  'scout-worker': {
    script: 'scout-worker.js',
    enabled: true,
    restartPolicy: 'always',
    maxRestarts: 5,
    env: { TASK: 'youtube-trending' }
  },
  'content-empire': {
    script: 'content-empire.js',
    enabled: true,
    restartPolicy: 'always',
    maxRestarts: 3,
    env: {}
  },
  'startup-generator': {
    script: 'startup-generator.js',
    enabled: true,
    restartPolicy: 'on-failure',
    maxRestarts: 2,
    env: {}
  },
  'nexus-dev-team': {
    script: 'nexus-dev-team.js',
    enabled: true,
    restartPolicy: 'always',
    maxRestarts: 3,
    env: {}
  },
  'remotion-video': {
    script: 'remotion-video-agent.js',
    enabled: true,
    restartPolicy: 'on-failure',
    maxRestarts: 5,
    env: {}
  },
  'workforce-reporter': {
    script: 'workforce-reporter.js',
    enabled: true,
    restartPolicy: 'always',
    maxRestarts: 3,
    env: {}
  }
};

class AgentSupervisor {
  constructor() {
    this.processes = new Map();
    this.agentStates = this.loadStates();
  }

  loadStates() {
    const stateFile = path.join(STATE_DIR, 'agent-states.json');
    if (fs.existsSync(stateFile)) {
      return JSON.parse(fs.readFileSync(stateFile, 'utf8'));
    }
    return {};
  }

  saveStates() {
    const stateFile = path.join(STATE_DIR, 'agent-states.json');
    fs.writeFileSync(stateFile, JSON.stringify(this.agentStates, null, 2));
  }

  /**
   * Calculate real agent metrics from process data
   */
  calculateMetrics(agentId, proc) {
    try {
      // Read /proc/[pid]/stat for CPU/memory
      const statPath = `/proc/${proc.pid}/stat`;
      const statmPath = `/proc/${proc.pid}/statm`;
      
      let cpuTime = 0;
      let memoryMB = 0;
      
      if (fs.existsSync(statPath)) {
        const stat = fs.readFileSync(statPath, 'utf8').split(' ');
        // utime + stime (user + system time)
        cpuTime = (parseInt(stat[13]) + parseInt(stat[14])) / 100; // in seconds
      }
      
      if (fs.existsSync(statmPath)) {
        const statm = fs.readFileSync(statmPath, 'utf8').split(' ');
        // resident set size in pages
        const pageSize = 4096; // bytes
        memoryMB = (parseInt(statm[1]) * pageSize) / (1024 * 1024);
      }

      // Calculate "DNA Integrity" based on process health
      const uptime = proc.startTime ? (Date.now() - proc.startTime) / 1000 : 0;
      const restartCount = this.agentStates[agentId]?.restartCount || 0;
      
      // DNA Integrity: 100% minus penalties for restarts and errors
      let dnaIntegrity = 100;
      dnaIntegrity -= restartCount * 5; // -5% per restart
      if (proc.lastError) dnaIntegrity -= 15;
      if (uptime < 60) dnaIntegrity -= 10; // Just started
      dnaIntegrity = Math.max(0, Math.min(100, dnaIntegrity));

      // Cognitive Load: based on CPU usage
      const cognitiveLoad = Math.min(100, (cpuTime / Math.max(uptime, 1)) * 10);

      // Neural Sync: based on state consistency
      const stateAge = this.agentStates[agentId]?.lastUpdate 
        ? (Date.now() - this.agentStates[agentId].lastUpdate) / 1000 
        : 0;
      const neuralSync = Math.max(0, 100 - (stateAge / 60)); // Degrades after 60s without update

      return {
        pid: proc.pid,
        uptime: Math.floor(uptime),
        memoryMB: Math.floor(memoryMB),
        cpuTime: Math.floor(cpuTime),
        dnaIntegrity: Math.floor(dnaIntegrity),
        cognitiveLoad: Math.floor(cognitiveLoad),
        neuralSync: Math.floor(neuralSync),
        restartCount,
        status: dnaIntegrity > 80 ? 'OPTIMAL' : dnaIntegrity > 60 ? 'STABLE' : dnaIntegrity > 40 ? 'WARNING' : 'CRITICAL'
      };
    } catch (e) {
      return {
        pid: proc.pid,
        error: e.message,
        status: 'UNKNOWN'
      };
    }
  }

  /**
   * Start an agent process
   */
  startAgent(agentId) {
    const config = AGENTS[agentId];
    if (!config) {
      console.error(`[Supervisor] Unknown agent: ${agentId}`);
      return false;
    }

    const scriptPath = path.join(AGENTS_DIR, config.script);
    if (!fs.existsSync(scriptPath)) {
      console.error(`[Supervisor] Script not found: ${scriptPath}`);
      return false;
    }

    console.log(`[Supervisor] Starting ${agentId}...`);

    const logFile = fs.openSync(path.join(LOG_DIR, `${agentId}.log`), 'a');
    
    const proc = spawn('node', [scriptPath, 'daemon'], {
      cwd: NEXUS_DIR,
      env: { ...process.env, ...config.env, AGENT_ID: agentId },
      detached: true,
      stdio: ['ignore', logFile, logFile]
    });

    proc.unref();

    this.processes.set(agentId, {
      pid: proc.pid,
      startTime: Date.now(),
      restartCount: (this.agentStates[agentId]?.restartCount || 0) + 1,
      lastError: null
    });

    this.agentStates[agentId] = {
      pid: proc.pid,
      startTime: Date.now(),
      restartCount: (this.agentStates[agentId]?.restartCount || 0) + 1,
      lastUpdate: Date.now(),
      status: 'STARTING'
    };

    this.saveStates();

    console.log(`[Supervisor] ${agentId} started with PID ${proc.pid}`);
    return true;
  }

  /**
   * Stop an agent process
   */
  stopAgent(agentId) {
    const proc = this.processes.get(agentId);
    if (!proc) {
      console.log(`[Supervisor] ${agentId} not running`);
      return false;
    }

    try {
      process.kill(proc.pid, 'SIGTERM');
      console.log(`[Supervisor] Stopped ${agentId} (PID ${proc.pid})`);
    } catch (e) {
      console.error(`[Supervisor] Failed to stop ${agentId}: ${e.message}`);
    }

    this.processes.delete(agentId);
    this.agentStates[agentId] = { ...this.agentStates[agentId], status: 'STOPPED', pid: null };
    this.saveStates();
    return true;
  }

  /**
   * Get health status of all agents
   */
  getHealthStatus() {
    const status = {
      timestamp: new Date().toISOString(),
      agents: {}
    };

    for (const [agentId, config] of Object.entries(AGENTS)) {
      const proc = this.processes.get(agentId);
      
      if (proc) {
        status.agents[agentId] = this.calculateMetrics(agentId, proc);
      } else if (config.enabled) {
        status.agents[agentId] = {
          status: 'OFFLINE',
          pid: null,
          dnaIntegrity: 0,
          cognitiveLoad: 0,
          neuralSync: 0
        };
      } else {
        status.agents[agentId] = {
          status: 'DISABLED'
        };
      }
    }

    return status;
  }

  /**
   * Monitor and restart failed agents
   */
  monitor() {
    console.log('[Supervisor] Running health check...');
    
    for (const [agentId, config] of Object.entries(AGENTS)) {
      const proc = this.processes.get(agentId);
      const state = this.agentStates[agentId];

      // Check if process is still alive
      let isAlive = false;
      if (proc && proc.pid) {
        try {
          process.kill(proc.pid, 0);
          isAlive = true;
        } catch (e) {
          isAlive = false;
        }
      }

      if (!isAlive && config.enabled) {
        const restartCount = state?.restartCount || 0;
        if (restartCount < config.maxRestarts) {
          console.log(`[Supervisor] ${agentId} not responding, restarting...`);
          this.startAgent(agentId);
        } else {
          console.error(`[Supervisor] ${agentId} exceeded max restarts, disabling`);
          config.enabled = false;
        }
      }
    }

    // Save health snapshot
    const health = this.getHealthStatus();
    fs.writeFileSync(
      path.join(STATE_DIR, 'health-snapshot.json'),
      JSON.stringify(health, null, 2)
    );
  }

  /**
   * Start all enabled agents
   */
  startAll() {
    console.log('[Supervisor] Starting all enabled agents...');
    for (const [agentId, config] of Object.entries(AGENTS)) {
      if (config.enabled && !this.processes.has(agentId)) {
        this.startAgent(agentId);
      }
    }
  }

  /**
   * Stop all agents
   */
  stopAll() {
    console.log('[Supervisor] Stopping all agents...');
    for (const agentId of this.processes.keys()) {
      this.stopAgent(agentId);
    }
  }
}

// CLI
const supervisor = new AgentSupervisor();

const command = process.argv[2];

switch (command) {
  case 'start':
    supervisor.startAll();
    break;
  case 'stop':
    supervisor.stopAll();
    break;
  case 'status':
    console.log(JSON.stringify(supervisor.getHealthStatus(), null, 2));
    break;
  case 'monitor':
    supervisor.monitor();
    break;
  case 'start-one':
    supervisor.startAgent(process.argv[3]);
    break;
  case 'stop-one':
    supervisor.stopAgent(process.argv[3]);
    break;
  default:
    console.log('Usage: node agent-supervisor.js [start|stop|status|monitor|start-one <agent>|stop-one <agent>]');
}

module.exports = AgentSupervisor;
