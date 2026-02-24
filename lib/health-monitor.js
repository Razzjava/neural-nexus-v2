#!/usr/bin/env node
// Agent Health Monitor - detects and recovers from agent failures

const { EventBus, StateStore } = require('../event-bus');

class AgentHealthMonitor {
    constructor() {
        this.bus = new EventBus('health-monitor');
        this.store = new StateStore();
        this.name = 'HealthMonitor';
        
        // Health thresholds
        this.thresholds = {
            heartbeatStale: 30000,      // 30 seconds
            memoryHigh: 500,             // 500 MB
            cpuHigh: 90,                 // 90%
            taskStuck: 30 * 60 * 1000,   // 30 minutes
            errorRate: 0.1               // 10% error rate
        };
        
        this.checkInterval = 10000; // 10 seconds
    }

    log(msg) {
        console.log(`[${this.name}] ${msg}`);
    }

    start() {
        this.log('Health monitor starting...');
        this.monitorLoop();
    }

    monitorLoop() {
        this.checkAllAgents();
        setTimeout(() => this.monitorLoop(), this.checkInterval);
    }

    async checkAllAgents() {
        const agents = await this.getAllAgents();
        
        for (const agent of agents) {
            const health = this.checkAgent(agent);
            
            if (!health.healthy) {
                this.log(`⚠️ Agent ${agent.id} unhealthy: ${health.issues.join(', ')}`);
                await this.handleUnhealthyAgent(agent, health);
            }
        }
    }

    checkAgent(agent) {
        const now = Date.now();
        const issues = [];
        
        // Check 1: Heartbeat stale
        const timeSinceHeartbeat = now - new Date(agent.last_heartbeat).getTime();
        if (timeSinceHeartbeat > this.thresholds.heartbeatStale) {
            issues.push(`Stale heartbeat (${Math.round(timeSinceHeartbeat/1000)}s)`);
        }
        
        // Check 2: High memory
        if (agent.memory_mb > this.thresholds.memoryHigh) {
            issues.push(`High memory (${Math.round(agent.memory_mb)}MB)`);
        }
        
        // Check 3: High CPU
        if (agent.cpu_percent > this.thresholds.cpuHigh) {
            issues.push(`High CPU (${Math.round(agent.cpu_percent)}%)`);
        }
        
        // Check 4: Stuck task
        if (agent.current_task && agent.task_start_time) {
            const taskDuration = now - new Date(agent.task_start_time).getTime();
            if (taskDuration > this.thresholds.taskStuck) {
                issues.push(`Stuck task (${Math.round(taskDuration/60000)}min)`);
            }
        }
        
        // Check 5: High error rate
        const recentErrors = this.getRecentErrors(agent.id, 60); // Last hour
        if (recentErrors > this.thresholds.errorRate * 100) {
            issues.push(`High error rate (${recentErrors}%)`);
        }
        
        return {
            healthy: issues.length === 0,
            issues,
            agent: agent.id
        };
    }

    async handleUnhealthyAgent(agent, health) {
        // Publish alert
        this.bus.publish('AGENT_UNHEALTHY', {
            agentId: agent.id,
            issues: health.issues,
            timestamp: new Date().toISOString()
        });
        
        // Determine recovery action
        const action = this.determineRecoveryAction(health.issues);
        
        switch(action) {
            case 'restart':
                await this.restartAgent(agent);
                break;
            case 'kill_task':
                await this.killStuckTask(agent);
                break;
            case 'escalate':
                await this.escalateToHuman(agent, health);
                break;
            default:
                this.log(`No automatic recovery for ${agent.id}`);
        }
    }

    determineRecoveryAction(issues) {
        if (issues.some(i => i.includes('Stuck task'))) {
            return 'kill_task';
        }
        if (issues.some(i => i.includes('Stale heartbeat'))) {
            return 'restart';
        }
        if (issues.length >= 2) {
            return 'restart';
        }
        return 'escalate';
    }

    async restartAgent(agent) {
        this.log(`🔄 Restarting agent ${agent.id}...`);
        
        this.bus.publish('AGENT_RESTART_REQUESTED', {
            agentId: agent.id,
            reason: 'health_check',
            timestamp: new Date().toISOString()
        });
        
        // In production, this would actually restart the process
        // For now, update status
        await this.store.update('agents', agents => 
            agents.map(a => a.id === agent.id 
                ? { ...a, status: 'restarting', restart_count: (a.restart_count || 0) + 1 }
                : a
            )
        );
    }

    async killStuckTask(agent) {
        this.log(`💀 Killing stuck task for ${agent.id}`);
        
        this.bus.publish('TASK_KILLED', {
            agentId: agent.id,
            task: agent.current_task,
            reason: 'stuck',
            timestamp: new Date().toISOString()
        });
        
        // Clear the task
        await this.store.update('agents', agents => 
            agents.map(a => a.id === agent.id 
                ? { ...a, current_task: null, task_start_time: null, status: 'idle' }
                : a
            )
        );
    }

    async escalateToHuman(agent, health) {
        this.log(`🚨 Escalating ${agent.id} to human`);
        
        this.bus.publish('HUMAN_ESCALATION', {
            severity: 'critical',
            agentId: agent.id,
            issues: health.issues,
            message: `Agent ${agent.id} requires human intervention`,
            timestamp: new Date().toISOString()
        });
    }

    async getAllAgents() {
        // Query from database or state store
        return this.store.get('agents') || [];
    }

    getRecentErrors(agentId, minutes) {
        // Query error rate from telemetry
        const telemetry = this.store.get(`telemetry:${agentId}`) || [];
        const cutoff = Date.now() - (minutes * 60 * 1000);
        const recent = telemetry.filter(t => t.timestamp > cutoff);
        
        if (recent.length === 0) return 0;
        
        const errors = recent.filter(t => t.error_count > 0).length;
        return (errors / recent.length) * 100;
    }

    // API for agents to report their health
    reportHeartbeat(agentId, data) {
        this.store.update('agents', agents => {
            const idx = agents.findIndex(a => a.id === agentId);
            if (idx >= 0) {
                agents[idx] = {
                    ...agents[idx],
                    last_heartbeat: new Date().toISOString(),
                    memory_mb: data.memory,
                    cpu_percent: data.cpu,
                    current_task: data.task || agents[idx].current_task,
                    status: data.status || agents[idx].status
                };
            }
            return agents;
        });
    }
}

module.exports = { AgentHealthMonitor };
