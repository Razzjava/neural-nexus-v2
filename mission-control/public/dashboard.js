// Mission Control Dashboard
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
    container.innerHTML = state.agents.map(agent => `
        <div class="agent-card ${agent.status}" data-id="${agent.id}">
            <div class="agent-name">${agent.name}</div>
            <div class="agent-role">${agent.role}</div>
            <div class="agent-status">${agent.status}</div>
        </div>
    `).join('');

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
    alert.className = `alert-item ${severity}`;
    alert.innerHTML = `
        <strong>${severity.toUpperCase()}</strong> - ${message}
        <small style="float:right;color:#888">${new Date().toLocaleTimeString()}</small>
    `;
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
        await fetch(`/api/agents/${id}/pause`, { method: 'POST' });
        showAlert(`Agent ${id} paused`, 'info');
    } catch (err) {
        showAlert(`Failed to pause agent: ${err.message}`, 'critical');
    }
}

async function resumeAgent(id) {
    try {
        await fetch(`/api/agents/${id}/resume`, { method: 'POST' });
        showAlert(`Agent ${id} resumed`, 'info');
    } catch (err) {
        showAlert(`Failed to resume agent: ${err.message}`, 'critical');
    }
}

// Export for console debugging
window.MissionControl = { state, pauseAgent, resumeAgent };
