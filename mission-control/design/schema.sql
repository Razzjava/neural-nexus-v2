-- Mission Control Database Schema

CREATE TABLE IF NOT EXISTS agent (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT,
  team TEXT,
  status TEXT DEFAULT "idle",
  last_heartbeat DATETIME,
  current_task TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS task (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  assignee TEXT,
  status TEXT DEFAULT "backlog",
  points INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  completed_at DATETIME
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

