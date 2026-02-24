#!/usr/bin/env node
// Agent Pool for scaling and load balancing

const { EventBus } = require('../event-bus');
const { logger, metrics } = require('./logger');

class AgentPool {
    constructor(agentType, options = {}) {
        this.agentType = agentType;
        this.minSize = options.minSize || 1;
        this.maxSize = options.maxSize || 5;
        this.idleTimeout = options.idleTimeout || 300000; // 5 minutes
        
        this.pool = [];
        this.active = new Map();
        this.waiting = [];
        this.totalCreated = 0;
        this.totalDestroyed = 0;
        
        this.bus = new EventBus(`${agentType}-pool`);
        
        // Ensure minimum pool size
        this.initialize();
        
        // Cleanup idle agents
        setInterval(() => this.cleanup(), 60000);
    }

    async initialize() {
        logger.info(`Initializing ${this.agentType} pool`, { 
            minSize: this.minSize,
            maxSize: this.maxSize 
        });
        
        for (let i = 0; i < this.minSize; i++) {
            await this.createAgent();
        }
    }

    async createAgent() {
        if (this.pool.length + this.active.size >= this.maxSize) {
            return null;
        }

        const agent = {
            id: `${this.agentType}_${Date.now()}_${this.totalCreated}`,
            type: this.agentType,
            createdAt: Date.now(),
            lastUsed: Date.now(),
            status: 'idle'
        };

        // Initialize agent
        try {
            agent.instance = await this.initializeAgent(agent);
            this.pool.push(agent);
            this.totalCreated++;
            
            metrics.gauge('agent_pool_size', this.pool.length, { 
                type: this.agentType 
            });
            
            logger.debug('Agent created', { agentId: agent.id });
            return agent;
        } catch (err) {
            logger.error('Failed to create agent', { 
                agentId: agent.id, 
                error: err.message 
            });
            return null;
        }
    }

    async initializeAgent(agent) {
        // Override in subclass
        return { id: agent.id };
    }

    async acquire(timeout = 30000) {
        const startTime = Date.now();
        
        // Try to get from pool
        if (this.pool.length > 0) {
            const agent = this.pool.pop();
            agent.status = 'active';
            agent.lastUsed = Date.now();
            this.active.set(agent.id, agent);
            
            metrics.gauge('agent_pool_available', this.pool.length, { 
                type: this.agentType 
            });
            metrics.gauge('agent_pool_active', this.active.size, { 
                type: this.agentType 
            });
            
            return agent;
        }

        // Try to create new agent
        const newAgent = await this.createAgent();
        if (newAgent) {
            newAgent.status = 'active';
            newAgent.lastUsed = Date.now();
            this.active.set(newAgent.id, newAgent);
            return newAgent;
        }

        // Wait for agent to become available
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                const idx = this.waiting.indexOf(resolve);
                if (idx > -1) this.waiting.splice(idx, 1);
                reject(new Error('Timeout waiting for agent'));
            }, timeout);

            this.waiting.push((agent) => {
                clearTimeout(timer);
                resolve(agent);
            });
        });
    }

    release(agent) {
        if (!this.active.has(agent.id)) {
            logger.warn('Releasing unknown agent', { agentId: agent.id });
            return;
        }

        this.active.delete(agent.id);
        agent.status = 'idle';
        agent.lastUsed = Date.now();

        // Check if someone is waiting
        if (this.waiting.length > 0) {
            const next = this.waiting.shift();
            agent.status = 'active';
            this.active.set(agent.id, agent);
            next(agent);
            return;
        }

        // Return to pool
        this.pool.push(agent);
        
        metrics.gauge('agent_pool_available', this.pool.length, { 
            type: this.agentType 
        });
        metrics.gauge('agent_pool_active', this.active.size, { 
            type: this.agentType 
        });
    }

    async destroy(agent) {
        try {
            if (agent.instance?.destroy) {
                await agent.instance.destroy();
            }
            this.totalDestroyed++;
            logger.debug('Agent destroyed', { agentId: agent.id });
        } catch (err) {
            logger.error('Error destroying agent', { 
                agentId: agent.id, 
                error: err.message 
            });
        }
    }

    async cleanup() {
        const now = Date.now();
        const toRemove = [];

        // Find idle agents past timeout
        for (let i = this.pool.length - 1; i >= 0; i--) {
            const agent = this.pool[i];
            if (now - agent.lastUsed > this.idleTimeout) {
                if (this.pool.length > this.minSize) {
                    toRemove.push(...this.pool.splice(i, 1));
                }
            }
        }

        // Destroy removed agents
        for (const agent of toRemove) {
            await this.destroy(agent);
        }

        if (toRemove.length > 0) {
            logger.info('Cleaned up idle agents', { 
                count: toRemove.length,
                remaining: this.pool.length 
            });
        }
    }

    getStats() {
        return {
            type: this.agentType,
            available: this.pool.length,
            active: this.active.size,
            waiting: this.waiting.length,
            totalCreated: this.totalCreated,
            totalDestroyed: this.totalDestroyed,
            utilization: this.active.size / (this.pool.length + this.active.size)
        };
    }
}

// Render worker pool
class RenderWorkerPool extends AgentPool {
    constructor(options = {}) {
        super('render-worker', {
            minSize: 1,
            maxSize: options.maxWorkers || 3,
            ...options
        });
    }

    async initializeAgent(agent) {
        // Initialize render worker
        return {
            id: agent.id,
            render: async (script) => {
                // Actual render implementation
                return { success: true, output: 'video.mp4' };
            }
        };
    }
}

// Research worker pool
class ResearchWorkerPool extends AgentPool {
    constructor(options = {}) {
        super('research-worker', {
            minSize: 2,
            maxSize: options.maxWorkers || 5,
            ...options
        });
    }

    async initializeAgent(agent) {
        return {
            id: agent.id,
            research: async (topic) => {
                // Actual research implementation
                return { topics: [] };
            }
        };
    }
}

module.exports = { AgentPool, RenderWorkerPool, ResearchWorkerPool };
