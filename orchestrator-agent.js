#!/usr/bin/env node
// Orchestrator Agent — coordinates workflow, manages resources

const { EventBus, StateStore } = require('./event-bus');

class OrchestratorAgent {
    constructor() {
        this.bus = new EventBus('orchestrator');
        this.store = new StateStore();
        this.name = 'Orchestrator';
        this.running = false;
    }

    log(msg) {
        console.log(`[${this.name}] ${msg}`);
    }

    start() {
        this.running = true;
        this.log('Starting orchestrator...');

        // Subscribe to all relevant events
        this.bus.subscribe('RESEARCH_FOUND', (payload, event) => {
            this.handleResearchFound(payload, event);
        });

        this.bus.subscribe('SCRIPT_CREATED', (payload) => {
            this.log(`Script created for: ${payload.topic}`);
            this.store.update('pendingScripts', s => [...s, payload]);
        });

        this.bus.subscribe('RENDER_COMPLETE', (payload) => {
            this.log(`Render complete: ${payload.videoPath}`);
            this.store.update('activeRenders', r => 
                r.filter(job => job.id !== payload.jobId)
            );
        });

        this.bus.subscribe('RENDER_FAILED', (payload) => {
            this.log(`Render failed (attempt ${payload.retryCount}): ${payload.error}`);
            if (payload.retryCount >= 3) {
                this.log('Max retries reached — escalating to human');
                // Could send alert here
            }
        });

        this.bus.subscribe('PUBLISHED', (payload) => {
            this.log(`Published to ${payload.platform}: ${payload.url}`);
            this.store.update('publishedVideos', v => [...v, payload]);
        });

        // Start polling loop
        this.pollLoop();
    }

    handleResearchFound(payload, event) {
        const topTopic = payload.topics[0];
        this.log(`Research found: "${topTopic.title}" (score: ${topTopic.contentScore})`);

        // Decision: Should we trigger pipeline?
        const threshold = 45; // Lowered from 70 to trigger more often
        const canRender = this.store.get('activeRenders').length === 0;
        const dailyShorts = this.store.get('publishedVideos').filter(v => {
            const age = Date.now() - new Date(v.timestamp).getTime();
            return age < 24 * 60 * 60 * 1000 && v.format === 'short';
        }).length;
        const goalMet = dailyShorts >= this.store.get('contentGoals').shortsPerDay;

        this.log(`Decision factors: score=${topTopic.contentScore >= threshold}, canRender=${canRender}, goalMet=${goalMet}`);

        if (topTopic.contentScore >= threshold && canRender && !goalMet) {
            this.log('✅ THRESHOLD MET — triggering pipeline');
            this.triggerPipeline(topTopic);
        } else {
            this.log('❌ Threshold not met or constraints blocking');
        }
    }

    triggerPipeline(topic) {
        this.log(`🎬 Triggering pipeline for: ${topic.title}`);
        
        // Reserve render slot
        const jobId = Date.now();
        this.store.update('activeRenders', r => [...r, {
            id: jobId,
            topic: topic.title,
            status: 'rendering',
            startedAt: new Date().toISOString()
        }]);

        // Shell out to existing pipeline
        const { spawn } = require('child_process');
        const pipeline = spawn('bash', [
            '/root/.openclaw/workspace/neural-nexus/auto-video-pipeline.sh'
        ], {
            detached: true,
            stdio: 'ignore'
        });

        pipeline.on('error', (err) => {
            this.log(`Pipeline error: ${err.message}`);
            this.bus.publish('RENDER_FAILED', {
                jobId,
                error: err.message,
                retryCount: 0
            });
        });

        pipeline.unref();
        this.log(`Pipeline started (PID: ${pipeline.pid})`);

        // Publish render started event
        this.bus.publish('RENDER_STARTED', {
            jobId,
            topic: topic.title,
            priority: 'high',
            timestamp: new Date().toISOString()
        });
    }

    pollLoop() {
        if (!this.running) return;
        
        this.bus.poll();
        
        // Heartbeat
        this.bus.publish('AGENT_HEARTBEAT', {
            agentId: 'orchestrator',
            status: 'healthy',
            load: this.store.get('activeRenders').length
        });

        setTimeout(() => this.pollLoop(), 5000);  // Poll every 5s
    }

    stop() {
        this.running = false;
        this.log('Stopping orchestrator');
    }
}

// CLI
if (require.main === module) {
    const orch = new OrchestratorAgent();
    
    process.on('SIGINT', () => {
        orch.stop();
        process.exit(0);
    });

    orch.start();
}

module.exports = { OrchestratorAgent };
