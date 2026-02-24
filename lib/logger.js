#!/usr/bin/env node
// Structured Logger with metrics collection

const winston = require('winston');
const path = require('path');
const fs = require('fs');

// Ensure logs directory exists
const LOG_DIR = '/var/log/neural-nexus';
if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
}

// Create logger
const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
    ),
    defaultMeta: {
        service: 'neural-nexus',
        version: '1.0.0',
        hostname: require('os').hostname()
    },
    transports: [
        new winston.transports.File({
            filename: path.join(LOG_DIR, 'error.log'),
            level: 'error',
            maxsize: 10 * 1024 * 1024, // 10MB
            maxFiles: 5
        }),
        new winston.transports.File({
            filename: path.join(LOG_DIR, 'combined.log'),
            maxsize: 50 * 1024 * 1024, // 50MB
            maxFiles: 3
        })
    ]
});

// Add console in development
if (process.env.NODE_ENV !== 'production') {
    logger.add(new winston.transports.Console({
        format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
        )
    }));
}

// Metrics collector
class MetricsCollector {
    constructor() {
        this.metrics = {
            counters: {},
            gauges: {},
            histograms: {}
        };
        this.startTime = Date.now();
    }

    // Counter (only increases)
    increment(name, value = 1, labels = {}) {
        const key = this.key(name, labels);
        this.metrics.counters[key] = (this.metrics.counters[key] || 0) + value;
        
        logger.debug('Metric increment', { metric: name, value, labels });
    }

    // Gauge (can go up or down)
    gauge(name, value, labels = {}) {
        const key = this.key(name, labels);
        this.metrics.gauges[key] = value;
    }

    // Histogram (distribution of values)
    histogram(name, value, labels = {}) {
        const key = this.key(name, labels);
        if (!this.metrics.histograms[key]) {
            this.metrics.histograms[key] = [];
        }
        this.metrics.histograms[key].push(value);
        
        // Keep only last 1000 values
        if (this.metrics.histograms[key].length > 1000) {
            this.metrics.histograms[key].shift();
        }
    }

    // Timing helper
    async time(name, fn, labels = {}) {
        const start = Date.now();
        try {
            const result = await fn();
            this.histogram(name, Date.now() - start, labels);
            return result;
        } catch (err) {
            this.histogram(name + '_error', Date.now() - start, labels);
            throw err;
        }
    }

    key(name, labels) {
        const labelStr = Object.entries(labels)
            .map(([k, v]) => `${k}=${v}`)
            .join(',');
        return labelStr ? `${name}{${labelStr}}` : name;
    }

    // Get summary statistics
    getSummary() {
        const summary = {
            uptime: Date.now() - this.startTime,
            counters: this.metrics.counters,
            gauges: this.metrics.gauges,
            histograms: {}
        };

        // Calculate histogram stats
        for (const [key, values] of Object.entries(this.metrics.histograms)) {
            if (values.length === 0) continue;
            
            const sorted = [...values].sort((a, b) => a - b);
            summary.histograms[key] = {
                count: values.length,
                min: sorted[0],
                max: sorted[sorted.length - 1],
                mean: values.reduce((a, b) => a + b, 0) / values.length,
                p50: sorted[Math.floor(sorted.length * 0.5)],
                p95: sorted[Math.floor(sorted.length * 0.95)],
                p99: sorted[Math.floor(sorted.length * 0.99)]
            };
        }

        return summary;
    }

    // Export metrics for Prometheus
    toPrometheus() {
        let output = '';
        
        // Counters
        for (const [key, value] of Object.entries(this.metrics.counters)) {
            output += `# TYPE ${key} counter\n`;
            output += `${key} ${value}\n`;
        }
        
        // Gauges
        for (const [key, value] of Object.entries(this.metrics.gauges)) {
            output += `# TYPE ${key} gauge\n`;
            output += `${key} ${value}\n`;
        }
        
        return output;
    }
}

const metrics = new MetricsCollector();

module.exports = { logger, metrics };
