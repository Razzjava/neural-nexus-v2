const express = require('express');
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
    console.log(`Mission Control API running on port ${PORT}`);
});

module.exports = { app, server, io };
