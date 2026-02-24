const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'data', 'mission-control.db');

class AgentModel {
    constructor() {
        this.db = new sqlite3.Database(DB_PATH);
        this.init();
    }

    init() {
        this.db.exec(`
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
        `);
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
