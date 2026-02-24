#!/usr/bin/env node
// Mission Control Development Team — runs all dev agents

const { ProjectManagerAgent } = require('./agents/pm-agent');
const { BusinessAnalystAgent } = require('./agents/ba-agent');
const { ArchitectAgent } = require('./agents/architect-agent');
const { BackendDeveloperAgent } = require('./agents/backend-dev-agent');
const { FrontendDeveloperAgent } = require('./agents/frontend-dev-agent');
const { DevOpsAgent } = require('./agents/devops-agent');
const { QAAgent } = require('./agents/qa-agent');

class MissionControlTeam {
    constructor() {
        this.agents = new Map();
        this.running = false;
    }

    log(msg) {
        console.log(`[MissionControlTeam] ${msg}`);
    }

    async start() {
        this.running = true;
        this.log('╔══════════════════════════════════════════════════╗');
        this.log('║   Mission Control Development Team Starting      ║');
        this.log('╚══════════════════════════════════════════════════╝');

        // 1. Start PM Agent (coordinates everything)
        this.log('Starting Project Manager...');
        const pm = new ProjectManagerAgent();
        pm.start();
        pm.initSprint(1, ['Build Mission Control Dashboard MVP']);
        this.agents.set('pm', pm);

        // 2. Start BA Agent (gathers requirements)
        this.log('Starting Business Analyst...');
        const ba = new BusinessAnalystAgent();
        ba.start();
        setTimeout(() => ba.gatherRequirements(), 2000);
        this.agents.set('ba', ba);

        // 3. Start Architect Agent (designs system)
        this.log('Starting Architect...');
        const architect = new ArchitectAgent();
        architect.start();
        this.agents.set('architect', architect);

        // 4. Start Developer Agents
        this.log('Starting Backend Developer...');
        const backend = new BackendDeveloperAgent();
        backend.start();
        this.agents.set('backend', backend);

        this.log('Starting Frontend Developer...');
        const frontend = new FrontendDeveloperAgent();
        frontend.start();
        this.agents.set('frontend', frontend);

        // 5. Start DevOps Agent
        this.log('Starting DevOps...');
        const devops = new DevOpsAgent();
        devops.start();
        this.agents.set('devops', devops);

        // 6. Start QA Agent
        this.log('Starting QA...');
        const qa = new QAAgent();
        qa.start();
        this.agents.set('qa', qa);

        this.log('All development agents started');
        this.log('Project: Mission Control Dashboard');
        this.log('Sprint: 1');

        // Progress monitor
        this.monitorProgress();
    }

    monitorProgress() {
        if (!this.running) return;

        setTimeout(() => {
            const pm = this.agents.get('pm');
            const status = pm?.getProjectStatus();
            
            if (status) {
                const done = status.tasks?.filter(t => t.status === 'done').length || 0;
                const total = status.tasks?.length || 0;
                const percent = Math.round((done / total) * 100);
                
                this.log(`Progress: ${done}/${total} tasks (${percent}%)`);
            }

            this.monitorProgress();
        }, 30000); // Every 30s
    }

    stop() {
        this.log('Stopping development team...');
        this.running = false;
    }
}

// CLI
const team = new MissionControlTeam();

process.on('SIGINT', () => {
    team.stop();
    process.exit(0);
});

team.start().catch(e => {
    console.error('Team failed:', e);
    process.exit(1);
});
