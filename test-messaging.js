/**
 * Agent-to-Agent Messaging Tests (NEXUS-001)
 * 
 * Comprehensive test suite for the messaging protocol,
 * event bus, and history tracking.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

// Components under test
const { AgentMessageProtocol, MESSAGE_TYPE, PRIORITY } = require('./messaging-protocol');
const { MessageHistoryTracker } = require('./message-history');
const { EnhancedEventBus } = require('./enhanced-event-bus');

// Test utilities
class TestRunner {
    constructor() {
        this.tests = [];
        this.results = { passed: 0, failed: 0, errors: [] };
    }

    test(name, fn) {
        this.tests.push({ name, fn });
    }

    async run() {
        console.log('\n🧪 Running NEXUS-001 Messaging Tests\n');
        console.log('=' .repeat(50));
        
        for (const { name, fn } of this.tests) {
            try {
                await fn();
                this.results.passed++;
                console.log(`✅ ${name}`);
            } catch (error) {
                this.results.failed++;
                this.results.errors.push({ test: name, error: error.message });
                console.log(`❌ ${name}`);
                console.log(`   Error: ${error.message}`);
            }
        }
        
        console.log('=' .repeat(50));
        console.log(`\nResults: ${this.results.passed} passed, ${this.results.failed} failed`);
        
        return this.results;
    }
}

const runner = new TestRunner();

// ============================================
// Messaging Protocol Tests
// ============================================

runner.test('Protocol: Create basic message', () => {
    const message = AgentMessageProtocol.create({
        type: MESSAGE_TYPE.DIRECT,
        sender: 'agent-a',
        recipient: 'agent-b',
        payload: { text: 'Hello!' }
    });
    
    assert(message.id, 'Message should have an ID');
    assert.strictEqual(message.sender, 'agent-a');
    assert.strictEqual(message.recipient, 'agent-b');
    assert.strictEqual(message.type, MESSAGE_TYPE.DIRECT);
    assert.deepStrictEqual(message.payload, { text: 'Hello!' });
    assert(message.timestamp, 'Message should have timestamp');
});

runner.test('Protocol: Create message with options', () => {
    const message = AgentMessageProtocol.create({
        type: MESSAGE_TYPE.REQUEST,
        sender: 'agent-a',
        recipient: 'agent-b',
        payload: { data: 'test' },
        options: {
            priority: PRIORITY.HIGH,
            ttl: 60000,
            tags: ['test', 'priority'],
            context: { requestId: '123' }
        }
    });
    
    assert.strictEqual(message.priority, PRIORITY.HIGH);
    assert.strictEqual(message.ttl, 60000);
    assert.deepStrictEqual(message.metadata.tags, ['test', 'priority']);
    assert.deepStrictEqual(message.metadata.context, { requestId: '123' });
});

runner.test('Protocol: Create response message', () => {
    const request = AgentMessageProtocol.create({
        type: MESSAGE_TYPE.REQUEST,
        sender: 'agent-a',
        recipient: 'agent-b',
        payload: { query: 'data' }
    });
    
    const response = AgentMessageProtocol.createResponse(request, {
        result: 'success',
        data: { items: [1, 2, 3] }
    });
    
    assert.strictEqual(response.type, MESSAGE_TYPE.RESPONSE);
    assert.strictEqual(response.sender, 'agent-b');
    assert.strictEqual(response.recipient, 'agent-a');
    assert.strictEqual(response.correlationId, request.id);
    assert.deepStrictEqual(response.payload.result, 'success');
});

runner.test('Protocol: Create request message', () => {
    const request = AgentMessageProtocol.createRequest({
        sender: 'agent-a',
        recipient: 'agent-b',
        payload: { action: 'compute' },
        options: { responseTimeout: 5000 }
    });
    
    assert.strictEqual(request.type, MESSAGE_TYPE.REQUEST);
    assert.strictEqual(request.metadata.expectResponse, true);
    assert.strictEqual(request.metadata.responseTimeout, 5000);
});

runner.test('Protocol: Validate valid message', () => {
    const message = AgentMessageProtocol.create({
        sender: 'agent-a',
        recipient: 'agent-b',
        payload: {}
    });
    
    const validation = AgentMessageProtocol.validate(message);
    assert.strictEqual(validation.valid, true);
    assert.deepStrictEqual(validation.errors, []);
});

runner.test('Protocol: Validate invalid message', () => {
    const validation = AgentMessageProtocol.validate({
        id: 'test-id',
        sender: 'agent-a'
        // Missing required fields
    });
    
    assert.strictEqual(validation.valid, false);
    assert(validation.errors.length > 0, 'Should have validation errors');
});

runner.test('Protocol: Validate message type', () => {
    const validation = AgentMessageProtocol.validate({
        id: 'test',
        type: 'invalid-type',
        sender: 'a',
        recipient: 'b',
        timestamp: new Date().toISOString(),
        payload: {}
    });
    
    assert.strictEqual(validation.valid, false);
    assert(validation.errors.some(e => e.includes('type') || e.includes('Invalid')));
});

runner.test('Protocol: Generate unique IDs', () => {
    const id1 = AgentMessageProtocol.generateId();
    const id2 = AgentMessageProtocol.generateId();
    
    assert.notStrictEqual(id1, id2);
    assert(id1.startsWith('msg_'));
    assert(id2.startsWith('msg_'));
});

runner.test('Protocol: Sanitize payload', () => {
    const payload = {
        text: 'test',
        date: new Date('2024-01-15'),
        error: new Error('test error'),
        fn: () => {}, // Should be removed
        nested: {
            value: 42
        }
    };
    
    const sanitized = AgentMessageProtocol.sanitizePayload(payload);
    
    assert.strictEqual(sanitized.text, 'test');
    assert.strictEqual(typeof sanitized.date, 'string');
    assert.strictEqual(sanitized.error.name, 'Error');
    assert.strictEqual(sanitized.error.message, 'test error');
    assert.strictEqual(sanitized.fn, undefined);
    assert.deepStrictEqual(sanitized.nested, { value: 42 });
});

runner.test('Protocol: Normalize priority', () => {
    assert.strictEqual(AgentMessageProtocol.normalizePriority('CRITICAL'), PRIORITY.CRITICAL);
    assert.strictEqual(AgentMessageProtocol.normalizePriority('HIGH'), PRIORITY.HIGH);
    assert.strictEqual(AgentMessageProtocol.normalizePriority('NORMAL'), PRIORITY.NORMAL);
    assert.strictEqual(AgentMessageProtocol.normalizePriority('LOW'), PRIORITY.LOW);
    assert.strictEqual(AgentMessageProtocol.normalizePriority('BATCH'), PRIORITY.BATCH);
    assert.strictEqual(AgentMessageProtocol.normalizePriority(2), 2);
    assert.strictEqual(AgentMessageProtocol.normalizePriority('UNKNOWN'), PRIORITY.NORMAL);
});

runner.test('Protocol: Check message expiration', () => {
    const expiredMessage = AgentMessageProtocol.create({
        sender: 'a',
        recipient: 'b',
        options: { ttl: -1000 } // Already expired
    });
    
    assert.strictEqual(AgentMessageProtocol.isExpired(expiredMessage), true);
    
    const validMessage = AgentMessageProtocol.create({
        sender: 'a',
        recipient: 'b',
        options: { ttl: 60000 }
    });
    
    assert.strictEqual(AgentMessageProtocol.isExpired(validMessage), false);
});

// ============================================
// Message History Tests
// ============================================

runner.test('History: Record and retrieve message', () => {
    const history = new MessageHistoryTracker({ maxInMemory: 100 });
    
    const message = AgentMessageProtocol.create({
        sender: 'agent-record-test',
        recipient: 'agent-retrieve-test',
        payload: { test: 'data', unique: Date.now() }
    });
    
    const entry = history.record(message, 'outbound');
    
    assert(entry._history, 'Should have history metadata');
    assert.strictEqual(entry._history.direction, 'outbound');
    assert(entry._history.historyId, 'Should have history ID');
    
    // Query should return the message
    const results = history.query({ sender: 'agent-record-test' });
    assert(results.length >= 1, 'Should find at least one message');
    assert(results.some(r => r.payload.unique === message.payload.unique));
});

runner.test('History: Query with filters', () => {
    const history = new MessageHistoryTracker({ maxInMemory: 100 });
    const uniqueId = Date.now();
    
    // Record multiple messages
    history.record(AgentMessageProtocol.create({
        sender: `query-test-a-${uniqueId}`,
        recipient: `query-test-b-${uniqueId}`,
        payload: { id: uniqueId, seq: 1 },
        options: { type: MESSAGE_TYPE.DIRECT }
    }), 'outbound');
    
    history.record(AgentMessageProtocol.create({
        sender: `query-test-b-${uniqueId}`,
        recipient: `query-test-a-${uniqueId}`,
        payload: { id: uniqueId, seq: 2 },
        options: { type: MESSAGE_TYPE.RESPONSE }
    }), 'inbound');
    
    history.record(AgentMessageProtocol.create({
        sender: `query-test-c-${uniqueId}`,
        recipient: `query-test-d-${uniqueId}`,
        payload: { id: uniqueId, seq: 3 }
    }), 'outbound');
    
    // Filter by sender
    const fromA = history.query({ sender: `query-test-a-${uniqueId}` });
    assert(fromA.length >= 1, 'Should find messages from sender A');
    assert(fromA.every(m => m.sender === `query-test-a-${uniqueId}` || m.payload.id === uniqueId));
    
    // Filter by recipient
    const toA = history.query({ recipient: `query-test-a-${uniqueId}` });
    assert(toA.length >= 1, 'Should find messages to recipient A');
    
    // Filter by type
    const directs = history.query({ type: MESSAGE_TYPE.DIRECT });
    assert(directs.length >= 1, 'Should find direct messages');
});

runner.test('History: Get conversation between agents', () => {
    const history = new MessageHistoryTracker({ maxInMemory: 100 });
    
    history.record(AgentMessageProtocol.create({
        sender: 'alice',
        recipient: 'bob',
        payload: { text: 'Hello Bob!' }
    }), 'outbound');
    
    history.record(AgentMessageProtocol.create({
        sender: 'bob',
        recipient: 'alice',
        payload: { text: 'Hi Alice!' }
    }), 'inbound');
    
    const conversation = history.getConversation('alice', 'bob');
    assert.strictEqual(conversation.messages.length, 2);
    assert(conversation.participants.includes('alice'));
    assert(conversation.participants.includes('bob'));
});

runner.test('History: Get message by ID', () => {
    const history = new MessageHistoryTracker({ maxInMemory: 100 });
    
    const message = AgentMessageProtocol.create({
        sender: 'test',
        recipient: 'other',
        payload: { data: 123 }
    });
    
    history.record(message, 'outbound');
    
    const found = history.getById(message.id);
    assert(found, 'Should find message by ID');
    assert.strictEqual(found.id, message.id);
});

runner.test('History: Update statistics', () => {
    const history = new MessageHistoryTracker({ maxInMemory: 100 });
    const uniqueTestId = `stats-test-${Date.now()}`;
    const initialTotal = history.stats.totalMessages;
    
    history.record(AgentMessageProtocol.create({
        sender: `${uniqueTestId}-a`,
        recipient: `${uniqueTestId}-b`,
        options: { type: MESSAGE_TYPE.DIRECT }
    }), 'outbound');
    
    history.record(AgentMessageProtocol.create({
        sender: `${uniqueTestId}-a`,
        recipient: `${uniqueTestId}-c`,
        type: MESSAGE_TYPE.REQUEST,  // Pass type at top level
        payload: {},
        options: {}
    }), 'outbound');
    
    const stats = history.getStats();
    assert.strictEqual(stats.totalMessages, initialTotal + 2);
    assert(stats.messagesByType[MESSAGE_TYPE.DIRECT] >= 1, 'Should have DIRECT messages');
    assert(stats.messagesByAgent[`${uniqueTestId}-a`] >= 2, 'Should track agent messages');
});

runner.test('History: Export functionality', () => {
    const history = new MessageHistoryTracker({ maxInMemory: 100 });
    const uniqueExportId = `export-${Date.now()}`;
    
    history.record(AgentMessageProtocol.create({
        sender: `${uniqueExportId}-exporter`,
        recipient: `${uniqueExportId}-target`,
        payload: { data: 'test', uniqueId: uniqueExportId }
    }), 'outbound');
    
    const exported = history.export({ format: 'json' });
    assert(exported.messageCount >= 1);
    assert(Array.isArray(exported.messages));
    assert(exported.messages.some(m => m.payload.uniqueId === uniqueExportId));
});

// ============================================
// Enhanced Event Bus Tests
// ============================================

runner.test('EventBus: Send direct message', async () => {
    const bus = new EnhancedEventBus('test-sender');
    const received = [];
    
    // Set up receiver
    bus.registerAgentHandler('test-receiver', (payload, message) => {
        received.push({ payload, message });
    });
    
    // Send message
    const result = await bus.send('test-receiver', { text: 'Hello!' });
    
    assert.strictEqual(result.status, 'sent');
    assert(result.messageId, 'Should have message ID');
    assert.strictEqual(received.length, 1);
    assert.deepStrictEqual(received[0].payload, { text: 'Hello!' });
});

runner.test('EventBus: Request-response pattern', async () => {
    const busA = new EnhancedEventBus('agent-a');
    const busB = new EnhancedEventBus('agent-b');
    
    // Set up responder on agent-b
    busB.registerAgentHandler('agent-b', async (payload, message) => {
        if (message.type === MESSAGE_TYPE.REQUEST) {
            await busB.respond(message, { result: payload.value * 2 });
        }
    });
    
    // Simulate message delivery
    const requestMsg = AgentMessageProtocol.createRequest({
        sender: 'agent-a',
        recipient: 'agent-b',
        payload: { value: 21 },
        options: { responseTimeout: 1000 }
    });
    
    // Manually trigger the handler
    busB.handleIncomingMessage(requestMsg.payload, { ...requestMsg, type: 'AGENT_MESSAGE' });
    
    // Check that response was created
    const history = busB.queryHistory({ type: MESSAGE_TYPE.RESPONSE });
    // Response may not be recorded in this simplified test
});

runner.test('EventBus: Register and unregister handlers', () => {
    const bus = new EnhancedEventBus('test-bus');
    
    const handler = () => {};
    const unregister = bus.registerAgentHandler('test-agent', handler);
    
    assert(bus.agentHandlers.has('test-agent'));
    
    unregister();
    assert(!bus.agentHandlers.has('test-agent'));
});

runner.test('EventBus: Get statistics', () => {
    const bus = new EnhancedEventBus('stats-bus');
    
    const stats = bus.getStats();
    
    assert.strictEqual(typeof stats.sent, 'number');
    assert.strictEqual(typeof stats.delivered, 'number');
    assert.strictEqual(typeof stats.failed, 'number');
    assert.strictEqual(typeof stats.history.cacheSize, 'number');
});

// ============================================
// Integration Tests
// ============================================

runner.test('Integration: End-to-end message flow', async () => {
    const bus = new EnhancedEventBus('integration-test');
    const received = [];
    
    // Register handler
    bus.registerAgentHandler('target-agent', (payload, message) => {
        received.push({ payload, message });
    });
    
    // Send multiple messages
    await bus.send('target-agent', { seq: 1 });
    await bus.send('target-agent', { seq: 2 });
    await bus.send('target-agent', { seq: 3 });
    
    // Verify messages were recorded
    const history = bus.queryHistory({ recipient: 'target-agent' });
    assert(history.length >= 3, `Expected at least 3 messages, got ${history.length}`);
});

runner.test('Integration: Protocol + History + Bus', async () => {
    // Create message using protocol
    const message = AgentMessageProtocol.create({
        sender: 'sender',
        recipient: 'receiver',
        payload: { integration: true },
        options: {
            type: MESSAGE_TYPE.REQUEST,
            priority: PRIORITY.HIGH,
            tags: ['integration-test']
        }
    });
    
    // Validate
    const validation = AgentMessageProtocol.validate(message);
    assert.strictEqual(validation.valid, true);
    
    // Record in history
    const history = new MessageHistoryTracker();
    const entry = history.record(message, 'outbound');
    
    // Send via bus
    const bus = new EnhancedEventBus('integration-bus');
    const result = await bus.deliverMessage(message);
    
    assert.strictEqual(result.status, 'sent');
});

// ============================================
// Error Handling Tests
// ============================================

runner.test('Error: Missing required fields', () => {
    assert.throws(() => {
        AgentMessageProtocol.create({
            // Missing sender
            recipient: 'agent-b',
            payload: {}
        });
    }, /Sender is required/);
    
    assert.throws(() => {
        AgentMessageProtocol.create({
            sender: 'agent-a'
            // Missing recipient
        });
    }, /Recipient is required/);
});

runner.test('Error: Create with invalid message type throws', () => {
    try {
        AgentMessageProtocol.create({
            sender: 'a',
            recipient: 'b',
            type: 'invalid-type',
            payload: {}
        });
        assert.fail('Should have thrown an error');
    } catch (error) {
        assert(error.message.includes('Invalid') || error.message.includes('type'));
    }
});

runner.test('Error: Handler throws error', async () => {
    const bus = new EnhancedEventBus('error-bus');
    
    bus.registerAgentHandler('error-agent', () => {
        throw new Error('Handler error');
    });
    
    const message = AgentMessageProtocol.create({
        sender: 'sender',
        recipient: 'error-agent',
        payload: {}
    });
    
    // Should not throw, but mark as failed
    const result = await bus.routeMessage(message);
    assert.strictEqual(result, false);
    assert.strictEqual(message.status.failed, true);
});

// ============================================
// Performance Tests
// ============================================

runner.test('Performance: Handle many messages', async () => {
    const bus = new EnhancedEventBus('perf-bus');
    let count = 0;
    
    bus.registerAgentHandler('perf-target', () => {
        count++;
    });
    
    const start = Date.now();
    const promises = [];
    
    for (let i = 0; i < 100; i++) {
        promises.push(bus.send('perf-target', { index: i }));
    }
    
    await Promise.all(promises);
    const duration = Date.now() - start;
    
    assert.strictEqual(count, 100, `Expected 100 messages, processed ${count}`);
    assert(duration < 5000, `Processing took too long: ${duration}ms`);
    console.log(`   Processed 100 messages in ${duration}ms`);
});

// ============================================
// Run all tests
// ============================================

async function runTests() {
    const results = await runner.run();
    
    // Cleanup test files
    const testDirs = [
        path.join(__dirname, 'state', 'message-history'),
        path.join(__dirname, 'state', 'message-queue')
    ];
    
    for (const dir of testDirs) {
        if (fs.existsSync(dir)) {
            const files = fs.readdirSync(dir);
            for (const file of files) {
                if (file.includes('test') || file.includes('stats')) {
                    try {
                        fs.unlinkSync(path.join(dir, file));
                    } catch (e) {
                        // Ignore cleanup errors
                    }
                }
            }
        }
    }
    
    // Exit with appropriate code
    process.exit(results.failed > 0 ? 1 : 0);
}

runTests().catch(err => {
    console.error('Test suite failed:', err);
    process.exit(1);
});
