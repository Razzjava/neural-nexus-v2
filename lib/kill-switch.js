#!/usr/bin/env node
// Kill Switch - Emergency stop for the entire system

const { EventBus, StateStore } = require('../event-bus');

class KillSwitch {
    constructor() {
        this.bus = new EventBus('kill-switch');
        this.store = new StateStore();
        this.active = false;
        this.reason = null;
        this.activatedAt = null;
        this.activatedBy = null;
    }

    log(msg) {
        console.log(`[KillSwitch] ${msg}`);
    }

    // Activate the kill switch
    activate(reason, triggeredBy = 'system') {
        if (this.active) {
            this.log('Kill switch already active');
            return;
        }

        this.active = true;
        this.reason = reason;
        this.activatedBy = triggeredBy;
        this.activatedAt = new Date().toISOString();

        this.log(`🚨 KILL SWITCH ACTIVATED by ${triggeredBy}: ${reason}`);

        // Persist state
        this.store.set('kill_switch', {
            active: true,
            reason,
            activatedBy,
            activatedAt: this.activatedAt
        });

        // Notify all agents
        this.bus.publish('KILL_SWITCH_ACTIVATED', {
            reason,
            activatedBy,
            activatedAt: this.activatedAt,
            timestamp: Date.now()
        });

        // Take immediate actions
        this.pauseAllPipelines();
        this.alertHuman(reason, triggeredBy);
        
        return {
            success: true,
            timestamp: this.activatedAt
        };
    }

    // Deactivate the kill switch
    deactivate(deactivatedBy = 'human') {
        if (!this.active) {
            this.log('Kill switch not active');
            return;
        }

        this.log(`✅ Kill switch deactivated by ${deactivatedBy}`);

        this.active = false;
        this.reason = null;
        this.activatedBy = null;
        this.activatedAt = null;

        this.store.set('kill_switch', {
            active: false,
            deactivatedBy,
            deactivatedAt: new Date().toISOString()
        });

        this.bus.publish('KILL_SWITCH_DEACTIVATED', {
            deactivatedBy,
            timestamp: Date.now()
        });

        return { success: true };
    }

    // Check if kill switch is active
    check() {
        if (this.active) {
            throw new KillSwitchError(
                `System halted: ${this.reason}`,
                this.activatedAt,
                this.activatedBy
            );
        }
    }

    // Silent check (returns boolean)
    isActive() {
        return this.active;
    }

    // Pause all pipelines
    pauseAllPipelines() {
        this.log('Pausing all pipelines...');
        
        this.bus.publish('PAUSE_ALL_PIPELINES', {
            reason: this.reason,
            timestamp: Date.now()
        });
    }

    // Alert human operators
    alertHuman(reason, triggeredBy) {
        const message = `🚨 NEURAL NEXUS HALTED\n\n` +
            `Reason: ${reason}\n` +
            `Triggered by: ${triggeredBy}\n` +
            `Time: ${new Date().toISOString()}\n\n` +
            `To resume: Run 'neural-nexus resume'`;

        // Send to Telegram
        this.bus.publish('SEND_ALERT', {
            severity: 'critical',
            channel: 'telegram',
            message
        });

        // Log to file
        this.log(`ALERT: ${message}`);
    }

    // Auto-activation conditions
    checkAutoActivation(metrics) {
        const conditions = [
            { check: () => metrics.costPerHour > 50, reason: 'Cost spike >$50/hour' },
            { check: () => metrics.errorRate > 0.5, reason: 'Error rate >50%' },
            { check: () => metrics.activeAgents === 0, reason: 'All agents down' },
            { check: () => metrics.memoryUsage > 95, reason: 'System memory critical' }
        ];

        for (const condition of conditions) {
            if (condition.check()) {
                this.activate(condition.reason, 'auto');
                return true;
            }
        }
        return false;
    }

    // Get current status
    getStatus() {
        return {
            active: this.active,
            reason: this.reason,
            activatedBy: this.activatedBy,
            activatedAt: this.activatedAt
        };
    }
}

class KillSwitchError extends Error {
    constructor(message, activatedAt, activatedBy) {
        super(message);
        this.name = 'KillSwitchError';
        this.activatedAt = activatedAt;
        this.activatedBy = activatedBy;
    }
}

// Singleton instance
const killSwitch = new KillSwitch();

module.exports = { KillSwitch, KillSwitchError, killSwitch };
