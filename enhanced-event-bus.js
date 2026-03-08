/**
 * Enhanced Event Bus with Agent-to-Agent Messaging
 * 
 * Extends the base EventBus with direct messaging capabilities,
 * message routing, and delivery guarantees.
 */

const fs = require('fs');
const path = require('path');
const { EventBus } = require('./event-bus');
const { AgentMessageProtocol, MESSAGE_TYPE, PRIORITY } = require('./messaging-protocol');
const { MessageHistoryTracker } = require('./message-history');

const MESSAGE_QUEUE_DIR = path.join(__dirname, 'state', 'message-queue');

/**
 * Enhanced EventBus with direct agent messaging
 */
class EnhancedEventBus extends EventBus {
    constructor(agentId, options = {}) {
        super(agentId);
        
        this.options = {
            enablePersistence: true,
            enableRouting: true,
            deliveryTimeout: 30000,
            maxRetries: 3,
            ...options
        };
        
        // Message history tracker
        this.history = new MessageHistoryTracker(options.history || {});
        
        // Pending message promises (for request/response pattern)
        this.pendingResponses = new Map();
        
        // Message handlers by agent
        this.agentHandlers = new Map();
        
        // Routing table
        this.routes = new Map();
        
        // Message queue for offline agents
        this.offlineQueue = new Map();
        
        // Delivery statistics
        this.deliveryStats = {
            sent: 0,
            delivered: 0,
            failed: 0,
            retried: 0
        };
        
        this.ensureQueueDirectory();
        
        // Subscribe to agent message events
        this.subscribe('AGENT_MESSAGE', this.handleIncomingMessage.bind(this));
        this.subscribe('AGENT_RESPONSE', this.handleIncomingResponse.bind(this));
        
        // Start delivery monitoring
        this.startDeliveryMonitoring();
    }

    ensureQueueDirectory() {
        if (!fs.existsSync(MESSAGE_QUEUE_DIR)) {
            fs.mkdirSync(MESSAGE_QUEUE_DIR, { recursive: true });
        }
    }

    /**
     * Send a direct message to another agent
     * @param {string} recipient - Target agent ID
     * @param {Object} payload - Message content
     * @param {Object} options - Send options
     * @returns {Object} Sent message
     */
    async send(recipient, payload, options = {}) {
        const message = AgentMessageProtocol.create({
            type: options.type || MESSAGE_TYPE.DIRECT,
            sender: this.agentId,
            recipient,
            payload,
            options
        });

        return this.deliverMessage(message);
    }

    /**
     * Send a request and wait for response
     * @param {string} recipient - Target agent ID
     * @param {Object} payload - Request content
     * @param {Object} options - Request options
     * @returns {Promise} Response message
     */
    async request(recipient, payload, options = {}) {
        const timeout = options.responseTimeout || 30000;
        
        const message = AgentMessageProtocol.createRequest({
            sender: this.agentId,
            recipient,
            payload,
            options
        });

        // Create promise for response
        const responsePromise = new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                this.pendingResponses.delete(message.id);
                reject(new Error(`Request timeout after ${timeout}ms`));
            }, timeout);

            this.pendingResponses.set(message.id, {
                resolve: (response) => {
                    clearTimeout(timer);
                    resolve(response);
                },
                reject: (error) => {
                    clearTimeout(timer);
                    reject(error);
                },
                timestamp: Date.now()
            });
        });

        // Send the message
        await this.deliverMessage(message);

        return responsePromise;
    }

    /**
     * Respond to a message
     * @param {Object} originalMessage - Message being responded to
     * @param {Object} payload - Response content
     * @param {Object} options - Response options
     * @returns {Object} Response message
     */
    async respond(originalMessage, payload, options = {}) {
        const response = AgentMessageProtocol.createResponse(
            originalMessage, 
            payload, 
            options
        );

        return this.deliverMessage(response);
    }

    /**
     * Broadcast a message to multiple agents
     * @param {Array|string} recipients - Target agent IDs or '*' for all
     * @param {Object} payload - Message content
     * @param {Object} options - Broadcast options
     * @returns {Array} Sent messages
     */
    async broadcast(recipients, payload, options = {}) {
        let targets;
        
        if (recipients === '*') {
            // Get all known agents from routing table
            targets = Array.from(this.routes.keys()).filter(id => id !== this.agentId);
        } else {
            targets = Array.isArray(recipients) ? recipients : [recipients];
        }

        const messages = await Promise.all(
            targets.map(recipient => 
                this.send(recipient, payload, { ...options, type: MESSAGE_TYPE.BROADCAST })
            )
        );

        return messages;
    }

    /**
     * Deliver a message to its recipient
     * @param {Object} message - Message to deliver
     * @returns {Object} Delivery result
     */
    async deliverMessage(message) {
        // Validate message
        const validation = AgentMessageProtocol.validate(message);
        if (!validation.valid) {
            throw new Error(`Invalid message: ${validation.errors.join(', ')}`);
        }

        // Update lifecycle
        message.lifecycle.sent = new Date().toISOString();
        message.status.sent = true;

        // Record in history
        this.history.record(message, 'outbound');

        // Check if recipient is local (same process)
        const isLocal = message.recipient === this.agentId;
        const isBroadcast = message.recipient === '*';

        if (isLocal) {
            // Self-message
            this.handleIncomingMessage(message.payload, { ...message, type: 'AGENT_MESSAGE' });
        } else if (isBroadcast) {
            // Broadcast to all local handlers
            this.publish('AGENT_MESSAGE', message);
        } else {
            // Route to specific agent
            const routed = await this.routeMessage(message);
            
            if (!routed) {
                // Queue for offline agent
                this.queueForOfflineAgent(message);
            }
        }

        this.deliveryStats.sent++;

        return {
            messageId: message.id,
            status: 'sent',
            timestamp: message.lifecycle.sent
        };
    }

    /**
     * Route message to recipient agent
     * @param {Object} message - Message to route
     * @returns {boolean} Whether routing succeeded
     */
    async routeMessage(message) {
        // Check for registered handler
        const handler = this.agentHandlers.get(message.recipient);
        
        if (handler) {
            try {
                // Direct delivery to registered handler
                await handler(message.payload, message);
                message.status.delivered = true;
                message.lifecycle.delivered = new Date().toISOString();
                this.deliveryStats.delivered++;
                return true;
            } catch (e) {
                console.error(`[Bus] Handler error for ${message.recipient}:`, e.message);
                message.status.failed = true;
                message.lifecycle.failed = new Date().toISOString();
                this.deliveryStats.failed++;
                return false;
            }
        }

        // Publish to event bus for distributed agents
        this.publish('AGENT_MESSAGE', message);
        
        // Mark as potentially delivered (distributed)
        message.status.delivered = true;
        message.lifecycle.delivered = new Date().toISOString();
        
        return true;
    }

    /**
     * Queue message for offline agent
     * @param {Object} message - Message to queue
     */
    queueForOfflineAgent(message) {
        const recipient = message.recipient;
        
        if (!this.offlineQueue.has(recipient)) {
            this.offlineQueue.set(recipient, []);
        }
        
        const queue = this.offlineQueue.get(recipient);
        queue.push({
            ...message,
            queuedAt: new Date().toISOString()
        });
        
        // Persist queue
        this.persistOfflineQueue(recipient);
        
        console.log(`[Bus] Queued message for offline agent: ${recipient}`);
    }

    /**
     * Persist offline queue to disk
     * @param {string} recipient - Agent ID
     */
    persistOfflineQueue(recipient) {
        const queue = this.offlineQueue.get(recipient) || [];
        const filePath = path.join(MESSAGE_QUEUE_DIR, `${recipient}.json`);
        
        try {
            fs.writeFileSync(filePath, JSON.stringify(queue, null, 2));
        } catch (e) {
            console.error('[Bus] Failed to persist queue:', e.message);
        }
    }

    /**
     * Load offline queue for agent
     * @param {string} agentId - Agent ID
     * @returns {Array} Queued messages
     */
    loadOfflineQueue(agentId) {
        const filePath = path.join(MESSAGE_QUEUE_DIR, `${agentId}.json`);
        
        if (!fs.existsSync(filePath)) {
            return [];
        }
        
        try {
            const queue = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            // Remove persisted file
            fs.unlinkSync(filePath);
            return queue;
        } catch (e) {
            console.error('[Bus] Failed to load queue:', e.message);
            return [];
        }
    }

    /**
     * Handle incoming message
     * @param {Object} payload - Message payload
     * @param {Object} event - Message event
     */
    handleIncomingMessage(payload, event) {
        const message = event.payload || payload;
        
        // Verify this message is for us
        if (message.recipient !== this.agentId && message.recipient !== '*') {
            return; // Not for us
        }

        // Skip our own messages
        if (message.sender === this.agentId) return;

        // Record in history
        this.history.record(message, 'inbound');

        // Update status
        if (message.status) {
            message.status.read = true;
        }
        if (message.lifecycle) {
            message.lifecycle.read = new Date().toISOString();
        }

        // Dispatch to handler if registered
        const handler = this.agentHandlers.get(this.agentId);
        if (handler) {
            handler(message.payload, message);
        }
    }

    /**
     * Handle incoming response
     * @param {Object} payload - Response payload
     * @param {Object} event - Response event
     */
    handleIncomingResponse(payload, event) {
        const message = event.payload || payload;
        const pending = this.pendingResponses.get(message.correlationId);
        
        if (pending) {
            pending.resolve(message);
            this.pendingResponses.delete(message.correlationId);
        }
    }

    /**
     * Register a message handler for this agent
     * @param {Function} handler - Message handler function
     * @returns {Function} Unregister function
     */
    onMessage(handler) {
        this.agentHandlers.set(this.agentId, handler);
        
        // Deliver any queued messages
        const queued = this.loadOfflineQueue(this.agentId);
        for (const message of queued) {
            console.log(`[Bus] Delivering queued message from ${message.sender}`);
            handler(message.payload, message);
        }
        
        return () => this.agentHandlers.delete(this.agentId);
    }

    /**
     * Register a handler for specific agent messages
     * @param {string} agentId - Agent to handle messages for
     * @param {Function} handler - Message handler
     * @returns {Function} Unregister function
     */
    registerAgentHandler(agentId, handler) {
        this.agentHandlers.set(agentId, handler);
        
        // Deliver any queued messages
        const queued = this.loadOfflineQueue(agentId);
        for (const message of queued) {
            handler(message.payload, message);
        }
        
        return () => this.agentHandlers.delete(agentId);
    }

    /**
     * Unregister an agent handler
     * @param {string} agentId - Agent ID
     */
    unregisterAgentHandler(agentId) {
        this.agentHandlers.delete(agentId);
    }

    /**
     * Register a route for message forwarding
     * @param {string} agentId - Target agent
     * @param {Object} route - Route configuration
     */
    registerRoute(agentId, route) {
        this.routes.set(agentId, route);
    }

    /**
     * Start delivery monitoring and retry loop
     */
    startDeliveryMonitoring() {
        setInterval(() => {
            this.cleanupPendingResponses();
            this.retryFailedMessages();
        }, 5000);
    }

    /**
     * Clean up expired pending responses
     */
    cleanupPendingResponses() {
        const now = Date.now();
        const timeout = 60000; // 1 minute
        
        for (const [id, pending] of this.pendingResponses) {
            if (now - pending.timestamp > timeout) {
                pending.reject(new Error('Request timeout'));
                this.pendingResponses.delete(id);
            }
        }
    }

    /**
     * Retry failed messages
     */
    async retryFailedMessages() {
        // This would implement retry logic for failed deliveries
        // Implementation depends on persistence strategy
    }

    /**
     * Get message statistics
     * @returns {Object} Statistics
     */
    getStats() {
        return {
            ...this.deliveryStats,
            pendingResponses: this.pendingResponses.size,
            registeredHandlers: this.agentHandlers.size,
            offlineQueueSize: Array.from(this.offlineQueue.values())
                .reduce((sum, q) => sum + q.length, 0),
            history: this.history.getStats()
        };
    }

    /**
     * Get conversation history between agents
     * @param {string} agent1 - First agent
     * @param {string} agent2 - Second agent
     * @returns {Object} Conversation
     */
    getConversation(agent1, agent2) {
        return this.history.getConversation(agent1, agent2);
    }

    /**
     * Query message history
     * @param {Object} filters - Query filters
     * @returns {Array} Messages
     */
    queryHistory(filters = {}) {
        return this.history.query(filters);
    }
}

module.exports = {
    EnhancedEventBus,
    MESSAGE_TYPE,
    PRIORITY
};
