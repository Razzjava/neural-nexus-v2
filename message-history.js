/**
 * Message History Tracker
 * 
 * Tracks all agent-to-agent messages with persistence,
 * querying, and analytics capabilities.
 */

const fs = require('fs');
const path = require('path');
const { AgentMessageProtocol } = require('./messaging-protocol');

const HISTORY_DIR = path.join(__dirname, 'state', 'message-history');
const MAX_DAILY_FILES = 30; // Keep 30 days of history

class MessageHistoryTracker {
    constructor(options = {}) {
        this.retentionDays = options.retentionDays || 30;
        this.maxInMemory = options.maxInMemory || 1000;
        this.enableCompression = options.enableCompression !== false;
        
        // In-memory cache for recent messages
        this.cache = new Map();
        this.cacheOrder = []; // LRU tracking
        
        // Conversation threading index
        this.conversations = new Map();
        
        // Statistics
        this.stats = {
            totalMessages: 0,
            messagesByType: {},
            messagesByAgent: {},
            averageDeliveryTime: 0,
            failedDeliveries: 0
        };
        
        this.ensureDirectories();
        this.loadStats();
    }

    ensureDirectories() {
        if (!fs.existsSync(HISTORY_DIR)) {
            fs.mkdirSync(HISTORY_DIR, { recursive: true });
        }
    }

    /**
     * Record a message in history
     * @param {Object} message - Message to record
     * @param {string} direction - 'inbound' or 'outbound'
     * @returns {Object} Recorded message with history metadata
     */
    record(message, direction = 'inbound') {
        const validated = AgentMessageProtocol.validate(message);
        if (!validated.valid) {
            console.error('[History] Invalid message:', validated.errors);
            return null;
        }

        const historyEntry = {
            ...message,
            _history: {
                recordedAt: new Date().toISOString(),
                direction,
                historyId: `hist_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
            }
        };

        // Add to cache
        this.addToCache(historyEntry);
        
        // Persist to storage
        this.persist(historyEntry);
        
        // Update conversation thread
        this.updateConversationThread(historyEntry);
        
        // Update statistics
        this.updateStats(historyEntry);
        
        return historyEntry;
    }

    /**
     * Add message to in-memory cache
     */
    addToCache(entry) {
        const id = entry._history.historyId;
        
        // Evict oldest if cache is full
        while (this.cache.size >= this.maxInMemory) {
            const oldest = this.cacheOrder.shift();
            this.cache.delete(oldest);
        }
        
        this.cache.set(id, entry);
        this.cacheOrder.push(id);
    }

    /**
     * Persist message to daily log file
     */
    persist(entry) {
        const date = new Date().toISOString().split('T')[0];
        const filePath = path.join(HISTORY_DIR, `messages-${date}.jsonl`);
        
        try {
            fs.appendFileSync(filePath, JSON.stringify(entry) + '\n');
        } catch (e) {
            console.error('[History] Failed to persist:', e.message);
        }
    }

    /**
     * Update conversation thread index
     */
    updateConversationThread(entry) {
        const { sender, recipient, id, correlationId, type } = entry;
        
        // Create conversation key (sorted to ensure consistency)
        const participants = [sender, recipient].sort().join('::');
        
        if (!this.conversations.has(participants)) {
            this.conversations.set(participants, {
                participants: [sender, recipient],
                messages: [],
                lastActivity: entry.timestamp
            });
        }
        
        const conversation = this.conversations.get(participants);
        conversation.messages.push({
            id,
            correlationId,
            type,
            timestamp: entry.timestamp,
            direction: entry._history.direction
        });
        conversation.lastActivity = entry.timestamp;
    }

    /**
     * Update statistics
     */
    updateStats(entry) {
        this.stats.totalMessages++;
        
        // By type
        this.stats.messagesByType[entry.type] = 
            (this.stats.messagesByType[entry.type] || 0) + 1;
        
        // By agent (both sender and recipient)
        this.stats.messagesByAgent[entry.sender] = 
            (this.stats.messagesByAgent[entry.sender] || 0) + 1;
        this.stats.messagesByAgent[entry.recipient] = 
            (this.stats.messagesByAgent[entry.recipient] || 0) + 1;
    }

    /**
     * Query message history with filters
     * @param {Object} filters - Query filters
     * @returns {Array} Matching messages
     */
    query(filters = {}) {
        const {
            agent,           // Filter by agent (sender or recipient)
            sender,          // Filter by sender
            recipient,       // Filter by recipient
            type,            // Filter by message type
            since,           // Messages after timestamp
            until,           // Messages before timestamp
            correlationId,   // Messages in same conversation
            limit = 100,     // Max results
            offset = 0,      // Skip N results
            direction        // 'inbound' or 'outbound'
        } = filters;

        let results = [];
        
        // Check cache first
        for (const entry of this.cache.values()) {
            if (this.matchesFilters(entry, filters)) {
                results.push(entry);
            }
        }
        
        // If we need more, check persisted files
        if (results.length < limit + offset) {
            results = [...results, ...this.queryFromFiles(filters)];
        }
        
        // Sort by timestamp descending
        results.sort((a, b) => 
            new Date(b.timestamp) - new Date(a.timestamp)
        );
        
        // Apply pagination
        return results.slice(offset, offset + limit);
    }

    /**
     * Check if entry matches query filters
     */
    matchesFilters(entry, filters) {
        if (filters.agent && entry.sender !== filters.agent && entry.recipient !== filters.agent) {
            return false;
        }
        if (filters.sender && entry.sender !== filters.sender) return false;
        if (filters.recipient && entry.recipient !== filters.recipient) return false;
        if (filters.type && entry.type !== filters.type) return false;
        if (filters.correlationId && entry.correlationId !== filters.correlationId) return false;
        if (filters.direction && entry._history.direction !== filters.direction) return false;
        if (filters.since && new Date(entry.timestamp) < new Date(filters.since)) return false;
        if (filters.until && new Date(entry.timestamp) > new Date(filters.until)) return false;
        return true;
    }

    /**
     * Query messages from persisted files
     */
    queryFromFiles(filters) {
        const results = [];
        const files = this.getHistoryFiles();
        
        for (const file of files.slice(0, 5)) { // Check last 5 days
            try {
                const content = fs.readFileSync(file, 'utf8');
                const lines = content.trim().split('\n');
                
                for (const line of lines) {
                    try {
                        const entry = JSON.parse(line);
                        if (this.matchesFilters(entry, filters)) {
                            results.push(entry);
                        }
                    } catch (e) {
                        // Skip malformed lines
                    }
                }
            } catch (e) {
                console.error('[History] Failed to read file:', file, e.message);
            }
        }
        
        return results;
    }

    /**
     * Get conversation thread between agents
     * @param {string} agent1 - First agent
     * @param {string} agent2 - Second agent
     * @returns {Object} Conversation thread
     */
    getConversation(agent1, agent2) {
        const participants = [agent1, agent2].sort().join('::');
        return this.conversations.get(participants) || {
            participants: [agent1, agent2],
            messages: [],
            lastActivity: null
        };
    }

    /**
     * Get message by ID
     * @param {string} messageId - Message ID
     * @returns {Object|null} Message or null
     */
    getById(messageId) {
        // Check cache first
        for (const entry of this.cache.values()) {
            if (entry.id === messageId) return entry;
        }
        
        // Check files
        const files = this.getHistoryFiles();
        for (const file of files) {
            try {
                const content = fs.readFileSync(file, 'utf8');
                const lines = content.trim().split('\n');
                
                for (const line of lines) {
                    const entry = JSON.parse(line);
                    if (entry.id === messageId) return entry;
                }
            } catch (e) {
                // Continue to next file
            }
        }
        
        return null;
    }

    /**
     * Get list of history files sorted by date (newest first)
     */
    getHistoryFiles() {
        if (!fs.existsSync(HISTORY_DIR)) return [];
        
        return fs.readdirSync(HISTORY_DIR)
            .filter(f => f.startsWith('messages-') && f.endsWith('.jsonl'))
            .map(f => path.join(HISTORY_DIR, f))
            .sort()
            .reverse();
    }

    /**
     * Clean up old history files
     */
    cleanup() {
        const files = this.getHistoryFiles();
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - this.retentionDays);
        
        let cleaned = 0;
        for (const file of files) {
            const stat = fs.statSync(file);
            if (stat.mtime < cutoff) {
                fs.unlinkSync(file);
                cleaned++;
            }
        }
        
        return { cleaned, remaining: files.length - cleaned };
    }

    /**
     * Get conversation statistics
     */
    getStats() {
        return {
            ...this.stats,
            cacheSize: this.cache.size,
            conversations: this.conversations.size,
            historyFiles: this.getHistoryFiles().length
        };
    }

    /**
     * Export conversation history
     * @param {Object} options - Export options
     * @returns {Object} Export data
     */
    export(options = {}) {
        const { agent, since, format = 'json' } = options;
        
        const messages = this.query({ agent, since, limit: 10000 });
        
        if (format === 'json') {
            return {
                exportedAt: new Date().toISOString(),
                messageCount: messages.length,
                messages
            };
        }
        
        // Simple text format
        return messages.map(m => 
            `[${m.timestamp}] ${m.sender} -> ${m.recipient}: ${JSON.stringify(m.payload).slice(0, 100)}`
        ).join('\n');
    }

    loadStats() {
        const statsFile = path.join(HISTORY_DIR, 'stats.json');
        if (fs.existsSync(statsFile)) {
            try {
                this.stats = JSON.parse(fs.readFileSync(statsFile, 'utf8'));
            } catch (e) {
                // Use default stats
            }
        }
    }

    saveStats() {
        const statsFile = path.join(HISTORY_DIR, 'stats.json');
        try {
            fs.writeFileSync(statsFile, JSON.stringify(this.stats, null, 2));
        } catch (e) {
            console.error('[History] Failed to save stats:', e.message);
        }
    }
}

module.exports = { MessageHistoryTracker };
