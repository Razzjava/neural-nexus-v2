#!/usr/bin/env node
// Neural Nexus Daemon — runs all agents continuously

const { ResearchAgent } = require('./research-agent');
const { ScriptAgent } = require('./script-agent');
const { OrchestratorAgent } = require('./orchestrator-agent');

class NeuralNexusDaemon {
    constructor() {
        this.agents = new Map();
        this.running = false;
    }

    log(msg) {
        console.log(`[NexusDaemon] ${msg}`);
    }

    async start() {
        this.running = true;
        this.log('╔══════════════════════════════════════╗');
        this.log('║     Neural Nexus Daemon Starting     ║');
        this.log('╚══════════════════════════════════════╝');

        // Start Orchestrator first (coordinates everything)
        this.log('Starting Orchestrator Agent...');
        const orchestrator = new OrchestratorAgent();
        orchestrator.start();
        this.agents.set('orchestrator', orchestrator);

        // Start Script Agent (listens for research, generates scripts)
        this.log('Starting Script Agent...');
        const scriptAgent = new ScriptAgent();
        scriptAgent.start();
        this.agents.set('script', scriptAgent);

        // Start Research Agent (runs on schedule)
        this.log('Starting Research Agent...');
        const researchAgent = new ResearchAgent();
        
        // Run immediately, then every 2 hours
        researchAgent.run().catch(e => this.log(`Research error: ${e.message}`));
        
        const researchInterval = setInterval(() => {
            if (this.running) {
                researchAgent.run().catch(e => this.log(`Research error: ${e.message}`));
            }
        }, 2 * 60 * 60 * 1000); // 2 hours

        this.agents.set('research', { agent: researchAgent, interval: researchInterval });

        this.log('All agents started');
        this.log('Research runs every 2 hours');
        this.log('Press Ctrl+C to stop');

        // Health check loop
        this.healthCheckLoop();
    }

    healthCheckLoop() {
        if (!this.running) return;

        setTimeout(() => {
            const status = Array.from(this.agents.keys()).join(', ');
            this.log(`Health check: ${status}`);
            this.healthCheckLoop();
        }, 30000); // Every 30s
    }

    stop() {
        this.log('Stopping daemon...');
        this.running = false;

        // Clear research interval
        const research = this.agents.get('research');
        if (research?.interval) {
            clearInterval(research.interval);
        }

        // Stop orchestrator
        const orchestrator = this.agents.get('orchestrator');
        if (orchestrator?.stop) {
            orchestrator.stop();
        }

        this.log('Daemon stopped');
    }
}

// CLI
const daemon = new NeuralNexusDaemon();

process.on('SIGINT', () => {
    daemon.stop();
    process.exit(0);
});

process.on('SIGTERM', () => {
    daemon.stop();
    process.exit(0);
});

daemon.start().catch(e => {
    console.error('Daemon failed:', e);
    process.exit(1);
});
