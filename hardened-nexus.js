#!/usr/bin/env node
// Neural Nexus Hardened System - Production Ready

const { EventBus, StateStore } = require('./event-bus');
const { logger, metrics } = require('./lib/logger');
const { CircuitBreaker, breakers } = require('./lib/circuit-breaker');
const { AgentHealthMonitor } = require('./lib/health-monitor');
const { killSwitch } = require('./lib/kill-switch');
const { StateManager } = require('./lib/state-manager');
const { HumanOversight } = require('./lib/human-oversight');
const { ResearchAgent } = require('./research-agent');
const { ScriptAgent } = require('./script-agent');
const { OrchestratorAgent } = require('./orchestrator-agent');

class HardenedNeuralNexus {
    constructor() {
        this.name = 'NeuralNexus-Hardened';
        this.running = false;
        this.components = new Map();
        
        // Initialize all hardening components
        this.healthMonitor = new AgentHealthMonitor();
        this.stateManager = new StateManager();
        this.oversight = new HumanOversight();
        
        logger.info('Hardened Neural Nexus initializing...');
    }

    async start() {
        this.running = true;
        
        logger.info('╔══════════════════════════════════════════════════╗');
        logger.info('║  Neural Nexus Hardened System Starting          ║');
        logger.info('╚══════════════════════════════════════════════════╝');

        // 1. Check kill switch
        if (killSwitch.isActive()) {
            logger.error('System halted by kill switch');
            return;
        }

        // 2. Create initial state snapshot
        await this.stateManager.snapshot('startup');

        // 3. Start health monitoring
        this.healthMonitor.start();
        logger.info('✅ Health monitoring active');

        // 4. Start core agents with circuit breakers
        await this.startCoreAgents();

        // 5. Start monitoring loops
        this.startMonitoringLoops();

        // 6. Schedule regular snapshots
        setInterval(() => {
            this.stateManager.snapshot('scheduled');
        }, 3600000); // Every hour

        logger.info('✅ All systems operational');
        
        // Record startup metric
        metrics.increment('system_startups');
    }

    async startCoreAgents() {
        // Research Agent with circuit breaker
        const researchAgent = new ResearchAgent();
        researchAgent.fetchHackerNews = this.wrapWithBreaker(
            researchAgent.fetchHackerNews.bind(researchAgent),
            breakers.hackernews
        );
        researchAgent.start();
        this.components.set('research', researchAgent);
        logger.info('✅ Research agent started (with circuit breaker)');

        // Script Agent
        const scriptAgent = new ScriptAgent();
        scriptAgent.start();
        this.components.set('script', scriptAgent);
        logger.info('✅ Script agent started');

        // Orchestrator with oversight
        const orchestrator = new OrchestratorAgent();
        const originalTrigger = orchestrator.triggerPipeline.bind(orchestrator);
        orchestrator.triggerPipeline = async (topic) => {
            // Check budget
            await this.oversight.trackCost(0.5, `Pipeline for ${topic.title}`);
            
            // Request approval if needed
            if (this.oversight.requiresApproval({ 
                type: 'TRIGGER_PIPELINE', 
                cost: 0.5,
                details: topic 
            })) {
                await this.oversight.requestApproval({
                    type: 'TRIGGER_PIPELINE',
                    cost: 0.5,
                    details: topic
                });
            }
            
            return originalTrigger(topic);
        };
        orchestrator.start();
        this.components.set('orchestrator', orchestrator);
        logger.info('✅ Orchestrator started (with oversight)');
    }

    wrapWithBreaker(fn, breaker) {
        return async (...args) => {
            return breaker.execute(() => fn(...args));
        };
    }

    startMonitoringLoops() {
        // System metrics collection
        setInterval(() => {
            this.collectSystemMetrics();
        }, 30000);

        // Circuit breaker status
        setInterval(() => {
            this.reportCircuitStatus();
        }, 60000);

        // Budget status
        setInterval(() => {
            const budget = this.oversight.getBudgetStatus();
            logger.info('Budget status', budget);
        }, 300000);
    }

    collectSystemMetrics() {
        const memUsage = process.memoryUsage();
        
        metrics.gauge('memory_heap_used', memUsage.heapUsed / 1024 / 1024);
        metrics.gauge('memory_heap_total', memUsage.heapTotal / 1024 / 1024);
        metrics.gauge('memory_rss', memUsage.rss / 1024 / 1024);
        
        // Check for kill switch conditions
        if (memUsage.heapUsed > 1024 * 1024 * 1024) { // 1GB
            logger.error('Memory limit approaching - activating kill switch');
            killSwitch.activate('Memory limit critical', 'system-monitor');
        }
    }

    reportCircuitStatus() {
        for (const [name, breaker] of Object.entries(breakers)) {
            const state = breaker.getState();
            if (state.state !== 'CLOSED') {
                logger.warn(`Circuit breaker ${name} is ${state.state}`, {
                    failures: state.failures
                });
            }
            
            metrics.gauge('circuit_breaker_state', 
                state.state === 'CLOSED' ? 0 : state.state === 'HALF_OPEN' ? 1 : 2,
                { service: name }
            );
        }
    }

    async stop() {
        logger.info('Shutting down...');
        this.running = false;
        
        // Final snapshot
        await this.stateManager.snapshot('shutdown');
        
        // Stop all components
        for (const [name, component] of this.components) {
            if (component.stop) {
                await component.stop();
                logger.info(`Stopped ${name}`);
            }
        }
        
        logger.info('Shutdown complete');
    }

    // CLI commands
    async handleCommand(cmd, args) {
        switch(cmd) {
            case 'status':
                return this.getStatus();
            case 'snapshot':
                return this.stateManager.snapshot(args[0] || 'manual');
            case 'rollback':
                return this.stateManager.rollback(args[0]);
            case 'approve':
                return this.oversight.approve(args[0], 'cli');
            case 'reject':
                return this.oversight.reject(args[0], args[1] || 'rejected via cli', 'cli');
            case 'kill':
                return killSwitch.activate(args.join(' ') || 'manual', 'cli');
            case 'resume':
                return killSwitch.deactivate('cli');
            case 'budget':
                return this.oversight.getBudgetStatus();
            default:
                return { error: 'Unknown command' };
        }
    }

    getStatus() {
        return {
            running: this.running,
            killSwitch: killSwitch.getStatus(),
            budget: this.oversight.getBudgetStatus(),
            circuitBreakers: Object.entries(breakers).map(([name, b]) => ({
                name,
                state: b.getState().state
            })),
            pendingApprovals: this.oversight.getPendingApprovals().length,
            metrics: metrics.getSummary()
        };
    }
}

// CLI entry point
if (require.main === module) {
    const nexus = new HardenedNeuralNexus();
    
    // Handle signals
    process.on('SIGINT', async () => {
        await nexus.stop();
        process.exit(0);
    });
    
    process.on('SIGTERM', async () => {
        await nexus.stop();
        process.exit(0);
    });
    
    // Check for CLI command
    const cmd = process.argv[2];
    if (cmd) {
        nexus.handleCommand(cmd, process.argv.slice(3))
            .then(result => {
                console.log(JSON.stringify(result, null, 2));
                process.exit(0);
            })
            .catch(err => {
                console.error(err);
                process.exit(1);
            });
    } else {
        nexus.start().catch(err => {
            logger.error('Startup failed', { error: err.message });
            process.exit(1);
        });
    }
}

module.exports = { HardenedNeuralNexus };
