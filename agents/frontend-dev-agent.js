#!/usr/bin/env node
// Frontend Developer Agent — builds dashboard UI

const { EventBus, StateStore } = require('../event-bus');
const fs = require('fs');
const path = require('path');

class FrontendDeveloperAgent {
    constructor() {
        this.bus = new EventBus('frontend-dev-agent');
        this.store = new StateStore();
        this.name = 'FrontendDeveloper';
        this.publicDir = path.join(__dirname, '..', 'mission-control', 'public');
        
        if (!fs.existsSync(this.publicDir)) {
            fs.mkdirSync(this.publicDir, { recursive: true });
        }
    }

    log(msg) {
        console.log(`[${this.name}] ${msg}`);
    }

    start() {
        this.log('Frontend Dev Agent starting...');
        
        this.bus.subscribe('ARCHITECTURE_DEFINED', (payload) => {
            this.log('Architecture received — starting frontend development');
            this.createDashboardLayout();
            setTimeout(() => this.createAgentStatusWidget(), 3000);
        });
        
        this.bus.subscribe('TASK_ASSIGNED', (payload) => {
            if (payload.assignee === 'frontend-dev-agent') {
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
            case 'MC-5':
                this.createDashboardLayout();
                break;
            case 'MC-6':
                this.createAgentStatusWidget();
                break;
            default:
                this.log(`Task ${task.taskId} not implemented yet`);
        }
    }

    createDashboardLayout() {
        this.log('Creating dashboard layout...');

        const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Mission Control</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #0a0a0a;
            color: #fff;
            min-height: 100vh;
        }
        .header {
            background: #111;
            padding: 1rem 2rem;
            border-bottom: 1px solid #333;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .header h1 {
            font-size: 1.5rem;
            background: linear-gradient(90deg, #00d4ff, #ff6b6b);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }
        .status-indicator {
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }
        .status-dot {
            width: 10px;
            height: 10px;
            border-radius: 50%;
            background: #00ff88;
            animation: pulse 2s infinite;
        }
        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
        }
        .dashboard {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 1rem;
            padding: 1rem;
        }
        .widget {
            background: #111;
            border: 1px solid #333;
            border-radius: 12px;
            padding: 1rem;
            min-height: 200px;
        }
        .widget h3 {
            font-size: 0.875rem;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            color: #888;
            margin-bottom: 1rem;
        }
        .widget.full-width {
            grid-column: span 3;
        }
        .widget.half-width {
            grid-column: span 2;
        }
        .agent-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
            gap: 0.5rem;
        }
        .agent-card {
            background: #1a1a1a;
            border-radius: 8px;
            padding: 0.75rem;
            border-left: 3px solid #333;
        }
        .agent-card.idle { border-left-color: #00ff88; }
        .agent-card.working { border-left-color: #00d4ff; }
        .agent-card.error { border-left-color: #ff6b6b; }
        .agent-card.offline { border-left-color: #666; }
        .agent-name {
            font-weight: 600;
            font-size: 0.875rem;
        }
        .agent-role {
            font-size: 0.75rem;
            color: #888;
        }
        .agent-status {
            font-size: 0.75rem;
            margin-top: 0.25rem;
            text-transform: uppercase;
        }
        .alert-feed {
            max-height: 200px;
            overflow-y: auto;
        }
        .alert-item {
            background: #1a1a1a;
            border-radius: 6px;
            padding: 0.5rem;
            margin-bottom: 0.5rem;
            border-left: 3px solid;
        }
        .alert-item.critical { border-left-color: #ff6b6b; }
        .alert-item.warning { border-left-color: #ffaa00; }
        .alert-item.info { border-left-color: #00d4ff; }
        .metrics {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 1rem;
        }
        .metric {
            text-align: center;
        }
        .metric-value {
            font-size: 2rem;
            font-weight: 700;
            color: #00d4ff;
        }
        .metric-label {
            font-size: 0.75rem;
            color: #888;
            text-transform: uppercase;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>🚀 Mission Control</h1>
        <div class="status-indicator">
            <div class="status-dot"></div>
            <span>System Online</span>
        </div>
    </div>

    <div class="dashboard">
        <div class="widget half-width">
            <h3>Agent Map</h3>
            <div id="agent-map" class="agent-grid">
                <div class="loading">Loading agents...</div>
            </div>
        </div>

        <div class="widget">
            <h3>Active Alerts</h3>
            <div id="alert-feed" class="alert-feed">
                <div class="alert-item info">
                    <strong>System</strong> - Mission Control initialized
                </div>
            </div>
        </div>

        <div class="widget">
            <h3>System Metrics</h3>
            <div class="metrics">
                <div class="metric">
                    <div class="metric-value" id="agent-count">-</div>
                    <div class="metric-label">Agents</div>
                </div>
                <div class="metric">
                    <div class="metric-value" id="task-count">-</div>
                    <div class="metric-label">Tasks</div>
                </div>
            </div>
        </div>

        <div class="widget full-width">
            <h3>Real-time Telemetry</h3>
            <div id="telemetry-chart">
                <canvas id="chart-canvas"></canvas>
            </div>
        </div>
    </div>

    <script src="/socket.io/socket.io.js"></script>
    <script src="dashboard.js"></script>
</body>
</html>
`;

        fs.writeFileSync(path.join(this.publicDir, 'index.html'), html);
        this.log('Dashboard layout created');

        // Complete task
        this.bus.publish('TASK_COMPLETED', {
            taskId: 'MC-5',
            file: 'public/index.html'
        });
    }

    createAgentStatusWidget() {
        this.log('Creating agent status widget...');

        const js = `// Mission Control Dashboard
const socket = io();

// State
const state = {
    agents: [],
    alerts: [],
    selectedAgent: null
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadAgents();
    setupWebSocket();
    startRefreshLoop();
});

// Load agents from API
async function loadAgents() {
    try {
        const res = await fetch('/api/agents');
        state.agents = await res.json();
        renderAgentMap();
        updateMetrics();
    } catch (err) {
        console.error('Failed to load agents:', err);
        showAlert('Failed to load agents', 'critical');
    }
}

// Render agent map
function renderAgentMap() {
    const container = document.getElementById('agent-map');
    container.innerHTML = state.agents.map(agent => \`
        <div class="agent-card \${agent.status}" data-id="\${agent.id}">
            <div class="agent-name">\${agent.name}</div>
            <div class="agent-role">\${agent.role}</div>
            <div class="agent-status">\${agent.status}</div>
        </div>
    \`).join('');

    // Add click handlers
    container.querySelectorAll('.agent-card').forEach(card => {
        card.addEventListener('click', () => selectAgent(card.dataset.id));
    });
}

// Update metrics
function updateMetrics() {
    document.getElementById('agent-count').textContent = state.agents.length;
    
    const working = state.agents.filter(a => a.status === 'working').length;
    const idle = state.agents.filter(a => a.status === 'idle').length;
    const errors = state.agents.filter(a => a.status === 'error').length;
    
    // Could update more metrics here
}

// WebSocket setup
function setupWebSocket() {
    socket.on('agent:update', (data) => {
        const agent = state.agents.find(a => a.id === data.id);
        if (agent) {
            agent.status = data.status;
            agent.current_task = data.task;
            renderAgentMap();
        }
    });

    socket.on('alert:new', (alert) => {
        showAlert(alert.message, alert.severity);
    });
}

// Select agent for details
function selectAgent(id) {
    state.selectedAgent = id;
    const agent = state.agents.find(a => a.id === id);
    if (agent) {
        console.log('Selected agent:', agent);
        // Could open modal or show details panel
    }
}

// Show alert
function showAlert(message, severity = 'info') {
    const feed = document.getElementById('alert-feed');
    const alert = document.createElement('div');
    alert.className = \`alert-item \${severity}\`;
    alert.innerHTML = \`
        <strong>\${severity.toUpperCase()}</strong> - \${message}
        <small style="float:right;color:#888">\${new Date().toLocaleTimeString()}</small>
    \`;
    feed.insertBefore(alert, feed.firstChild);
    
    // Keep only last 10 alerts
    while (feed.children.length > 10) {
        feed.removeChild(feed.lastChild);
    }
}

// Refresh loop
function startRefreshLoop() {
    setInterval(() => {
        loadAgents();
    }, 5000); // Refresh every 5 seconds
}

// Control functions
async function pauseAgent(id) {
    try {
        await fetch(\`/api/agents/\${id}/pause\`, { method: 'POST' });
        showAlert(\`Agent \${id} paused\`, 'info');
    } catch (err) {
        showAlert(\`Failed to pause agent: \${err.message}\`, 'critical');
    }
}

async function resumeAgent(id) {
    try {
        await fetch(\`/api/agents/\${id}/resume\`, { method: 'POST' });
        showAlert(\`Agent \${id} resumed\`, 'info');
    } catch (err) {
        showAlert(\`Failed to resume agent: \${err.message}\`, 'critical');
    }
}

// Export for console debugging
window.MissionControl = { state, pauseAgent, resumeAgent };
`;

        fs.writeFileSync(path.join(this.publicDir, 'dashboard.js'), js);
        this.log('Dashboard JavaScript created');

        // Complete task
        this.bus.publish('TASK_COMPLETED', {
            taskId: 'MC-6',
            file: 'public/dashboard.js'
        });
    }
}

module.exports = { FrontendDeveloperAgent };
