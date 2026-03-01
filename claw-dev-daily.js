#!/usr/bin/env node
/**
 * claw-dev-daily.js
 * 
 * Daily codebase review agent for Claw.
 * Checks git status, TODOs, refactoring opportunities, and runs tests.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
    workspace: '/root/.openclaw/workspace',
    reportDir: '/root/.openclaw/workspace/agents-output/reports',
    maxEventLogSize: 5 * 1024 * 1024, // 5MB - rotate when exceeded
    maxEventLogAge: 7, // days
};

// Utility: Log with timestamp
function log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = type === 'error' ? '❌' : type === 'warn' ? '⚠️' : '✅';
    console.log(`${prefix} [${timestamp}] ${message}`);
}

// Check git status
function checkGitStatus() {
    log('Checking git status...');
    try {
        const status = execSync('git status --short', { cwd: CONFIG.workspace, encoding: 'utf8' });
        const modified = status.trim().split('\n').filter(l => l.startsWith(' M')).length;
        const untracked = status.trim().split('\n').filter(l => l.startsWith('??')).length;
        return { modified, untracked, details: status.trim() };
    } catch (err) {
        return { modified: 0, untracked: 0, details: '', error: err.message };
    }
}

// Find TODO/FIXME comments
function findTodos() {
    log('Scanning for TODO/FIXME comments...');
    try {
        const output = execSync(
            `grep -rn "TODO:\|FIXME:\|XXX:\|HACK:" --include="*.js" --include="*.ts" --include="*.py" --include="*.go" --include="*.rs" . 2>/dev/null | grep -v node_modules | grep -v claw-dev-daily.js | head -20`,
            { cwd: CONFIG.workspace, encoding: 'utf8' }
        );
        return output.trim().split('\n').filter(Boolean);
    } catch {
        return [];
    }
}

// Check event log size and rotate if needed
function checkEventLogRotation() {
    const eventLog = path.join(CONFIG.workspace, 'neural-nexus/state/event-log.jsonl');
    
    if (!fs.existsSync(eventLog)) return { rotated: false };
    
    const stats = fs.statSync(eventLog);
    const sizeMB = stats.size / (1024 * 1024);
    
    if (stats.size > CONFIG.maxEventLogSize) {
        log(`Event log size (${sizeMB.toFixed(2)}MB) exceeds threshold, rotating...`, 'warn');
        
        const backupName = `event-log-${new Date().toISOString().split('T')[0]}.jsonl.gz`;
        const backupPath = path.join(path.dirname(eventLog), backupName);
        
        try {
            // Compress and backup
            execSync(`gzip -c "${eventLog}" > "${backupPath}"`, { cwd: CONFIG.workspace });
            // Clear current log
            fs.writeFileSync(eventLog, '');
            log(`Event log rotated to ${backupName}`);
            return { rotated: true, backup: backupName, size: sizeMB };
        } catch (err) {
            log(`Failed to rotate event log: ${err.message}`, 'error');
            return { rotated: false, error: err.message };
        }
    }
    
    return { rotated: false, size: sizeMB };
}

// Check for duplicate code patterns
function checkCodeDuplication() {
    log('Checking for code patterns...');
    
    // Check for duplicate EventBus implementations
    const eventBusFiles = [
        'neural-nexus/event-bus.js',
        'event-bus.js'
    ].filter(f => fs.existsSync(path.join(CONFIG.workspace, f)));
    
    if (eventBusFiles.length > 1) {
        return {
            duplicates: ['EventBus implementation duplicated in root and neural-nexus/'],
            recommendation: 'Consolidate to neural-nexus/event-bus.js and remove root copy'
        };
    }
    
    return { duplicates: [], recommendation: null };
}

// Run available tests
function runTests() {
    log('Running tests...');
    const results = { passed: 0, failed: 0, skipped: 0 };
    
    // Check for integration test
    const integrationTest = path.join(CONFIG.workspace, 'neural-nexus/test-integration.js');
    if (fs.existsSync(integrationTest)) {
        try {
            execSync(`node ${integrationTest}`, { cwd: CONFIG.workspace, timeout: 30000 });
            results.passed++;
        } catch (err) {
            results.failed++;
            log('Integration test failed', 'error');
        }
    } else {
        results.skipped++;
    }
    
    return results;
}

// Generate report
function generateReport(data) {
    const report = {
        timestamp: new Date().toISOString(),
        agent: 'claw-dev-daily',
        summary: {
            gitModified: data.git.modified,
            gitUntracked: data.git.untracked,
            todosFound: data.todos.length,
            testsPassed: data.tests.passed,
            testsFailed: data.tests.failed,
            eventLogRotated: data.eventLog.rotated,
            codeIssues: data.duplication.duplicates.length
        },
        details: data,
        recommendations: []
    };
    
    // Add recommendations
    if (data.git.untracked > 10) {
        report.recommendations.push('Consider committing or cleaning untracked files');
    }
    if (data.todos.length > 0) {
        report.recommendations.push(`Address ${data.todos.length} TODO/FIXME items`);
    }
    if (data.eventLog.rotated) {
        report.recommendations.push(`Event log rotated (${data.eventLog.size.toFixed(2)}MB backed up)`);
    }
    if (data.duplication.duplicates.length > 0) {
        report.recommendations.push(data.duplication.recommendation);
    }
    
    return report;
}

// Save report
function saveReport(report) {
    const reportPath = path.join(CONFIG.reportDir, `dev-daily-${new Date().toISOString().split('T')[0]}.json`);
    
    if (!fs.existsSync(CONFIG.reportDir)) {
        fs.mkdirSync(CONFIG.reportDir, { recursive: true });
    }
    
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    log(`Report saved: ${reportPath}`);
    return reportPath;
}

// Main execution
async function main() {
    log('🚀 Claw Dev Daily starting...', 'info');
    
    const data = {
        git: checkGitStatus(),
        todos: findTodos(),
        eventLog: checkEventLogRotation(),
        duplication: checkCodeDuplication(),
        tests: runTests()
    };
    
    const report = generateReport(data);
    const reportPath = saveReport(report);
    
    // Print summary
    console.log('\n📊 Daily Review Summary');
    console.log('========================');
    console.log(`Git: ${data.git.modified} modified, ${data.git.untracked} untracked`);
    console.log(`TODOs: ${data.todos.length} found`);
    console.log(`Tests: ${data.tests.passed} passed, ${data.tests.failed} failed`);
    console.log(`Event Log: ${data.eventLog.rotated ? 'rotated' : 'ok'} (${data.eventLog.size?.toFixed(2) || 0}MB)`);
    
    if (report.recommendations.length > 0) {
        console.log('\n💡 Recommendations:');
        report.recommendations.forEach(r => console.log(`  - ${r}`));
    }
    
    log('✅ Daily review complete!', 'info');
    return report;
}

// Run if called directly
if (require.main === module) {
    main().catch(err => {
        log(`Fatal error: ${err.message}`, 'error');
        process.exit(1);
    });
}

module.exports = { checkGitStatus, findTodos, checkEventLogRotation, generateReport };