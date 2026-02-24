#!/usr/bin/env node
// Human Oversight System - Approval gates and budget controls

const { EventBus, StateStore } = require('../event-bus');
const { logger } = require('./logger');

class HumanOversight {
    constructor() {
        this.bus = new EventBus('human-oversight');
        this.store = new StateStore();
        this.pendingApprovals = new Map();
        
        // Budget tracking
        this.budget = {
            daily: 50,      // $50/day
            monthly: 500,   // $500/month
            currentDay: 0,
            currentMonth: 0,
            lastReset: Date.now()
        };
        
        // Critical actions requiring approval
        this.criticalActions = [
            'DELETE_VIDEO',
            'DELETE_PROJECT',
            'MODIFY_SYSTEMD',
            'CHANGE_CONFIG',
            'DEPLOY_PRODUCTION',
            'COST_OVER_10'
        ];
        
        this.loadBudget();
    }

    log(msg) {
        logger.info(`[HumanOversight] ${msg}`);
    }

    // Check if action requires approval
    requiresApproval(action) {
        if (this.criticalActions.includes(action.type)) {
            return true;
        }
        
        if (action.cost && action.cost > 10) {
            return true;
        }
        
        return false;
    }

    // Request approval for critical action
    async requestApproval(action, timeout = 300000) {
        const approvalId = `approval_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        const request = {
            id: approvalId,
            action,
            requestedAt: Date.now(),
            timeout,
            status: 'pending'
        };
        
        this.pendingApprovals.set(approvalId, request);
        
        // Notify human
        this.notifyHuman(request);
        
        this.log(`Approval requested: ${approvalId} for ${action.type}`);
        
        // Wait for response
        return new Promise((resolve, reject) => {
            const checkInterval = setInterval(() => {
                const current = this.pendingApprovals.get(approvalId);
                
                if (!current) {
                    clearInterval(checkInterval);
                    reject(new Error('Approval request cancelled'));
                    return;
                }
                
                if (current.status === 'approved') {
                    clearInterval(checkInterval);
                    resolve({ approved: true, approvedBy: current.approvedBy });
                    return;
                }
                
                if (current.status === 'rejected') {
                    clearInterval(checkInterval);
                    reject(new Error(`Action rejected: ${current.rejectionReason}`));
                    return;
                }
                
                if (Date.now() - current.requestedAt > timeout) {
                    clearInterval(checkInterval);
                    current.status = 'timeout';
                    reject(new Error('Approval timeout'));
                }
            }, 1000);
        });
    }

    // Human approves action
    approve(approvalId, approver) {
        const request = this.pendingApprovals.get(approvalId);
        if (!request) {
            throw new Error('Approval request not found');
        }
        
        request.status = 'approved';
        request.approvedBy = approver;
        request.approvedAt = Date.now();
        
        this.log(`Action approved: ${approvalId} by ${approver}`);
        
        this.bus.publish('ACTION_APPROVED', {
            approvalId,
            action: request.action,
            approvedBy: approver
        });
        
        return request;
    }

    // Human rejects action
    reject(approvalId, reason, rejector) {
        const request = this.pendingApprovals.get(approvalId);
        if (!request) {
            throw new Error('Approval request not found');
        }
        
        request.status = 'rejected';
        request.rejectionReason = reason;
        request.rejectedBy = rejector;
        request.rejectedAt = Date.now();
        
        this.log(`Action rejected: ${approvalId} by ${rejector}: ${reason}`);
        
        this.bus.publish('ACTION_REJECTED', {
            approvalId,
            action: request.action,
            rejectedBy: rejector,
            reason
        });
        
        return request;
    }

    // Notify human of pending approval
    notifyHuman(request) {
        const message = `🚨 APPROVAL REQUIRED\n\n` +
            `Action: ${request.action.type}\n` +
            `Details: ${JSON.stringify(request.action.details)}\n` +
            `Cost: $${request.action.cost || 0}\n\n` +
            `To approve: neural-nexus approve ${request.id}\n` +
            `To reject: neural-nexus reject ${request.id} [reason]`;

        this.bus.publish('SEND_ALERT', {
            severity: 'high',
            channel: 'telegram',
            message
        });
        
        this.bus.publish('HUMAN_APPROVAL_REQUIRED', {
            approvalId: request.id,
            action: request.action
        });
    }

    // Budget tracking
    async trackCost(cost, description) {
        this.checkBudgetReset();
        
        this.budget.currentDay += cost;
        this.budget.currentMonth += cost;
        
        await this.saveBudget();
        
        logger.info('Cost tracked', { cost, description, 
            daily: this.budget.currentDay,
            monthly: this.budget.currentMonth 
        });
        
        // Check thresholds
        if (this.budget.currentDay > this.budget.daily * 0.8) {
            this.bus.publish('BUDGET_WARNING', {
                level: 'warning',
                message: `Daily budget at ${Math.round(this.budget.currentDay / this.budget.daily * 100)}%`
            });
        }
        
        if (this.budget.currentDay > this.budget.daily) {
            this.bus.publish('BUDGET_EXCEEDED', {
                level: 'critical',
                message: 'Daily budget exceeded!'
            });
            
            // Auto-activate kill switch
            const { killSwitch } = require('./kill-switch');
            killSwitch.activate('Daily budget exceeded', 'budget-control');
        }
    }

    checkBudgetReset() {
        const now = Date.now();
        const dayMs = 24 * 60 * 60 * 1000;
        const monthMs = 30 * dayMs;
        
        if (now - this.budget.lastReset > dayMs) {
            this.budget.currentDay = 0;
        }
        
        if (now - this.budget.lastReset > monthMs) {
            this.budget.currentMonth = 0;
            this.budget.lastReset = now;
        }
    }

    async loadBudget() {
        const saved = this.store.get('budget');
        if (saved) {
            this.budget = { ...this.budget, ...saved };
        }
    }

    async saveBudget() {
        this.store.set('budget', this.budget);
    }

    getBudgetStatus() {
        return {
            daily: {
                limit: this.budget.daily,
                used: this.budget.currentDay,
                remaining: this.budget.daily - this.budget.currentDay,
                percent: Math.round(this.budget.currentDay / this.budget.daily * 100)
            },
            monthly: {
                limit: this.budget.monthly,
                used: this.budget.currentMonth,
                remaining: this.budget.monthly - this.budget.currentMonth,
                percent: Math.round(this.budget.currentMonth / this.budget.monthly * 100)
            }
        };
    }

    getPendingApprovals() {
        return Array.from(this.pendingApprovals.values())
            .filter(a => a.status === 'pending');
    }
}

module.exports = { HumanOversight };
