#!/usr/bin/env node
// Backend Developer Agent — implements API and database

const { EventBus, StateStore } = require('../event-bus');
const fs = require('fs');
const path = require('path');

class BackendDeveloperAgent {
    constructor() {
        this.bus = new EventBus('backend-dev-agent');
        this.store = new StateStore();
        this.name = 'BackendDeveloper';
        this.srcDir = path.join(__dirname, '..', 'mission-control', 'src');
        this.serverFile = path.join(this.srcDir, 'server.js');
        
        if (!fs.existsSync(this.srcDir)) {
            fs.mkdirSync(this.srcDir, { recursive: true });
        }
    }

    log(msg) {
        console.log(`[${this.name}] ${msg}`);
    }

    start() {
        this.log('Backend Dev Agent starting...');
        
        // Subscribe to architecture and tasks
        this.bus.subscribe('ARCHITECTURE_DEFINED', (payload) => {
            this.log('Architecture received — starting backend development');
            this.createAgentModel();
            setTimeout(() => this.createHeartbeatEndpoint(), 2000);
        });
        
        this.bus.subscribe('TASK_ASSIGNED', (payload) => {
            if (payload.assignee === 'backend-dev-agent') {
                this.handleTask(payload);
            }
        });

        this.pollLoop();
    }

    pollLoop() {
        this.bus.poll();
        setTimeout(() => this.pollLoop(), 5000);
    }

    handleTask(task) {
        this.log(`Working on task: ${task.taskId} - ${task.title}`);

        switch(task.taskId) {
            case 'MC-3':
                this.createAgentModel();
                break;
            case 'MC-4':
                this.createHeartbeatEndpoint();
                break;
            default:
                this.log(`Task ${task.taskId} not implemented yet`);
        }
    }

    createAgentModel() {
        this.log('Creating Agent model...');

        const modelCode = `const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'data', 'mission-control.db');

class AgentModel {
    constructor() {
        this.db = new sqlite3.Database(DB_PATH);
        this.init();
    }

    init() {
        this.db.exec(\`
            CREATE TABLE IF NOT EXISTS agent (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                role TEXT,
                team TEXT,
                status TEXT DEFAULT 'idle',
                last_heartbeat DATETIME,
                current_task TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS telemetry (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                agent_id TEXT,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                cpu_percent REAL,
                memory_mb REAL,
                events_processed INTEGER,
                error_count INTEGER
            );

            CREATE TABLE IF NOT EXISTS alert (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                severity TEXT,
                message TEXT,
                agent_id TEXT,
                acknowledged BOOLEAN DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
        \`);
    }

    // Agent CRUD
    create(agent) {
        return new Promise((resolve, reject) => {
            const { id, name, role, team, status, current_task } = agent;
            this.db.run(
                'INSERT INTO agent (id, name, role, team, status, current_task) VALUES (?, ?, ?, ?, ?, ?)',
                [id, name, role, team, status, current_task],
                function(err) {
                    if (err) reject(err);
                    else resolve({ id });
                }
            );
        });
    }

    findAll() {
        return new Promise((resolve, reject) => {
            this.db.all('SELECT * FROM agent ORDER BY name', (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    }

    findById(id) {
        return new Promise((resolve, reject) => {
            this.db.get('SELECT * FROM agent WHERE id = ?', [id], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
    }

    updateStatus(id, status, task = null) {
        return new Promise((resolve, reject) => {
            this.db.run(
                'UPDATE agent SET status = ?, current_task = ?, last_heartbeat = datetime("now") WHERE id = ?',
                [status, task, id],
                function(err) {
                    if (err) reject(err);
                    else resolve({ changes: this.changes });
                }
            );
        });
    }

    // Telemetry
    recordTelemetry(agentId, data) {
        return new Promise((resolve, reject) => {
            const { cpu, memory, events, errors } = data;
            this.db.run(
                'INSERT INTO telemetry (agent_id, cpu_percent, memory_mb, events_processed, error_count) VALUES (?, ?, ?, ?, ?)',
                [agentId, cpu, memory, events, errors],
                function(err) {
                    if (err) reject(err);
                    else resolve({ id: this.lastID });
                }
            );
        });
    }

    getTelemetry(agentId, hours = 24) {
        return new Promise((resolve, reject) => {
            this.db.all(
                'SELECT * FROM telemetry WHERE agent_id = ? AND timestamp > datetime("now", "-? hours") ORDER BY timestamp',
                [agentId, hours],
                (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows);
                }
            );
        });
    }

    // Alerts
    createAlert(severity, message, agentId) {
        return new Promise((resolve, reject) => {
            this.db.run(
                'INSERT INTO alert (severity, message, agent_id) VALUES (?, ?, ?)',
                [severity, message, agentId],
                function(err) {
                    if (err) reject(err);
                    else resolve({ id: this.lastID });
                }
            );
        });
    }

    getAlerts(acknowledged = false) {
        return new Promise((resolve, reject) => {
            this.db.all(
                'SELECT * FROM alert WHERE acknowledged = ? ORDER BY created_at DESC',
                [acknowledged],
                (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows);
                }
            );
        });
    }

    acknowledgeAlert(id) {
        return new Promise((resolve, reject) => {
            this.db.run('UPDATE alert SET acknowledged = 1 WHERE id = ?', [id], function(err) {
                if (err) reject(err);
                else resolve({ changes: this.changes });
            });
        });
    }
}

module.exports = { AgentModel };
`;

        fs.writeFileSync(path.join(this.srcDir, 'agent-model.js'), modelCode);
        this.log('Agent model created');

        // Complete task
        this.bus.publish('TASK_COMPLETED', {
            taskId: 'MC-3',
            file: 'src/agent-model.js'
        });
    }

    createHeartbeatEndpoint() {
        this.log('Creating heartbeat endpoint...');

        const serverCode = `const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { AgentModel } = require('./agent-model');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

const model = new AgentModel();

// Middleware
app.use(express.json());
app.use(express.static('public'));

// API Routes

// Get all agents
app.get('/api/agents', async (req, res) => {
    try {
        const agents = await model.findAll();
        res.json(agents);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get single agent
app.get('/api/agents/:id', async (req, res) => {
    try {
        const agent = await model.findById(req.params.id);
        if (!agent) return res.status(404).json({ error: 'Not found' });
        res.json(agent);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Heartbeat endpoint
app.post('/api/agents/:id/heartbeat', async (req, res) => {
    try {
        const { status, task, telemetry } = req.body;
        await model.updateStatus(req.params.id, status, task);
        
        if (telemetry) {
            await model.recordTelemetry(req.params.id, telemetry);
        }
        
        // Broadcast update
        io.emit('agent:update', { id: req.params.id, status, task });
        
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Pause agent
app.post('/api/agents/:id/pause', async (req, res) => {
    try {
        await model.updateStatus(req.params.id, 'paused');
        io.emit('agent:update', { id: req.params.id, status: 'paused' });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Resume agent
app.post('/api/agents/:id/resume', async (req, res) => {
    try {
        await model.updateStatus(req.params.id, 'idle');
        io.emit('agent:update', { id: req.params.id, status: 'idle' });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get telemetry
app.get('/api/agents/:id/telemetry', async (req, res) => {
    try {
        const hours = parseInt(req.query.hours) || 24;
        const data = await model.getTelemetry(req.params.id, hours);
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get alerts
app.get('/api/alerts', async (req, res) => {
    try {
        const alerts = await model.getAlerts(false);
        res.json(alerts);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Acknowledge alert
app.post('/api/alerts/:id/ack', async (req, res) => {
    try {
        await model.acknowledgeAlert(req.params.id);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// WebSocket connection
io.on('connection', (socket) => {
    console.log('Dashboard connected');
    
    socket.on('disconnect', () => {
        console.log('Dashboard disconnected');
    });
});

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 3456;
server.listen(PORT, () => {
    console.log(\`Mission Control API running on port \${PORT}\`);
});

module.exports = { app, server, io };
`;

        fs.writeFileSync(this.serverFile, serverCode);
        this.log('Server with heartbeat endpoint created');

        // Complete task
        this.bus.publish('TASK_COMPLETED', {
            taskId: 'MC-4',
            file: 'src/server.js'
        });
    }
}

module.exports = { BackendDeveloperAgent };
