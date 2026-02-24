#!/usr/bin/env node
// Project Manager Agent — coordinates development team

const { EventBus, StateStore } = require('../event-bus');
const fs = require('fs');
const path = require('path');

class ProjectManagerAgent {
    constructor() {
        this.bus = new EventBus('pm-agent');
        this.store = new StateStore();
        this.name = 'ProjectManager';
        this.projectDir = path.join(__dirname, '..', 'mission-control');
        this.sprintFile = path.join(this.projectDir, 'sprint-current.json');
    }

    log(msg) {
        console.log(`[${this.name}] ${msg}`);
    }

    start() {
        this.log('PM Agent starting...');
        
        // Subscribe to team updates
        this.bus.subscribe(['TASK_COMPLETED', 'TASK_BLOCKED', 'AGENT_STATUS'], (payload, event) => {
            this.handleTeamUpdate(event.type, payload);
        });

        // Daily standup report
        setInterval(() => this.generateStandupReport(), 24 * 60 * 60 * 1000);
        
        this.pollLoop();
    }

    pollLoop() {
        this.bus.poll();
        setTimeout(() => this.pollLoop(), 5000);
    }

    // Initialize a new sprint
    initSprint(sprintNumber, goals) {
        const sprint = {
            number: sprintNumber,
            goals: goals,
            startDate: new Date().toISOString(),
            endDate: null,
            status: 'active',
            tasks: this.createInitialTasks(),
            velocity: 0
        };

        fs.writeFileSync(this.sprintFile, JSON.stringify(sprint, null, 2));
        this.log(`Sprint ${sprintNumber} initialized with ${sprint.tasks.length} tasks`);
        
        // Assign first tasks
        this.assignTasks();
    }

    createInitialTasks() {
        return [
            { id: 'MC-1', title: 'Set up project structure', points: 3, status: 'backlog', assignee: null },
            { id: 'MC-2', title: 'Design database schema', points: 3, status: 'backlog', assignee: null },
            { id: 'MC-3', title: 'Create Agent model', points: 2, status: 'backlog', assignee: null },
            { id: 'MC-4', title: 'Build heartbeat endpoint', points: 3, status: 'backlog', assignee: null },
            { id: 'MC-5', title: 'Create dashboard layout', points: 3, status: 'backlog', assignee: null },
            { id: 'MC-6', title: 'Build agent status widget', points: 5, status: 'backlog', assignee: null },
            { id: 'MC-7', title: 'Write agent telemetry tests', points: 3, status: 'backlog', assignee: null },
            { id: 'MC-8', title: 'Deploy to systemd', points: 2, status: 'backlog', assignee: null }
        ];
    }

    // Assign tasks to available developers
    assignTasks() {
        const sprint = JSON.parse(fs.readFileSync(this.sprintFile, 'utf8'));
        const unassigned = sprint.tasks.filter(t => t.status === 'backlog' && !t.assignee);
        
        // Simple round-robin assignment
        const developers = ['architect-agent', 'backend-dev-agent', 'frontend-dev-agent', 'devops-agent'];
        let devIndex = 0;

        for (const task of unassigned.slice(0, 4)) { // Assign up to 4 tasks
            task.assignee = developers[devIndex % developers.length];
            task.status = 'in_progress';
            devIndex++;
            
            this.log(`Assigned ${task.id} to ${task.assignee}`);
            
            this.bus.publish('TASK_ASSIGNED', {
                taskId: task.id,
                title: task.title,
                assignee: task.assignee,
                points: task.points
            });
        }

        fs.writeFileSync(this.sprintFile, JSON.stringify(sprint, null, 2));
    }

    handleTeamUpdate(type, payload) {
        const sprint = JSON.parse(fs.readFileSync(this.sprintFile, 'utf8'));
        
        if (type === 'TASK_COMPLETED') {
            const task = sprint.tasks.find(t => t.id === payload.taskId);
            if (task) {
                task.status = 'done';
                task.completedAt = new Date().toISOString();
                sprint.velocity += task.points;
                this.log(`✅ Task ${task.id} completed by ${task.assignee}`);
                
                // Assign next task
                this.assignTasks();
            }
        }
        
        if (type === 'TASK_BLOCKED') {
            this.log(`🚨 BLOCKER: ${payload.taskId} - ${payload.reason}`);
            this.escalateToHuman(payload);
        }

        fs.writeFileSync(this.sprintFile, JSON.stringify(sprint, null, 2));
    }

    escalateToHuman(blocker) {
        this.bus.publish('HUMAN_ESCALATION', {
            type: 'BLOCKER',
            severity: 'high',
            message: `Task ${blocker.taskId} is blocked: ${blocker.reason}`,
            timestamp: new Date().toISOString()
        });
    }

    generateStandupReport() {
        const sprint = JSON.parse(fs.readFileSync(this.sprintFile, 'utf8'));
        const done = sprint.tasks.filter(t => t.status === 'done').length;
        const inProgress = sprint.tasks.filter(t => t.status === 'in_progress').length;
        const blocked = sprint.tasks.filter(t => t.status === 'blocked').length;
        
        const report = {
            type: 'STANDUP_REPORT',
            sprint: sprint.number,
            date: new Date().toISOString(),
            summary: {
                completed: done,
                inProgress: inProgress,
                blocked: blocked,
                velocity: sprint.velocity
            },
            tasks: sprint.tasks
        };

        this.log(`Standup: ${done} done, ${inProgress} in progress, ${blocked} blocked`);
        this.bus.publish('STANDUP_REPORT', report);
    }

    getProjectStatus() {
        if (!fs.existsSync(this.sprintFile)) return null;
        return JSON.parse(fs.readFileSync(this.sprintFile, 'utf8'));
    }
}

module.exports = { ProjectManagerAgent };
