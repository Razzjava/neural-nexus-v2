#!/usr/bin/env node

/**
 * Neural Nexus Agent Supervisor - Complete Edition
 * Real process manager for ALL workforce and core agents
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const NEXUS_DIR = '/root/.openclaw/workspace/neural-nexus';
const AGENTS_DIR = path.join(NEXUS_DIR, 'agents');
const WORKFORCE_DIR = path.join(NEXUS_DIR, 'workforce', 'agents');
const STATE_DIR = path.join(NEXUS_DIR, 'state');
const LOG_DIR = path.join(NEXUS_DIR, 'logs');

// Ensure directories
[STATE_DIR, LOG_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// Complete Agent Registry - ALL agents
const AGENTS = {
  // Workforce Agents
  'scout-worker': {
    script: path.join(WORKFORCE_DIR, 'scout-worker.js'),
    enabled: true,
    restartPolicy: 'always',
    maxRestarts: 5,
    env: {}
  },
  'content-empire': {
    script: path.join(WORKFORCE_DIR, 'content-empire.js'),
    enabled: true,
    restartPolicy: 'always',
    maxRestarts: 3,
    env: {}
  },
  'startup-generator': {
    script: path.join(WORKFORCE_DIR, 'startup-generator.js'),
    enabled: true,
    restartPolicy: 'on-failure',
    maxRestarts: 2,
    env: {}
  },
  'nexus-dev-team': {
    script: path.join(WORKFORCE_DIR, 'nexus-dev-team.js'),
    enabled: true,
    restartPolicy: 'always',
    maxRestarts: 3,
    env: {}
  },
  'remotion-video': {
    script: path.join(WORKFORCE_DIR, 'remotion-video-agent.js'),
    enabled: true,
    restartPolicy: 'on-failure',
    maxRestarts: 5,
    env: {}
  },
  'workforce-reporter': {
    script: path.join(WORKFORCE_DIR, 'workforce-reporter.js'),
    enabled: true,
    restartPolicy: 'always',
    maxRestarts: 3,
    env: {}
  },
  // Core Development Agents
  'architect': {
    script: path.join(AGENTS_DIR, 'architect-agent-daemon.js'),
    enabled: true,
    restartPolicy: 'always',
    maxRestarts: 3,
    env: {}
  },
  'backend-dev': {
    script: path.join(AGENTS_DIR, 'backend-dev-agent-daemon.js'),
    enabled: true,
    restartPolicy: 'always',
    maxRestarts: 3,
    env: {}
  },
  'frontend-dev': {
    script: path.join(AGENTS_DIR, 'frontend-dev-agent-daemon.js'),
    enabled: true,
    restartPolicy: 'always',
    maxRestarts: 3,
    env: {}
  },
  'devops': {
    script: path.join(AGENTS_DIR, 'devops-agent-daemon.js'),
    enabled: true,
    restartPolicy: 'always',
    maxRestarts: 3,
    env: {}
  },
  'qa': {
    script: path.join(AGENTS_DIR, 'qa-agent-daemon.js'),
    enabled: true,
    restartPolicy: 'always',
    maxRestarts: 3,
    env: {}
  },
  'ba': {
    script: path.join(AGENTS_DIR, 'ba-agent-daemon.js'),
    enabled: true,
    restartPolicy: 'always',
    maxRestarts: 3,
    env: {}
  },
  'pm': {
    script: path.join(AGENTS_DIR, 'pm-agent-daemon.js'),
    enabled: true,
    restartPolicy: 'always',
    maxRestarts: 3,
    env: {}
  },
  'healing-specialist': {
    script: path.join(AGENTS_DIR, 'healing-specialist-daemon.js'),
    enabled: true,
    restartPolicy: 'always',
    maxRestarts: 5,
    env: {}
  },
  'manifestor': {
    script: path.join(AGENTS_DIR, 'manifestor-daemon.js'),
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
    const stateFile = path.join(STATE_DIR, 'supervisor-state.json');
    if (fs.existsSync(stateFile)) {
      return JSON.parse(fs.readFileSync(stateFile, 'utf8'));
    }
    return {};
  }

  saveStates() {
    const stateFile = path.join(STATE_DIR, 'supervisor-state.json');
    fs.writeFileSync(stateFile, JSON.stringify(this.agentStates, null, 2));
  }

  calculateMetrics(agentId, proc) {
    try {
      let cpuTime = 0;
      let memoryMB = 0;
      
      if (proc.pid) {
        const statPath = `/proc/${proc.pid}/stat`;
        const statmPath = `/proc/${proc.pid}/statm`;
        
        if (fs.existsSync(statPath)) {
          const stat = fs.readFileSync(statPath, 'utf8').split(' ');
          cpuTime = (parseInt(stat[13]) + parseInt(stat[14])) / 100;
        }
        
        if (fs.existsSync(statmPath)) {
          const statm = fs.readFileSync(statmPath, 'utf8').split(' ');
          const pageSize = 4096;
          memoryMB = (parseInt(statm[1]) * pageSize) / (1024 * 1024);
        }
      }

      const uptime = proc.startTime ? (Date.now() - proc.startTime) / 1000 : 0;
      const restartCount = this.agentStates[agentId]?.restartCount || 0;
      
      let dnaIntegrity = 100;
      dnaIntegrity -= restartCount * 5;
      if (proc.lastError) dnaIntegrity -= 15;
      if (uptime < 60) dnaIntegrity -= 10;
      dnaIntegrity = Math.max(0, Math.min(100, dnaIntegrity));

      const cognitiveLoad = Math.min(100, (cpuTime / Math.max(uptime, 1)) * 10);
      
      const lastUpdate = this.agentStates[agentId]?.lastUpdate || 0;
      const timeSinceUpdate = Date.now() - lastUpdate;
      const neuralSync = Math.max(0, 100 - (timeSinceUpdate / 60000));

      let statusCategory;
      if (dnaIntegrity >= 95) statusCategory = 'OPTIMAL';
      else if (dnaIntegrity >= 80) statusCategory = 'STABLE';
      else if (dnaIntegrity >= 60) statusCategory = 'WARNING';
      else if (dnaIntegrity >= 40) statusCategory = 'DEGRADED';
      else statusCategory = 'CRITICAL';

      return {
        pid: proc.pid,
        uptime: Math.floor(uptime),
        memoryMB: Math.floor(memoryMB),
        cpuTime: Math.floor(cpuTime),
        dnaIntegrity: Math.floor(dnaIntegrity),
        cognitiveLoad: Math.floor(cognitiveLoad),
        neuralSync: Math.floor(neuralSync),
        restartCount,
        statusCategory
      };
    } catch (e) {
      return { pid: proc.pid, error: e.message, statusCategory: 'UNKNOWN' };
    }
  }

  startAgent(agentId) {
    const config = AGENTS[agentId];
    if (!config) {
      console.error(`[Supervisor] Unknown agent: ${agentId}`);
      return false;
    }

    if (!fs.existsSync(config.script)) {
      console.error(`[Supervisor] Script not found: ${config.script}`);
      return false;
    }

    console.log(`[Supervisor] Starting ${agentId}...`);

    const logFile = fs.openSync(path.join(LOG_DIR, `${agentId}.log`), 'a');
    
    const proc = spawn('node', [config.script, 'daemon'], {
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
          neuralSync: 0,
          statusCategory: 'OFFLINE'
        };
      } else {
        status.agents[agentId] = { status: 'DISABLED' };
      }
    }

    return status;
  }

  monitor() {
    console.log('[Supervisor] Running health check...');
    
    for (const [agentId, config] of Object.entries(AGENTS)) {
      const proc = this.processes.get(agentId);
      const state = this.agentStates[agentId];

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
          console.error(`[Supervisor] ${agentId} exceeded max restarts`);
        }
      }
    }

    const health = this.getHealthStatus();
    fs.writeFileSync(
      path.join(STATE_DIR, 'health-snapshot.json'),
      JSON.stringify(health, null, 2)
    );
  }

  startAll() {
    console.log('[Supervisor] Starting ALL enabled agents...');
    for (const [agentId, config] of Object.entries(AGENTS)) {
      if (config.enabled && !this.processes.has(agentId)) {
        this.startAgent(agentId);
      }
    }
  }

  stopAll() {
    console.log('[Supervisor] Stopping ALL agents...');
    for (const agentId of this.processes.keys()) {
      this.stopAgent(agentId);
    }
  }

  list() {
    const status = this.getHealthStatus();
    console.log('\n=== NEURAL NEXUS AGENT FLEET ===\n');
    
    const categories = {
      workforce: [],
      core: [],
      personal: []
    };

    for (const [agentId, metrics] of Object.entries(status.agents)) {
      const cat = AGENTS[agentId]?.category || 'core';
      categories[cat === 'workforce' ? 'workforce' : cat === 'personal' ? 'personal' : 'core'].push({
        id: agentId,
        ...metrics
      });
    }

    console.log('WORKFORCE AGENTS:');
    categories.workforce.forEach(a => {
      const statusIcon = a.statusCategory === 'OPTIMAL' ? '✅' : 
                        a.statusCategory === 'STABLE' ? '🟢' :
                        a.statusCategory === 'WARNING' ? '🟡' :
                        a.statusCategory === 'CRITICAL' ? '🔴' : '⚪';
      console.log(`  ${statusIcon} ${a.id.padEnd(20)} PID:${(a.pid || 'N/A').toString().padEnd(8)} DNA:${a.dnaIntegrity || 0}%`);
    });

    console.log('\nCORE DEVELOPMENT AGENTS:');
    categories.core.forEach(a => {
      const statusIcon = a.statusCategory === 'OPTIMAL' ? '✅' : 
                        a.statusCategory === 'STABLE' ? '🟢' :
                        a.statusCategory === 'WARNING' ? '🟡' :
                        a.statusCategory === 'CRITICAL' ? '🔴' : '⚪';
      console.log(`  ${statusIcon} ${a.id.padEnd(20)} PID:${(a.pid || 'N/A').toString().padEnd(8)} DNA:${a.dnaIntegrity || 0}%`);
    });

    console.log('\nPERSONAL AGENTS:');
    categories.personal.forEach(a => {
      const statusIcon = a.statusCategory === 'OPTIMAL' ? '✅' : 
                        a.statusCategory === 'STABLE' ? '🟢' :
                        a.statusCategory === 'WARNING' ? '🟡' :
                        a.statusCategory === 'CRITICAL' ? '🔴' : '⚪';
      console.log(`  ${statusIcon} ${a.id.padEnd(20)} PID:${(a.pid || 'N/A').toString().padEnd(8)} DNA:${a.dnaIntegrity || 0}%`);
    });

    console.log('\n================================\n');
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
  case 'list':
    supervisor.list();
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
    console.log('Usage: node agent-supervisor.js [start|stop|status|list|monitor|start-one <agent>|stop-one <agent>]');
}

module.exports = AgentSupervisor;
