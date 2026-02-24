#!/usr/bin/env node
// Architect Agent — designs system architecture

const { EventBus, StateStore } = require('../event-bus');
const fs = require('fs');
const path = require('path');

class ArchitectAgent {
    constructor() {
        this.bus = new EventBus('architect-agent');
        this.store = new StateStore();
        this.name = 'Architect';
        this.designDir = path.join(__dirname, '..', 'mission-control', 'design');
        
        if (!fs.existsSync(this.designDir)) {
            fs.mkdirSync(this.designDir, { recursive: true });
        }
    }

    log(msg) {
        console.log(`[${this.name}] ${msg}`);
    }

    start() {
        this.log('Architect Agent starting...');
        
        // Subscribe to requirements
        this.bus.subscribe('REQUIREMENTS_DEFINED', (payload) => {
            this.createArchitecture(payload);
        });

        this.pollLoop();
    }

    pollLoop() {
        this.bus.poll();
        setTimeout(() => this.pollLoop(), 5000);
    }

    createArchitecture(requirements) {
        this.log('Creating system architecture...');

        const architecture = {
            project: 'Mission Control',
            version: '1.0',
            principles: [
                'Single source of truth for agent state',
                'Real-time updates via WebSocket',
                'Modular widget-based dashboard',
                'File-based storage for simplicity'
            ],
            techStack: {
                frontend: {
                    framework: 'React',
                    language: 'TypeScript',
                    charts: 'Recharts',
                    state: 'React Context',
                    styling: 'CSS Modules'
                },
                backend: {
                    runtime: 'Node.js',
                    framework: 'Express',
                    websocket: 'Socket.io',
                    database: 'SQLite',
                    api: 'REST + WebSocket'
                },
                deployment: {
                    processManager: 'systemd',
                    logs: '/var/log/mission-control.log',
                    port: 3456
                }
            },
            dataModel: this.designDataModel(),
            apiDesign: this.designAPI(),
            components: this.designComponents()
        };

        // Save architecture document
        const archFile = path.join(this.designDir, 'architecture.md');
        fs.writeFileSync(archFile, this.formatArchitecture(architecture));
        this.log(`Architecture documented: ${archFile}`);

        // Create database schema
        this.createDatabaseSchema();

        // Publish event
        this.bus.publish('ARCHITECTURE_DEFINED', {
            version: architecture.version,
            techStack: Object.keys(architecture.techStack).join(', '),
            file: archFile
        });

        // Assign first task to self
        this.bus.publish('TASK_ASSIGNED', {
            taskId: 'MC-1',
            title: 'Set up project structure',
            assignee: 'architect-agent'
        });

        return architecture;
    }

    designDataModel() {
        return {
            entities: [
                {
                    name: 'Agent',
                    fields: [
                        { name: 'id', type: 'TEXT PRIMARY KEY' },
                        { name: 'name', type: 'TEXT NOT NULL' },
                        { name: 'role', type: 'TEXT' },
                        { name: 'team', type: 'TEXT' },
                        { name: 'status', type: 'TEXT DEFAULT "idle"' },
                        { name: 'last_heartbeat', type: 'DATETIME' },
                        { name: 'current_task', type: 'TEXT' },
                        { name: 'created_at', type: 'DATETIME DEFAULT CURRENT_TIMESTAMP' }
                    ]
                },
                {
                    name: 'Task',
                    fields: [
                        { name: 'id', type: 'TEXT PRIMARY KEY' },
                        { name: 'title', type: 'TEXT NOT NULL' },
                        { name: 'description', type: 'TEXT' },
                        { name: 'assignee', type: 'TEXT' },
                        { name: 'status', type: 'TEXT DEFAULT "backlog"' },
                        { name: 'points', type: 'INTEGER' },
                        { name: 'created_at', type: 'DATETIME DEFAULT CURRENT_TIMESTAMP' },
                        { name: 'completed_at', type: 'DATETIME' }
                    ]
                },
                {
                    name: 'Telemetry',
                    fields: [
                        { name: 'id', type: 'INTEGER PRIMARY KEY AUTOINCREMENT' },
                        { name: 'agent_id', type: 'TEXT' },
                        { name: 'timestamp', type: 'DATETIME DEFAULT CURRENT_TIMESTAMP' },
                        { name: 'cpu_percent', type: 'REAL' },
                        { name: 'memory_mb', type: 'REAL' },
                        { name: 'events_processed', type: 'INTEGER' },
                        { name: 'error_count', type: 'INTEGER' }
                    ]
                },
                {
                    name: 'Alert',
                    fields: [
                        { name: 'id', type: 'INTEGER PRIMARY KEY AUTOINCREMENT' },
                        { name: 'severity', type: 'TEXT' },
                        { name: 'message', type: 'TEXT' },
                        { name: 'agent_id', type: 'TEXT' },
                        { name: 'acknowledged', type: 'BOOLEAN DEFAULT 0' },
                        { name: 'created_at', type: 'DATETIME DEFAULT CURRENT_TIMESTAMP' }
                    ]
                }
            ]
        };
    }

    designAPI() {
        return {
            endpoints: [
                { method: 'GET', path: '/api/agents', description: 'List all agents' },
                { method: 'GET', path: '/api/agents/:id', description: 'Get agent details' },
                { method: 'POST', path: '/api/agents/:id/pause', description: 'Pause agent' },
                { method: 'POST', path: '/api/agents/:id/resume', description: 'Resume agent' },
                { method: 'GET', path: '/api/tasks', description: 'List all tasks' },
                { method: 'GET', path: '/api/telemetry', description: 'Get telemetry data' },
                { method: 'GET', path: '/api/alerts', description: 'Get active alerts' },
                { method: 'POST', path: '/api/alerts/:id/ack', description: 'Acknowledge alert' }
            ],
            websocket: {
                events: ['agent:update', 'telemetry:new', 'alert:new', 'task:update']
            }
        };
    }

    designComponents() {
        return [
            { name: 'AgentMap', purpose: 'Visual map of all agents and their status' },
            { name: 'TelemetryPanel', purpose: 'Charts showing CPU, memory, events' },
            { name: 'AlertFeed', purpose: 'Real-time alert stream' },
            { name: 'TaskBoard', purpose: 'Kanban board of tasks' },
            { name: 'LogViewer', purpose: 'Streaming log display' },
            { name: 'ControlPanel', purpose: 'Buttons to control agents' }
        ];
    }

    createDatabaseSchema() {
        const schemaFile = path.join(this.designDir, 'schema.sql');
        let sql = '-- Mission Control Database Schema\n\n';
        
        const model = this.designDataModel();
        model.entities.forEach(entity => {
            sql += `CREATE TABLE IF NOT EXISTS ${entity.name.toLowerCase()} (\n`;
            entity.fields.forEach((field, idx) => {
                const comma = idx < entity.fields.length - 1 ? ',' : '';
                sql += `  ${field.name} ${field.type}${comma}\n`;
            });
            sql += ');\n\n';
        });

        fs.writeFileSync(schemaFile, sql);
        this.log(`Database schema created: ${schemaFile}`);
    }

    formatArchitecture(arch) {
        let md = `# ${arch.project} Architecture v${arch.version}\n\n`;
        
        md += `## Principles\n\n`;
        arch.principles.forEach(p => md += `- ${p}\n`);
        md += `\n`;

        md += `## Tech Stack\n\n`;
        Object.entries(arch.techStack).forEach(([layer, tech]) => {
            md += `### ${layer}\n`;
            Object.entries(tech).forEach(([k, v]) => {
                md += `- **${k}:** ${v}\n`;
            });
            md += `\n`;
        });

        return md;
    }

    // Review code for architectural compliance
    reviewCode(code, component) {
        this.log(`Reviewing ${component} for architectural compliance...`);
        
        const issues = [];
        
        // Simple checks
        if (!code.includes('WebSocket') && component === 'AgentMap') {
            issues.push('Missing WebSocket for real-time updates');
        }
        
        if (code.includes('fs.readFileSync') && !code.includes('try/catch')) {
            issues.push('File operations need error handling');
        }

        if (issues.length === 0) {
            this.log(`✅ ${component} passes architectural review`);
            return { approved: true };
        } else {
            this.log(`❌ ${component} has architectural issues`);
            return { approved: false, issues };
        }
    }
}

module.exports = { ArchitectAgent };
