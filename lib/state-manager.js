#!/usr/bin/env node
// State Manager with snapshots and rollback capability

const fs = require('fs').promises;
const path = require('path');
const { logger } = require('./logger');

class StateManager {
    constructor() {
        this.dataDir = path.join(__dirname, '..', 'data');
        this.snapshotDir = path.join(this.dataDir, 'snapshots');
        this.ensureDirectories();
    }

    async ensureDirectories() {
        try {
            await fs.mkdir(this.dataDir, { recursive: true });
            await fs.mkdir(this.snapshotDir, { recursive: true });
        } catch (err) {
            logger.error('Failed to create directories', { error: err.message });
        }
    }

    // Create a snapshot of current state
    async snapshot(reason = 'manual') {
        const timestamp = Date.now();
        const snapshotId = `snap_${timestamp}`;
        
        try {
            // Gather all state
            const state = {
                id: snapshotId,
                timestamp: new Date().toISOString(),
                reason,
                agents: await this.loadAgents(),
                tasks: await this.loadTasks(),
                events: await this.loadRecentEvents(1000),
                metrics: await this.loadMetrics()
            };

            // Save snapshot
            const snapshotPath = path.join(this.snapshotDir, `${snapshotId}.json`);
            await fs.writeFile(snapshotPath, JSON.stringify(state, null, 2));

            // Update latest symlink
            const latestPath = path.join(this.snapshotDir, 'latest.json');
            try {
                await fs.unlink(latestPath);
            } catch {}
            await fs.symlink(snapshotPath, latestPath);

            // Cleanup old snapshots (keep last 24)
            await this.cleanupOldSnapshots(24);

            logger.info('Snapshot created', { snapshotId, reason });
            return { id: snapshotId, path: snapshotPath };

        } catch (err) {
            logger.error('Snapshot failed', { error: err.message });
            throw err;
        }
    }

    // Rollback to a specific snapshot
    async rollback(snapshotId) {
        logger.warn('Initiating rollback', { snapshotId });

        try {
            // Load snapshot
            const snapshotPath = path.join(this.snapshotDir, `${snapshotId}.json`);
            const snapshotData = await fs.readFile(snapshotPath, 'utf8');
            const snapshot = JSON.parse(snapshotData);

            // Create rollback point first (in case we need to undo)
            await this.snapshot('pre-rollback');

            // Restore state
            await this.saveAgents(snapshot.agents);
            await this.saveTasks(snapshot.tasks);

            logger.info('Rollback completed', { 
                snapshotId,
                timestamp: snapshot.timestamp 
            });

            return {
                success: true,
                restoredTo: snapshot.timestamp,
                agentsRestored: snapshot.agents.length,
                tasksRestored: snapshot.tasks.length
            };

        } catch (err) {
            logger.error('Rollback failed', { error: err.message, snapshotId });
            throw err;
        }
    }

    // List available snapshots
    async listSnapshots() {
        try {
            const files = await fs.readdir(this.snapshotDir);
            const snapshots = [];

            for (const file of files) {
                if (!file.endsWith('.json') || file === 'latest.json') continue;
                
                const stat = await fs.stat(path.join(this.snapshotDir, file));
                snapshots.push({
                    id: file.replace('.json', ''),
                    created: stat.mtime,
                    size: stat.size
                });
            }

            return snapshots.sort((a, b) => b.created - a.created);
        } catch (err) {
            logger.error('Failed to list snapshots', { error: err.message });
            return [];
        }
    }

    // Cleanup old snapshots
    async cleanupOldSnapshots(keepCount) {
        const snapshots = await this.listSnapshots();
        
        if (snapshots.length > keepCount) {
            const toDelete = snapshots.slice(keepCount);
            
            for (const snap of toDelete) {
                try {
                    await fs.unlink(path.join(this.snapshotDir, `${snap.id}.json`));
                    logger.debug('Deleted old snapshot', { snapshotId: snap.id });
                } catch (err) {
                    logger.warn('Failed to delete snapshot', { 
                        snapshotId: snap.id, 
                        error: err.message 
                    });
                }
            }
        }
    }

    // Idempotent operation wrapper
    async idempotent(key, operation, ttl = 3600000) {
        const lockFile = path.join(this.dataDir, 'locks', `${key}.lock`);
        
        try {
            await fs.mkdir(path.dirname(lockFile), { recursive: true });
            
            // Check if already completed
            try {
                const lockData = await fs.readFile(lockFile, 'utf8');
                const lock = JSON.parse(lockData);
                
                if (lock.completed && Date.now() - lock.timestamp < ttl) {
                    logger.debug('Idempotent operation already completed', { key });
                    return lock.result;
                }
            } catch {}

            // Execute operation
            const result = await operation();
            
            // Save lock
            await fs.writeFile(lockFile, JSON.stringify({
                completed: true,
                timestamp: Date.now(),
                result
            }));

            return result;

        } catch (err) {
            logger.error('Idempotent operation failed', { key, error: err.message });
            throw err;
        }
    }

    // State loaders (placeholder implementations)
    async loadAgents() {
        try {
            const data = await fs.readFile(
                path.join(this.dataDir, 'agents.json'), 
                'utf8'
            );
            return JSON.parse(data);
        } catch {
            return [];
        }
    }

    async loadTasks() {
        try {
            const data = await fs.readFile(
                path.join(this.dataDir, 'tasks.json'), 
                'utf8'
            );
            return JSON.parse(data);
        } catch {
            return [];
        }
    }

    async loadRecentEvents(count) {
        // Load from event log
        return [];
    }

    async loadMetrics() {
        return {};
    }

    async saveAgents(agents) {
        await fs.writeFile(
            path.join(this.dataDir, 'agents.json'),
            JSON.stringify(agents, null, 2)
        );
    }

    async saveTasks(tasks) {
        await fs.writeFile(
            path.join(this.dataDir, 'tasks.json'),
            JSON.stringify(tasks, null, 2)
        );
    }
}

module.exports = { StateManager };
