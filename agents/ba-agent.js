#!/usr/bin/env node
// Business Analyst Agent — defines requirements and user stories

const { EventBus, StateStore } = require('../event-bus');
const fs = require('fs');
const path = require('path');

class BusinessAnalystAgent {
    constructor() {
        this.bus = new EventBus('ba-agent');
        this.store = new StateStore();
        this.name = 'BusinessAnalyst';
        this.docsDir = path.join(__dirname, '..', 'mission-control', 'docs');
        
        if (!fs.existsSync(this.docsDir)) {
            fs.mkdirSync(this.docsDir, { recursive: true });
        }
    }

    log(msg) {
        console.log(`[${this.name}] ${msg}`);
    }

    start() {
        this.log('BA Agent starting...');
        
        // Gather requirements from stakeholders
        this.gatherRequirements();
        
        // Subscribe to clarification requests
        this.bus.subscribe('REQUIREMENT_CLARIFICATION', (payload) => {
            this.handleClarification(payload);
        });

        this.pollLoop();
    }

    pollLoop() {
        this.bus.poll();
        setTimeout(() => this.pollLoop(), 5000);
    }

    // Interview other agents to understand their needs
    async gatherRequirements() {
        this.log('Gathering requirements from stakeholders...');

        // Define requirements based on agent team needs
        const requirements = {
            project: 'Mission Control System',
            version: '1.0.0',
            date: new Date().toISOString(),
            stakeholders: [
                { name: 'Research Team', needs: ['Monitor agent health', 'View topic discovery rate'] },
                { name: 'Content Team', needs: ['Track video pipeline status', 'See render queue'] },
                { name: 'Human Operator', needs: ['Override agents', 'Get alerts', 'View all projects'] }
            ],
            functionalRequirements: [
                {
                    id: 'FR-1',
                    title: 'Real-time Agent Monitoring',
                    description: 'Display all agents with live status, heartbeat, and current task',
                    priority: 'must',
                    acceptanceCriteria: [
                        'Shows agent name, role, team',
                        'Shows status: idle/working/error/offline',
                        'Updates every 5 seconds',
                        'Color-coded status indicators'
                    ]
                },
                {
                    id: 'FR-2',
                    title: 'Telemetry Dashboard',
                    description: 'Display metrics: CPU, memory, events processed, errors',
                    priority: 'must',
                    acceptanceCriteria: [
                        'Line charts for CPU/memory over time',
                        'Counter for events processed',
                        'Error rate display',
                        'Historical data (24h)'
                    ]
                },
                {
                    id: 'FR-3',
                    title: 'Alert System',
                    description: 'Notify when agents fail, tasks block, or thresholds breach',
                    priority: 'must',
                    acceptanceCriteria: [
                        'Alert on missed heartbeat (>30s)',
                        'Alert on task failure',
                        'Alert on high error rate',
                        'Human escalation for critical issues'
                    ]
                },
                {
                    id: 'FR-4',
                    title: 'Task Tracking',
                    description: 'View all tasks, their status, assignee, and progress',
                    priority: 'should',
                    acceptanceCriteria: [
                        'Kanban board view',
                        'Filter by status/assignee',
                        'Show story points',
                        'Sprint burndown chart'
                    ]
                },
                {
                    id: 'FR-5',
                    title: 'Project Overview',
                    description: 'High-level view of all projects and their health',
                    priority: 'should',
                    acceptanceCriteria: [
                        'List all active projects',
                        'Show completion percentage',
                        'Show team members',
                        'Milestone tracking'
                    ]
                },
                {
                    id: 'FR-6',
                    title: 'Log Streaming',
                    description: 'Real-time log output from all agents',
                    priority: 'could',
                    acceptanceCriteria: [
                        'Live tail of agent logs',
                        'Filter by agent/severity',
                        'Search functionality',
                        'Export logs'
                    ]
                },
                {
                    id: 'FR-7',
                    title: 'Human Control',
                    description: 'Allow human to pause, resume, or restart agents',
                    priority: 'must',
                    acceptanceCriteria: [
                        'Pause/resume button per agent',
                        'Restart agent button',
                        'Emergency stop all',
                        'Confirm dangerous actions'
                    ]
                }
            ],
            nonFunctionalRequirements: [
                { id: 'NFR-1', title: 'Performance', description: 'Dashboard loads in <2s', priority: 'must' },
                { id: 'NFR-2', title: 'Availability', description: '99% uptime', priority: 'must' },
                { id: 'NFR-3', title: 'Security', description: 'Local access only', priority: 'must' }
            ],
            kpis: [
                { name: 'Agent Uptime', target: '99%', measurement: 'heartbeat success rate' },
                { name: 'Task Completion', target: '80%', measurement: 'stories completed per sprint' },
                { name: 'Alert Response', target: '<5min', measurement: 'time to acknowledge' }
            ]
        };

        // Save requirements document
        const reqFile = path.join(this.docsDir, 'requirements-v1.md');
        fs.writeFileSync(reqFile, this.formatRequirements(requirements));
        
        this.log(`Requirements documented: ${reqFile}`);

        // Publish event
        this.bus.publish('REQUIREMENTS_DEFINED', {
            version: requirements.version,
            functionalCount: requirements.functionalRequirements.length,
            file: reqFile
        });

        return requirements;
    }

    formatRequirements(req) {
        let md = `# ${req.project} - Requirements v${req.version}\n\n`;
        md += `**Date:** ${req.date}\n\n`;
        
        md += `## Stakeholders\n\n`;
        req.stakeholders.forEach(s => {
            md += `### ${s.name}\n`;
            md += `Needs: ${s.needs.join(', ')}\n\n`;
        });

        md += `## Functional Requirements\n\n`;
        req.functionalRequirements.forEach(fr => {
            md += `### ${fr.id}: ${fr.title} (${fr.priority})\n\n`;
            md += `${fr.description}\n\n`;
            md += `**Acceptance Criteria:**\n`;
            fr.acceptanceCriteria.forEach(ac => md += `- [ ] ${ac}\n`);
            md += `\n`;
        });

        md += `## Non-Functional Requirements\n\n`;
        req.nonFunctionalRequirements.forEach(nfr => {
            md += `- **${nfr.id}:** ${nfr.title} - ${nfr.description} (${nfr.priority})\n`;
        });
        md += `\n`;

        md += `## KPIs\n\n`;
        req.kpis.forEach(kpi => {
            md += `- **${kpi.name}:** Target ${kpi.target} (${kpi.measurement})\n`;
        });

        return md;
    }

    handleClarification(payload) {
        this.log(`Clarification requested for: ${payload.requirementId}`);
        
        // Provide clarification
        this.bus.publish('REQUIREMENT_CLARIFIED', {
            requirementId: payload.requirementId,
            clarification: 'See updated documentation',
            timestamp: new Date().toISOString()
        });
    }

    // Create user stories from requirements
    createUserStories() {
        const stories = [
            { id: 'US-1', role: 'Operator', want: 'see all agents', soThat: 'I know system health' },
            { id: 'US-2', role: 'Operator', want: 'receive alerts', soThat: 'I can respond to issues' },
            { id: 'US-3', role: 'Operator', want: 'pause an agent', soThat: 'I can investigate problems' },
            { id: 'US-4', role: 'PM', want: 'view task board', soThat: 'I can track sprint progress' },
            { id: 'US-5', role: 'Developer', want: 'see agent logs', soThat: 'I can debug issues' }
        ];

        const storiesFile = path.join(this.docsDir, 'user-stories.md');
        let md = '# User Stories\n\n';
        stories.forEach(s => {
            md += `## ${s.id}\n`;
            md += `**As a** ${s.role}\n`;
            md += `**I want** ${s.want}\n`;
            md += `**So that** ${s.soThat}\n\n`;
        });

        fs.writeFileSync(storiesFile, md);
        this.log(`User stories created: ${storiesFile}`);
    }
}

module.exports = { BusinessAnalystAgent };
