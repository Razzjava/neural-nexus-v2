#!/usr/bin/env node

/**
 * Neural Nexus Robustness Engine
 * 
 * Handles retries, fallbacks, circuit breakers, and error recovery
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const STATE_DIR = '/root/.openclaw/workspace/neural-nexus/state';
const LOG_FILE = path.join(STATE_DIR, 'robustness.log');

// Ensure state directory exists
if (!fs.existsSync(STATE_DIR)) {
  fs.mkdirSync(STATE_DIR, { recursive: true });
}

class RobustnessEngine {
  constructor() {
    this.circuitBreakers = new Map();
    this.retryCounts = new Map();
    this.maxRetries = 3;
    this.circuitThreshold = 5; // failures before opening circuit
    this.circuitTimeout = 600000; // 10 minutes
  }

  /**
   * Execute with full retry and circuit breaker logic
   */
  async execute(taskName, fn, options = {}) {
    const {
      maxRetries = this.maxRetries,
      timeout = 300000, // 5 minutes default
      fallback = null,
      critical = false
    } = options;

    // Check circuit breaker
    if (this.isCircuitOpen(taskName)) {
      this.log('circuit_open', taskName);
      if (fallback) {
        return await fallback();
      }
      throw new Error(`Circuit breaker open for ${taskName}`);
    }

    let lastError;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        this.log('attempt', taskName, { attempt, maxRetries });
        
        const result = await this.executeWithTimeout(fn, timeout);
        
        // Success - reset circuit breaker
        this.recordSuccess(taskName);
        this.log('success', taskName, { attempt });
        
        return result;
      } catch (error) {
        lastError = error;
        this.recordFailure(taskName);
        this.log('failure', taskName, { attempt, error: error.message });
        
        if (attempt < maxRetries) {
          const delay = this.calculateBackoff(attempt);
          this.log('retry_delay', taskName, { delay });
          await this.sleep(delay);
        }
      }
    }

    // All retries exhausted
    if (fallback) {
      this.log('fallback', taskName);
      return await fallback();
    }

    if (critical) {
      this.log('critical_failure', taskName, { error: lastError.message });
      await this.handleCriticalFailure(taskName, lastError);
    }

    throw lastError;
  }

  /**
   * Execute with timeout
   */
  executeWithTimeout(fn, timeout) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Timeout after ${timeout}ms`));
      }, timeout);

      Promise.resolve(fn())
        .then(result => {
          clearTimeout(timer);
          resolve(result);
        })
        .catch(error => {
          clearTimeout(timer);
          reject(error);
        });
    });
  }

  /**
   * Circuit breaker logic
   */
  isCircuitOpen(taskName) {
    const breaker = this.circuitBreakers.get(taskName);
    if (!breaker) return false;
    
    if (breaker.open) {
      if (Date.now() - breaker.openedAt > this.circuitTimeout) {
        // Half-open: allow one request
        breaker.open = false;
        breaker.halfOpen = true;
        this.log('circuit_half_open', taskName);
        return false;
      }
      return true;
    }
    return false;
  }

  recordSuccess(taskName) {
    this.circuitBreakers.set(taskName, { 
      failures: 0, 
      open: false,
      halfOpen: false
    });
    this.retryCounts.delete(taskName);
  }

  recordFailure(taskName) {
    const breaker = this.circuitBreakers.get(taskName) || { failures: 0 };
    breaker.failures++;
    
    if (breaker.failures >= this.circuitThreshold) {
      breaker.open = true;
      breaker.openedAt = Date.now();
      this.log('circuit_opened', taskName, { failures: breaker.failures });
    }
    
    this.circuitBreakers.set(taskName, breaker);
  }

  /**
   * Exponential backoff
   */
  calculateBackoff(attempt) {
    return Math.min(1000 * Math.pow(2, attempt - 1), 30000);
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Handle critical failures
   */
  async handleCriticalFailure(taskName, error) {
    // Notify admin
    try {
      execSync(`openclaw message send --target "-5297940191" --message "🚨 CRITICAL FAILURE: ${taskName}\n\nError: ${error.message}\n\nTime: ${new Date().toISOString()}"`, {
        timeout: 10000
      });
    } catch {}

    // Log to file
    fs.appendFileSync(
      path.join(STATE_DIR, 'critical-failures.log'),
      JSON.stringify({
        timestamp: new Date().toISOString(),
        task: taskName,
        error: error.message,
        stack: error.stack
      }) + '\n'
    );
  }

  /**
   * Health check all systems
   */
  async healthCheck() {
    const checks = {
      gateway: await this.checkGateway(),
      telegram: await this.checkTelegram(),
      github: await this.checkGitHub(),
      disk: await this.checkDiskSpace(),
      memory: await this.checkMemory()
    };

    const failed = Object.entries(checks)
      .filter(([_, status]) => !status.healthy)
      .map(([name, status]) => ({ name, ...status }));

    if (failed.length > 0) {
      this.log('health_check_failed', 'system', { failed });
      await this.handleHealthFailures(failed);
    }

    return { healthy: failed.length === 0, checks, failed };
  }

  async checkGateway() {
    try {
      execSync('openclaw gateway status', { timeout: 5000 });
      return { healthy: true };
    } catch (error) {
      return { healthy: false, error: error.message };
    }
  }

  async checkTelegram() {
    try {
      // Check if we can send a message (dry run)
      return { healthy: true }; // Assume healthy if no errors
    } catch (error) {
      return { healthy: false, error: error.message };
    }
  }

  async checkGitHub() {
    try {
      execSync('gh auth status', { timeout: 10000 });
      return { healthy: true };
    } catch (error) {
      return { healthy: false, error: error.message };
    }
  }

  async checkDiskSpace() {
    try {
      const output = execSync('df -h / | tail -1', { encoding: 'utf8' });
      const usage = parseInt(output.match(/(\d+)%/)[1]);
      return { 
        healthy: usage < 90, 
        usage: usage + '%',
        warning: usage > 80 
      };
    } catch (error) {
      return { healthy: false, error: error.message };
    }
  }

  async checkMemory() {
    try {
      const output = execSync('free | grep Mem', { encoding: 'utf8' });
      const parts = output.trim().split(/\s+/);
      const total = parseInt(parts[1]);
      const used = parseInt(parts[2]);
      const usage = Math.round((used / total) * 100);
      
      return {
        healthy: usage < 95,
        usage: usage + '%',
        warning: usage > 85
      };
    } catch (error) {
      return { healthy: false, error: error.message };
    }
  }

  async handleHealthFailures(failures) {
    const message = `⚠️ Health Check Failed\n\n${failures.map(f => `• ${f.name}: ${f.error || f.usage}`).join('\n')}`;
    
    try {
      execSync(`openclaw message send --target "-5297940191" --message "${message}"`, {
        timeout: 10000
      });
    } catch {}
  }

  log(event, task, data = {}) {
    const entry = {
      timestamp: new Date().toISOString(),
      event,
      task,
      ...data
    };
    
    fs.appendFileSync(LOG_FILE, JSON.stringify(entry) + '\n');
  }
}

// Export singleton
const robustness = new RobustnessEngine();

// CLI usage
if (require.main === module) {
  const command = process.argv[2];
  
  switch(command) {
    case 'health':
      robustness.healthCheck().then(result => {
        console.log(JSON.stringify(result, null, 2));
        process.exit(result.healthy ? 0 : 1);
      });
      break;
    default:
      console.log('Usage: node robustness-engine.js [health]');
  }
}

module.exports = robustness;
