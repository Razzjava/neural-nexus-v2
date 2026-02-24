#!/usr/bin/env node
// QA/Tester Agent — tests features and verifies quality

const { EventBus, StateStore } = require('../event-bus');
const fs = require('fs');
const path = require('path');

class QAAgent {
    constructor() {
        this.bus = new EventBus('qa-agent');
        this.store = new StateStore();
        this.name = 'QA';
        this.testDir = path.join(__dirname, '..', 'mission-control', 'tests');
        
        if (!fs.existsSync(this.testDir)) {
            fs.mkdirSync(this.testDir, { recursive: true });
        }
    }

    log(msg) {
        console.log(`[${this.name}] ${msg}`);
    }

    start() {
        this.log('QA Agent starting...');
        
        // Subscribe to completed tasks for testing
        this.bus.subscribe(['TASK_COMPLETED', 'CODE_SUBMITTED'], (payload) => {
            this.testFeature(payload);
        });

        this.pollLoop();
    }

    pollLoop() {
        this.bus.poll();
        setTimeout(() => this.pollLoop(), 5000);
    }

    async testFeature(payload) {
        this.log(`Testing feature: ${payload.taskId || payload.feature}`);

        const testResults = {
            feature: payload.taskId || payload.feature,
            timestamp: new Date().toISOString(),
            tests: [],
            passed: 0,
            failed: 0
        };

        // Run tests based on feature
        if (payload.taskId === 'MC-3') {
            testResults.tests = await this.testAgentModel();
        } else if (payload.taskId === 'MC-4') {
            testResults.tests = await this.testHeartbeatEndpoint();
        } else if (payload.taskId === 'MC-5' || payload.taskId === 'MC-6') {
            testResults.tests = await this.testDashboardUI();
        }

        testResults.passed = testResults.tests.filter(t => t.passed).length;
        testResults.failed = testResults.tests.filter(t => !t.passed).length;

        // Report results
        if (testResults.failed === 0) {
            this.log(`✅ All tests passed for ${testResults.feature}`);
            this.bus.publish('TESTS_PASSED', testResults);
        } else {
            this.log(`❌ ${testResults.failed} tests failed for ${testResults.feature}`);
            this.bus.publish('TESTS_FAILED', testResults);
            
            // Create bug report
            this.createBugReport(testResults);
        }

        return testResults;
    }

    async testAgentModel() {
        const tests = [];

        // Test 1: Model can be instantiated
        try {
            const { AgentModel } = require('../mission-control/src/agent-model');
            const model = new AgentModel();
            tests.push({ name: 'Model instantiates', passed: true });
        } catch (e) {
            tests.push({ name: 'Model instantiates', passed: false, error: e.message });
        }

        // Test 2: Can create agent
        try {
            const { AgentModel } = require('../mission-control/src/agent-model');
            const model = new AgentModel();
            await model.create({
                id: 'test-agent',
                name: 'Test Agent',
                role: 'tester',
                team: 'qa',
                status: 'idle'
            });
            tests.push({ name: 'Can create agent', passed: true });
        } catch (e) {
            tests.push({ name: 'Can create agent', passed: false, error: e.message });
        }

        // Test 3: Can find agents
        try {
            const { AgentModel } = require('../mission-control/src/agent-model');
            const model = new AgentModel();
            const agents = await model.findAll();
            tests.push({ name: 'Can query agents', passed: Array.isArray(agents) });
        } catch (e) {
            tests.push({ name: 'Can query agents', passed: false, error: e.message });
        }

        return tests;
    }

    async testHeartbeatEndpoint() {
        const tests = [];

        // Test 1: Server responds to health check
        try {
            const res = await fetch('http://localhost:3456/health');
            tests.push({ 
                name: 'Health endpoint responds', 
                passed: res.status === 200 
            });
        } catch (e) {
            tests.push({ 
                name: 'Health endpoint responds', 
                passed: false, 
                error: e.message 
            });
        }

        // Test 2: Can post heartbeat
        try {
            const res = await fetch('http://localhost:3456/api/agents/test/heartbeat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'idle', task: null })
            });
            tests.push({ 
                name: 'Heartbeat endpoint accepts POST', 
                passed: res.ok 
            });
        } catch (e) {
            tests.push({ 
                name: 'Heartbeat endpoint accepts POST', 
                passed: false, 
                error: e.message 
            });
        }

        return tests;
    }

    async testDashboardUI() {
        const tests = [];
        const publicDir = path.join(__dirname, '..', 'mission-control', 'public');

        // Test 1: HTML file exists
        tests.push({
            name: 'index.html exists',
            passed: fs.existsSync(path.join(publicDir, 'index.html'))
        });

        // Test 2: JS file exists
        tests.push({
            name: 'dashboard.js exists',
            passed: fs.existsSync(path.join(publicDir, 'dashboard.js'))
        });

        // Test 3: HTML contains required elements
        const html = fs.readFileSync(path.join(publicDir, 'index.html'), 'utf8');
        tests.push({
            name: 'HTML has agent-map container',
            passed: html.includes('id="agent-map"')
        });
        tests.push({
            name: 'HTML has alert-feed container',
            passed: html.includes('id="alert-feed"')
        });

        return tests;
    }

    createBugReport(testResults) {
        const bugs = testResults.tests.filter(t => !t.passed);
        
        const report = {
            id: `BUG-${Date.now()}`,
            feature: testResults.feature,
            timestamp: testResults.timestamp,
            severity: bugs.length > 2 ? 'high' : 'medium',
            issues: bugs.map(b => ({
                test: b.name,
                error: b.error || 'Failed'
            })),
            status: 'open'
        };

        this.bus.publish('BUG_REPORTED', report);
        this.log(`Bug reported: ${report.id}`);
    }

    // Create test file for a feature
    createTestFile(featureId, testCases) {
        const testFile = path.join(this.testDir, `${featureId}.test.js`);
        
        let code = `// Tests for ${featureId}\n\n`;
        code += `const { describe, it, expect } = require('./test-framework');\n\n`;
        code += `describe('${featureId}', () => {\n`;
        
        testCases.forEach(tc => {
            code += `    it('${tc.name}', async () => {\n`;
            code += `        ${tc.code}\n`;
            code += `    });\n\n`;
        });
        
        code += `});\n`;

        fs.writeFileSync(testFile, code);
        this.log(`Test file created: ${testFile}`);
    }
}

module.exports = { QAAgent };
