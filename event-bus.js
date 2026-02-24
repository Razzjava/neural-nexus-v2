// Simple file-based event bus for agent communication
// Production would use Redis, NATS, or similar

const fs = require('fs');
const path = require('path');

const EVENT_LOG = path.join(__dirname, 'state', 'event-log.jsonl');
const STATE_FILE = path.join(__dirname, 'state', 'system-state.json');

// Ensure state directory exists
if (!fs.existsSync(path.dirname(EVENT_LOG))) {
    fs.mkdirSync(path.dirname(EVENT_LOG), { recursive: true });
}

class EventBus {
    constructor(agentId) {
        this.agentId = agentId;
        this.lastEventId = 0;
        this.subscribers = new Map();
    }

    // Publish event to the bus
    publish(eventType, payload) {
        const event = {
            id: Date.now() + Math.random().toString(36).substr(2, 9),
            type: eventType,
            agent: this.agentId,
            timestamp: new Date().toISOString(),
            payload
        };

        // Append to log
        fs.appendFileSync(EVENT_LOG, JSON.stringify(event) + '\n');
        
        console.log(`[${this.agentId}] Published: ${eventType}`);
        return event.id;
    }

    // Subscribe to specific event types
    subscribe(eventTypes, handler) {
        const types = Array.isArray(eventTypes) ? eventTypes : [eventTypes];
        
        types.forEach(type => {
            if (!this.subscribers.has(type)) {
                this.subscribers.set(type, []);
            }
            this.subscribers.get(type).push(handler);
        });

        // Return unsubscribe function
        return () => {
            types.forEach(type => {
                const handlers = this.subscribers.get(type) || [];
                const idx = handlers.indexOf(handler);
                if (idx > -1) handlers.splice(idx, 1);
            });
        };
    }

    // Poll for new events (simple approach)
    poll() {
        if (!fs.existsSync(EVENT_LOG)) return;

        const lines = fs.readFileSync(EVENT_LOG, 'utf8').trim().split('\n');
        const newEvents = [];

        for (const line of lines) {
            try {
                const event = JSON.parse(line);
                // Use timestamp + random for ordering since id might not be numeric
                const eventOrder = new Date(event.timestamp).getTime();
                if (eventOrder > this.lastEventId && event.agent !== this.agentId) {
                    newEvents.push(event);
                    this.lastEventId = Math.max(this.lastEventId, eventOrder);
                }
            } catch (e) {
                // Skip malformed lines
            }
        }

        // Dispatch to subscribers
        for (const event of newEvents) {
            const handlers = this.subscribers.get(event.type) || [];
            handlers.forEach(h => {
                try {
                    h(event.payload, event);
                } catch (e) {
                    console.error(`[${this.agentId}] Handler error:`, e);
                }
            });
        }

        return newEvents;
    }
}

// State store for shared data
class StateStore {
    constructor() {
        this.cache = this.load();
    }

    load() {
        try {
            return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
        } catch {
            return {
                activeRenders: [],
                pendingScripts: [],
                publishedVideos: [],
                topicHistory: [],
                hookPerformance: {},
                componentRetention: {},
                contentGoals: { shortsPerDay: 3, longsPerWeek: 2 },
                qualityThreshold: 0.7
            };
        }
    }

    save() {
        fs.writeFileSync(STATE_FILE, JSON.stringify(this.cache, null, 2));
    }

    get(key) {
        return this.cache[key];
    }

    set(key, value) {
        this.cache[key] = value;
        this.save();
    }

    update(key, updater) {
        this.cache[key] = updater(this.cache[key]);
        this.save();
    }

    // Check if topic was recently covered
    wasTopicCovered(topic, days = 7) {
        const cutoff = Date.now() - (days * 24 * 60 * 60 * 1000);
        return this.cache.topicHistory.some(t => 
            t.topic.toLowerCase() === topic.toLowerCase() && 
            new Date(t.date).getTime() > cutoff
        );
    }

    // Record topic as covered
    recordTopic(topic, performance = null) {
        this.cache.topicHistory.push({
            topic,
            date: new Date().toISOString(),
            performance
        });
        this.save();
    }
}

module.exports = { EventBus, StateStore };
