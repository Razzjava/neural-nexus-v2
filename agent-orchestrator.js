#!/usr/bin/env node

/**
 * Neural Nexus Agent Orchestrator
 * 
 * Robust agent execution with:
 * - Circuit breakers
 * - Exponential backoff
 * - Health checks
 * - Graceful degradation
 * - Comprehensive logging
 */

const robustness = require('./robustness-engine');
const tracker = require('./performance-tracker');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const TELEGRAM_GROUP = '-5297940191';
const WORKSPACE = '/root/.openclaw/workspace';

class AgentOrchestrator {
  constructor() {
    this.agents = {
      'claw-researcher': {
        script: `${WORKSPACE}/neural-nexus/claw-researcher.js`,
        timeout: 300000, // 5 minutes
        critical: false,
        fallback: this.generateMinimalResearch.bind(this)
      },
      'claw-hunter': {
        script: `${WORKSPACE}/neural-nexus/claw-hunter.js`,
        timeout: 300000, // 5 minutes
        critical: false,
        fallback: this.generateMinimalJobs.bind(this)
      },
      'claw-video-editor': {
        script: `${WORKSPACE}/neural-nexus/auto-video-pipeline.sh`,
        timeout: 1800000, // 30 minutes for video rendering
        critical: false,
        fallback: null
      },
      'claw-dev': {
        script: `${WORKSPACE}/neural-nexus/claw-dev.js`,
        timeout: 600000, // 10 minutes
        critical: false,
        fallback: null
      },
      'claw-qa': {
        script: `${WORKSPACE}/neural-nexus/claw-qa.js`,
        timeout: 600000, // 10 minutes
        critical: false,
        fallback: null
      },
      'claw-coach': {
        script: `${WORKSPACE}/neural-nexus/claw-coach.js`,
        timeout: 300000, // 5 minutes
        critical: false,
        fallback: this.generateMinimalCoaching.bind(this)
      },
      'claw-ceo': {
        script: `${WORKSPACE}/neural-nexus/claw-ceo.js`,
        timeout: 300000, // 5 minutes
        critical: true,
        fallback: null
      },
      'claw-social': {
        script: `${WORKSPACE}/neural-nexus/claw-social.js`,
        timeout: 300000, // 5 minutes
        critical: false,
        fallback: this.generateMinimalSocial.bind(this)
      }
    };
  }

  /**
   * Execute an agent with full robustness
   */
  async executeAgent(agentName, args = []) {
    const config = this.agents[agentName];
    if (!config) {
      throw new Error(`Unknown agent: ${agentName}`);
    }

    const startTime = Date.now();
    const track = tracker.trackAgent(agentName);
    track.start(args.join(' ') || 'scheduled run');

    try {
      await robustness.execute(
        agentName,
        () => this.runScript(config.script, args, config.timeout),
        {
          timeout: config.timeout,
          fallback: config.fallback,
          critical: config.critical
        }
      );

      const duration = (Date.now() - startTime) / 1000;
      track.success({ duration });
      
      this.notify(`${agentName} completed successfully (${duration.toFixed(1)}s)`);
      
    } catch (error) {
      const duration = (Date.now() - startTime) / 1000;
      track.failure(error, { duration });
      
      this.notify(`⚠️ ${agentName} failed: ${error.message}`, true);
      throw error;
    }
  }

  /**
   * Run a script with timeout
   */
  runScript(script, args, timeout) {
    const isShell = script.endsWith('.sh');
    const cmd = isShell 
      ? `bash "${script}" ${args.join(' ')}`
      : `node "${script}" ${args.join(' ')}`;
    
    return execSync(cmd, { 
      timeout,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe']
    });
  }

  /**
   * Fallback generators for degraded operation
   */
  generateMinimalResearch() {
    const outputDir = `${WORKSPACE}/agents-output/research`;
    fs.mkdirSync(outputDir, { recursive: true });
    
    const data = {
      date: new Date().toISOString(),
      topics: [
        { title: 'AI Development', growth: '+200%', category: 'Tech' },
        { title: 'Remote Work', growth: '+150%', category: 'Career' }
      ],
      note: 'Minimal research (fallback mode)'
    };
    
    fs.writeFileSync(
      `${outputDir}/trends-${new Date().toISOString().split('T')[0]}.json`,
      JSON.stringify(data, null, 2)
    );
    
    return 'Minimal research generated';
  }

  generateMinimalJobs() {
    const outputDir = `${WORKSPACE}/agents-output/jobs`;
    fs.mkdirSync(outputDir, { recursive: true });
    
    const data = {
      date: new Date().toISOString(),
      jobs: [],
      note: 'No new jobs found (fallback mode)'
    };
    
    fs.writeFileSync(
      `${outputDir}/jobs-${new Date().toISOString().split('T')[0]}.json`,
      JSON.stringify(data, null, 2)
    );
    
    return 'Minimal jobs list generated';
  }

  generateMinimalCoaching() {
    const outputDir = `${WORKSPACE}/agents-output/coaching`;
    fs.mkdirSync(outputDir, { recursive: true });
    
    const content = `# Coaching Session - ${new Date().toISOString().split('T')[0]}

## Focus: Persistence

Remember: Every expert was once a beginner. Your consistency will compound.

**Action:** Take one small step today toward your biggest goal.

_(Fallback mode - full coaching unavailable)_
`;
    
    fs.writeFileSync(
      `${outputDir}/coaching-${new Date().toISOString().split('T')[0]}.md`,
      content
    );
    
    return 'Minimal coaching generated';
  }

  generateMinimalSocial() {
    const outputDir = `${WORKSPACE}/agents-output/social`;
    fs.mkdirSync(outputDir, { recursive: true });
    
    const tweets = [
      'Building in public. Learning in private. Growing every day. #NeuralNexus',
      'AI agents aren\'t the future. They\'re the present. Are you using them? #AI'
    ];
    
    fs.writeFileSync(
      `${outputDir}/tweets-${new Date().toISOString().split('T')[0]}.md`,
      tweets.join('\n\n')
    );
    
    return 'Minimal social content generated';
  }

  /**
   * Send notification
   */
  notify(message, isError = false) {
    try {
      const prefix = isError ? '🚨' : '✅';
      execSync(
        `openclaw message send --target "${TELEGRAM_GROUP}" --message "${prefix} ${message}"`,
        { timeout: 10000 }
      );
    } catch {
      // Silent fail on notification errors
    }
  }

  /**
   * Run system health check
   */
  async healthCheck() {
    return await robustness.healthCheck();
  }

  /**
   * Execute all agents in sequence with error isolation
   */
  async runAll() {
    const results = {};
    
    for (const [name, config] of Object.entries(this.agents)) {
      try {
        await this.executeAgent(name);
        results[name] = 'success';
      } catch (error) {
        results[name] = 'failed';
        // Continue with other agents even if one fails
      }
    }
    
    return results;
  }
}

// Export singleton
const orchestrator = new AgentOrchestrator();

// CLI usage
if (require.main === module) {
  const command = process.argv[2];
  const agentName = process.argv[3];
  const args = process.argv.slice(4);

  switch(command) {
    case 'run':
      if (!agentName) {
        console.error('Usage: node agent-orchestrator.js run <agent-name> [args...]');
        process.exit(1);
      }
      orchestrator.executeAgent(agentName, args)
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
      break;
      
    case 'run-all':
      orchestrator.runAll()
        .then(results => {
          console.log(JSON.stringify(results, null, 2));
          process.exit(0);
        });
      break;
      
    case 'health':
      orchestrator.healthCheck()
        .then(result => {
          console.log(JSON.stringify(result, null, 2));
          process.exit(result.healthy ? 0 : 1);
        });
      break;
      
    default:
      console.log('Usage: node agent-orchestrator.js [run|run-all|health] [agent-name]');
  }
}

module.exports = orchestrator;
