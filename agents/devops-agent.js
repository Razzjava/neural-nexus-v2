#!/usr/bin/env node
// DevOps Agent — handles deployment and infrastructure

const { EventBus, StateStore } = require('../event-bus');
const fs = require('fs');
const path = require('path');

class DevOpsAgent {
    constructor() {
        this.bus = new EventBus('devops-agent');
        this.store = new StateStore();
        this.name = 'DevOps';
        this.projectDir = path.join(__dirname, '..', 'mission-control');
    }

    log(msg) {
        console.log(`[${this.name}] ${msg}`);
    }

    start() {
        this.log('DevOps Agent starting...');
        
        this.bus.subscribe('ARCHITECTURE_DEFINED', (payload) => {
            this.log('Architecture received — creating deployment files');
            this.createDeploymentFiles();
        });
        
        this.bus.subscribe('TASK_ASSIGNED', (payload) => {
            if (payload.assignee === 'devops-agent') {
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
            case 'MC-8':
                this.createDeploymentFiles();
                break;
            default:
                this.log(`Task ${task.taskId} not implemented yet`);
        }
    }

    createDeploymentFiles() {
        this.log('Creating deployment files...');

        // Create systemd service
        const serviceFile = `[Unit]
Description=Mission Control Dashboard
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/root/.openclaw/workspace/neural-nexus/mission-control
ExecStart=/usr/bin/node src/server.js
Restart=always
RestartSec=10
Environment=PORT=3456
StandardOutput=append:/var/log/mission-control.log
StandardError=append:/var/log/mission-control.log

[Install]
WantedBy=multi-user.target
`;

        fs.writeFileSync(path.join(this.projectDir, 'mission-control.service'), serviceFile);

        // Create package.json
        const packageJson = {
            name: 'mission-control',
            version: '1.0.0',
            description: 'Agent monitoring dashboard',
            main: 'src/server.js',
            scripts: {
                start: 'node src/server.js',
                dev: 'nodemon src/server.js'
            },
            dependencies: {
                express: '^4.18.2',
                'socket.io': '^4.6.1',
                sqlite3: '^5.1.6'
            }
        };

        fs.writeFileSync(
            path.join(this.projectDir, 'package.json'),
            JSON.stringify(packageJson, null, 2)
        );

        // Create install script
        const installScript = `#!/bin/bash
set -e

echo "Installing Mission Control..."

# Install dependencies
npm install

# Create data directory
mkdir -p data

# Copy systemd service
cp mission-control.service /etc/systemd/system/

# Enable and start
systemctl daemon-reload
systemctl enable mission-control
systemctl start mission-control

echo "Mission Control installed on port 3456"
echo "View logs: journalctl -u mission-control -f"
`;

        fs.writeFileSync(path.join(this.projectDir, 'install.sh'), installScript);
        fs.chmodSync(path.join(this.projectDir, 'install.sh'), 0o755);

        this.log('Deployment files created');

        // Complete task
        this.bus.publish('TASK_COMPLETED', {
            taskId: 'MC-8',
            files: ['mission-control.service', 'package.json', 'install.sh']
        });
    }

    // Deploy the application
    async deploy() {
        this.log('Deploying Mission Control...');
        
        const { exec } = require('child_process');
        
        return new Promise((resolve, reject) => {
            exec('bash install.sh', { cwd: this.projectDir }, (err, stdout, stderr) => {
                if (err) {
                    this.log(`Deploy failed: ${err.message}`);
                    reject(err);
                } else {
                    this.log('Deploy successful');
                    resolve(stdout);
                }
            });
        });
    }

    // Health check
    async healthCheck() {
        try {
            const res = await fetch('http://localhost:3456/health');
            return res.ok;
        } catch {
            return false;
        }
    }
}

module.exports = { DevOpsAgent };
