# Mission Control Architecture v1.0

## Principles

- Single source of truth for agent state
- Real-time updates via WebSocket
- Modular widget-based dashboard
- File-based storage for simplicity

## Tech Stack

### frontend
- **framework:** React
- **language:** TypeScript
- **charts:** Recharts
- **state:** React Context
- **styling:** CSS Modules

### backend
- **runtime:** Node.js
- **framework:** Express
- **websocket:** Socket.io
- **database:** SQLite
- **api:** REST + WebSocket

### deployment
- **processManager:** systemd
- **logs:** /var/log/mission-control.log
- **port:** 3456

