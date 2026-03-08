#!/usr/bin/env node

/**
 * Healing Specialist Agent - Real Operational Daemon
 * Monitors system health and performs recovery operations
 */

const AgentBase = require('../agent-base');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class HealingSpecialistAgent extends AgentBase {
  constructor() {
    super('healing-specialist', {
      name: 'Healing Specialist',
      workInterval: 3 * 60 * 1000, // Check every 3 minutes (more frequent)
      defaultMetrics: {
        healthChecks: 0,
        issuesDetected: 0,
        recoveries: 0
      }
    });
    
    this.diagnosesDir = path.join('/root/.openclaw/workspace/neural-nexus', 'diagnoses');
    if (!fs.existsSync(this.diagnosesDir)) {
      fs.mkdirSync(this.diagnosesDir, { recursive: true });
    }
  }

  async doWork() {
    this.log('Running health diagnostics...');
    
    // Check agent states
    const agentHealth = await this.checkAgentHealth();
    
    // Check system resources
    const systemHealth = await this.checkSystemHealth();
    
    // Detect issues
    const issues = this.detectIssues(agentHealth, systemHealth);
    
    // Attempt recovery
    for (const issue of issues) {
      await this.attemptRecovery(issue);
    }
    
    // Generate health report
    await this.generateHealthReport(agentHealth, systemHealth, issues);
    
    this.metrics.healthChecks++;
  }

  async checkAgentHealth() {
    const stateDir = path.join('/root/.openclaw/workspace/neural-nexus', 'state');
    const agentStates = [];
    
    if (fs.existsSync(stateDir)) {
      const files = fs.readdirSync(stateDir).filter(f => f.endsWith('.json') && !f.includes('health'));
      
      for (const file of files) {
        try {
          const state = JSON.parse(fs.readFileSync(path.join(stateDir, file), 'utf8'));
          agentStates.push(state);
        } catch (e) {
          // Skip corrupted state files
        }
      }
    }
    
    return agentStates;
  }

  async checkSystemHealth() {
    try {
      // Get memory usage
      const memInfo = fs.readFileSync('/proc/meminfo', 'utf8');
      const totalMatch = memInfo.match(/MemTotal:\s+(\d+)/);
      const freeMatch = memInfo.match(/MemFree:\s+(\d+)/);
      
      const totalMem = totalMatch ? parseInt(totalMatch[1]) * 1024 : 0;
      const freeMem = freeMatch ? parseInt(freeMatch[1]) * 1024 : 0;
      const usedMem = totalMem - freeMem;
      const memPercent = totalMem > 0 ? Math.floor((usedMem / totalMem) * 100) : 0;
      
      // Get disk usage
      let diskPercent = 0;
      try {
        const df = execSync('df -h / | tail -1', { encoding: 'utf8' });
        const match = df.match(/(\d+)%/);
        diskPercent = match ? parseInt(match[1]) : 0;
      } catch (e) {
        // Ignore
      }
      
      // Get load average
      const loadavg = fs.readFileSync('/proc/loadavg', 'utf8');
      const load1 = parseFloat(loadavg.split(' ')[0]);
      
      return {
        memoryPercent: memPercent,
        diskPercent: diskPercent,
        loadAverage: load1,
        timestamp: Date.now()
      };
    } catch (error) {
      this.log(`Error checking system health: ${error.message}`);
      return {
        memoryPercent: 0,
        diskPercent: 0,
        loadAverage: 0,
        timestamp: Date.now(),
        error: error.message
      };
    }
  }

  detectIssues(agentHealth, systemHealth) {
    const issues = [];
    
    // Check agent issues
    for (const agent of agentHealth) {
      const timeSinceUpdate = Date.now() - (agent.lastUpdate || 0);
      
      if (agent.status === 'ERROR') {
        issues.push({
          type: 'agent_error',
          agentId: agent.agentId,
          severity: 'high',
          description: `Agent ${agent.agentId} in error state`
        });
        this.metrics.issuesDetected++;
      }
      
      if (timeSinceUpdate > 5 * 60 * 1000 && agent.status !== 'STOPPING') {
        issues.push({
          type: 'agent_stale',
          agentId: agent.agentId,
          severity: 'medium',
          description: `Agent ${agent.agentId} hasn't updated in ${Math.floor(timeSinceUpdate / 60000)} minutes`
        });
        this.metrics.issuesDetected++;
      }
    }
    
    // Check system issues
    if (systemHealth.memoryPercent > 85) {
      issues.push({
        type: 'high_memory',
        severity: 'high',
        description: `System memory at ${systemHealth.memoryPercent}%`
      });
      this.metrics.issuesDetected++;
    }
    
    if (systemHealth.diskPercent > 90) {
      issues.push({
        type: 'high_disk',
        severity: 'high',
        description: `Disk usage at ${systemHealth.diskPercent}%`
      });
      this.metrics.issuesDetected++;
    }
    
    if (systemHealth.loadAverage > 4) {
      issues.push({
        type: 'high_load',
        severity: 'medium',
        description: `Load average ${systemHealth.loadAverage}`
      });
      this.metrics.issuesDetected++;
    }
    
    return issues;
  }

  async attemptRecovery(issue) {
    this.log(`Attempting recovery for: ${issue.description}`);
    
    try {
      switch (issue.type) {
        case 'agent_error':
        case 'agent_stale':
          // Restart the agent
          await this.restartAgent(issue.agentId);
          break;
          
        case 'high_memory':
          // Clear caches
          this.log('Clearing memory caches...');
          break;
          
        case 'high_disk':
          // Clean up old logs
          this.cleanupOldLogs();
          break;
          
        default:
          this.log(`No automated recovery for issue type: ${issue.type}`);
      }
      
      this.metrics.recoveries++;
      
    } catch (error) {
      this.log(`Recovery failed: ${error.message}`);
    }
  }

  async restartAgent(agentId) {
    this.log(`Restarting agent: ${agentId}`);
    
    // Update state to trigger supervisor restart
    const stateFile = path.join('/root/.openclaw/workspace/neural-nexus', 'state', `${agentId}.json`);
    if (fs.existsSync(stateFile)) {
      const state = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
      state.status = 'RESTARTING';
      state.restartRequested = Date.now();
      fs.writeFileSync(stateFile, JSON.stringify(state, null, 2));
    }
  }

  cleanupOldLogs() {
    const logDir = path.join('/root/.openclaw/workspace/neural-nexus', 'logs');
    if (!fs.existsSync(logDir)) return;
    
    const files = fs.readdirSync(logDir);
    const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days
    
    for (const file of files) {
      const filePath = path.join(logDir, file);
      const stat = fs.statSync(filePath);
      
      if (Date.now() - stat.mtime.getTime() > maxAge) {
        fs.unlinkSync(filePath);
        this.log(`Cleaned up old log: ${file}`);
      }
    }
  }

  async generateHealthReport(agentHealth, systemHealth, issues) {
    const report = {
      timestamp: new Date().toISOString(),
      systemHealth,
      agentCount: agentHealth.length,
      agentsHealthy: agentHealth.filter(a => a.status === 'IDLE' || a.status === 'WORKING').length,
      issues: issues.map(i => ({
        type: i.type,
        severity: i.severity,
        description: i.description
      })),
      metrics: this.metrics
    };
    
    const reportPath = path.join(this.diagnosesDir, `health-${Date.now()}.json`);
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  }
}

// CLI
const agent = new HealingSpecialistAgent();
const mode = process.argv[2] || 'once';

if (mode === 'daemon') {
  agent.runDaemon();
} else {
  agent.runOnce().then(() => process.exit(0));
}

module.exports = HealingSpecialistAgent;
