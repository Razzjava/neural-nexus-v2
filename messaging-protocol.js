/**
 * Agent Messaging Protocol (AMP)
 * 
 * Standardized messaging format for agent-to-agent communication
 * within the Neural Nexus platform.
 */

const crypto = require('crypto');

/**
 * Message priority levels
 */
const PRIORITY = Object.freeze({
    CRITICAL: 0,    // System critical - immediate processing
    HIGH: 1,        // Urgent - process within seconds
    NORMAL: 2,      // Standard - process when available
    LOW: 3,         // Background - process when idle
    BATCH: 4        // Bulk operations - deferrable
});

/**
 * Message types for different communication patterns
 */
const MESSAGE_TYPE = Object.freeze({
    // Direct communication
    DIRECT: 'direct',           // One-to-one message
    REQUEST: 'request',         // Request expecting response
    RESPONSE: 'response',       // Response to a request
    
    // Broadcast patterns
    BROADCAST: 'broadcast',     // One-to-many message
    PUBLISH: 'publish',         // Pub/sub pattern
    
    // Coordination patterns
    DELEGATE: 'delegate',       // Task delegation
    NOTIFY: 'notify',           // Simple notification
    QUERY: 'query',             // Information query
    
    // System patterns
    HEARTBEAT: 'heartbeat',     // Health check
    STATUS: 'status',           // Status update
    ERROR: 'error',             // Error notification
    ACK: 'ack'                  // Acknowledgment
});

/**
 * Message protocol validation and creation
 */
class AgentMessageProtocol {
    constructor() {
        this.schema = {
            required: ['id', 'type', 'sender', 'recipient', 'payload', 'timestamp', 'metadata'],
            types: Object.values(MESSAGE_TYPE),
            priorities: Object.values(PRIORITY)
        };
    }

    /**
     * Create a new message following the AMP standard
     * @param {Object} options - Message creation options
     * @param {string} options.type - Message type from MESSAGE_TYPE
     * @param {string} options.sender - Sender agent ID
     * @param {string} options.recipient - Recipient agent ID (or '*' for broadcast)
     * @param {Object} options.payload - Message payload/data
     * @param {Object} options.options - Optional configuration
     * @returns {Object} Validated message object
     */
    static create({
        type = MESSAGE_TYPE.DIRECT,
        sender,
        recipient,
        payload = {},
        options = {}
    } = {}) {
        if (!sender) throw new Error('Sender is required');
        if (!recipient) throw new Error('Recipient is required');
        if (!Object.values(MESSAGE_TYPE).includes(type)) {
            throw new Error(`Invalid message type: ${type}`);
        }

        const now = new Date().toISOString();
        
        return {
            // Core identifiers
            id: options.id || this.generateId(),
            correlationId: options.correlationId || null,
            
            // Routing information
            type,
            sender,
            recipient,
            
            // Content
            payload: this.sanitizePayload(payload),
            
            // Metadata
            timestamp: now,
            priority: options.priority ?? PRIORITY.NORMAL,
            ttl: options.ttl || 300000, // 5 minutes default TTL
            expiresAt: options.ttl ? new Date(Date.now() + options.ttl).toISOString() : null,
            
            // Tracking
            metadata: {
                version: '1.0',
                hopCount: 0,
                maxHops: options.maxHops || 10,
                encrypted: options.encrypted || false,
                compressed: options.compressed || false,
                tags: options.tags || [],
                context: options.context || {},
                ...options.metadata
            },
            
            // Status tracking
            status: {
                sent: false,
                delivered: false,
                read: false,
                acknowledged: false,
                failed: false,
                retries: 0,
                maxRetries: options.maxRetries || 3
            },
            
            // Lifecycle timestamps
            lifecycle: {
                created: now,
                sent: null,
                delivered: null,
                read: null,
                acknowledged: null,
                failed: null
            }
        };
    }

    /**
     * Create a response to a message
     * @param {Object} originalMessage - The message being responded to
     * @param {Object} responsePayload - Response content
     * @param {Object} options - Additional options
     * @returns {Object} Response message
     */
    static createResponse(originalMessage, responsePayload = {}, options = {}) {
        return this.create({
            type: MESSAGE_TYPE.RESPONSE,
            sender: originalMessage.recipient,
            recipient: originalMessage.sender,
            payload: responsePayload,
            options: {
                correlationId: originalMessage.id,
                priority: options.priority ?? originalMessage.priority,
                ttl: options.ttl ?? originalMessage.ttl,
                ...options
            }
        });
    }

    /**
     * Create a request message expecting a response
     * @param {Object} options - Request options
     * @returns {Object} Request message
     */
    static createRequest(options) {
        return this.create({
            type: MESSAGE_TYPE.REQUEST,
            ...options,
            options: {
                ...options.options,
                expectResponse: true,
                responseTimeout: options.options?.responseTimeout || 30000
            }
        });
    }

    /**
     * Validate a message against the protocol
     * @param {Object} message - Message to validate
     * @returns {Object} Validation result
     */
    static validate(message) {
        const errors = [];
        
        // Check required fields
        for (const field of ['id', 'type', 'sender', 'recipient', 'timestamp']) {
            if (!(field in message)) {
                errors.push(`Missing required field: ${field}`);
            }
        }
        
        // Validate type
        if (!Object.values(MESSAGE_TYPE).includes(message.type)) {
            errors.push(`Invalid message type: ${message.type}`);
        }
        
        // Validate priority if present
        if (message.priority !== undefined && 
            !Object.values(PRIORITY).includes(message.priority)) {
            errors.push(`Invalid priority: ${message.priority}`);
        }
        
        // Check TTL expiration
        if (message.expiresAt && new Date(message.expiresAt) < new Date()) {
            errors.push('Message has expired');
        }
        
        // Validate payload size (max 1MB)
        const payloadSize = JSON.stringify(message.payload || {}).length;
        if (payloadSize > 1024 * 1024) {
            errors.push(`Payload too large: ${payloadSize} bytes (max 1MB)`);
        }
        
        return {
            valid: errors.length === 0,
            errors,
            message
        };
    }

    /**
     * Generate a unique message ID
     * @returns {string} Unique identifier
     */
    static generateId() {
        return `msg_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    }

    /**
     * Sanitize payload to ensure JSON serializable
     * @param {Object} payload - Raw payload
     * @returns {Object} Sanitized payload
     */
    static sanitizePayload(payload) {
        try {
            // Round-trip through JSON to ensure serializability
            return JSON.parse(JSON.stringify(payload, (key, value) => {
                // Handle special types
                if (value instanceof Date) return value.toISOString();
                if (value instanceof Error) {
                    return {
                        name: value.name,
                        message: value.message,
                        stack: value.stack
                    };
                }
                if (typeof value === 'function') return undefined;
                return value;
            }));
        } catch (e) {
            return { error: 'Payload serialization failed', raw: String(payload) };
        }
    }

    /**
     * Calculate message priority from string or number
     * @param {string|number} priority - Priority value
     * @returns {number} Numeric priority
     */
    static normalizePriority(priority) {
        if (typeof priority === 'number') return Math.min(Math.max(priority, 0), 4);
        if (typeof priority === 'string') {
            const upper = priority.toUpperCase();
            return PRIORITY[upper] ?? PRIORITY.NORMAL;
        }
        return PRIORITY.NORMAL;
    }

    /**
     * Get message age in milliseconds
     * @param {Object} message - Message to check
     * @returns {number} Age in ms
     */
    static getAge(message) {
        return Date.now() - new Date(message.timestamp).getTime();
    }

    /**
     * Check if message is expired
     * @param {Object} message - Message to check
     * @returns {boolean} True if expired
     */
    static isExpired(message) {
        if (!message.expiresAt) return false;
        return new Date(message.expiresAt) < new Date();
    }
}

module.exports = {
    AgentMessageProtocol,
    MESSAGE_TYPE,
    PRIORITY
};
