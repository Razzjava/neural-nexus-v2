#!/usr/bin/env node
// Circuit Breaker implementation for API resilience

class CircuitBreaker {
    constructor(name, options = {}) {
        this.name = name;
        this.failureThreshold = options.failureThreshold || 5;
        this.resetTimeout = options.resetTimeout || 60000;
        this.halfOpenMaxCalls = options.halfOpenMaxCalls || 3;
        
        this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
        this.failures = 0;
        this.successes = 0;
        this.lastFailureTime = null;
        this.metrics = {
            totalCalls: 0,
            failures: 0,
            successes: 0,
            lastError: null
        };
    }

    async execute(fn, ...args) {
        this.checkState();
        
        if (this.state === 'OPEN') {
            throw new CircuitBreakerError(
                `Circuit breaker OPEN for ${this.name}`,
                this.lastFailureTime
            );
        }

        this.metrics.totalCalls++;

        try {
            const result = await fn(...args);
            this.onSuccess();
            return result;
        } catch (err) {
            this.onFailure(err);
            throw err;
        }
    }

    checkState() {
        if (this.state === 'OPEN') {
            const timeSinceLastFailure = Date.now() - this.lastFailureTime;
            if (timeSinceLastFailure > this.resetTimeout) {
                this.log('Transitioning to HALF_OPEN');
                this.state = 'HALF_OPEN';
                this.failures = 0;
                this.successes = 0;
            }
        }
    }

    onSuccess() {
        this.metrics.successes++;
        
        if (this.state === 'HALF_OPEN') {
            this.successes++;
            if (this.successes >= this.halfOpenMaxCalls) {
                this.log('Closing circuit - recovered');
                this.state = 'CLOSED';
                this.failures = 0;
                this.successes = 0;
            }
        } else {
            this.failures = 0;
        }
    }

    onFailure(err) {
        this.metrics.failures++;
        this.metrics.lastError = err.message;
        this.failures++;
        this.lastFailureTime = Date.now();

        if (this.state === 'HALF_OPEN') {
            this.log('Opening circuit - failure in HALF_OPEN');
            this.state = 'OPEN';
        } else if (this.failures >= this.failureThreshold) {
            this.log(`Opening circuit - ${this.failures} failures`);
            this.state = 'OPEN';
        }
    }

    log(msg) {
        console.log(`[CircuitBreaker:${this.name}] ${msg} (state: ${this.state})`);
    }

    getState() {
        return {
            name: this.name,
            state: this.state,
            failures: this.failures,
            metrics: this.metrics,
            lastFailureTime: this.lastFailureTime
        };
    }
}

class CircuitBreakerError extends Error {
    constructor(message, lastFailureTime) {
        super(message);
        this.name = 'CircuitBreakerError';
        this.lastFailureTime = lastFailureTime;
    }
}

// Pre-configured breakers for common services
const breakers = {
    hackernews: new CircuitBreaker('hackernews', {
        failureThreshold: 3,
        resetTimeout: 300000 // 5 minutes
    }),
    github: new CircuitBreaker('github', {
        failureThreshold: 5,
        resetTimeout: 600000 // 10 minutes
    }),
    telegram: new CircuitBreaker('telegram', {
        failureThreshold: 10,
        resetTimeout: 120000 // 2 minutes
    }),
    remotion: new CircuitBreaker('remotion', {
        failureThreshold: 2,
        resetTimeout: 600000 // 10 minutes
    })
};

module.exports = { CircuitBreaker, CircuitBreakerError, breakers };
