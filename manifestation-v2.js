#!/usr/bin/env node
// Enhanced Manifestation Agent v2 - Reliable autonomous voice delivery

const { TTSManager } = require('./lib/tts-manager');
const { DeliveryManager } = require('./lib/delivery-manager');
const { VoiceLibrary } = require('./lib/voice-library');
const { logger, metrics } = require('./lib/logger');
const { killSwitch } = require('./lib/kill-switch');

class ManifestationAgentV2 {
    constructor(config = {}) {
        this.name = 'ManifestationAgentV2';
        this.config = {
            telegramGroup: config.telegramGroup || '-5297940191',
            botToken: config.botToken || process.env.TELEGRAM_BOT_TOKEN,
            intervalMinutes: config.intervalMinutes || 120,
            ...config
        };
        
        this.tts = new TTSManager();
        this.delivery = new DeliveryManager({
            botToken: this.config.botToken,
            chatId: this.config.telegramGroup,
            maxRetries: 5,
            baseDelay: 1000
        });
        this.library = new VoiceLibrary();
        
        this.running = false;
        this.stats = {
            totalSent: 0,
            totalFailed: 0,
            lastSent: null
        };
    }

    async start() {
        logger.info('╔══════════════════════════════════════════════════╗');
        logger.info('║  Manifestation Agent v2 Starting                 ║');
        logger.info('╚══════════════════════════════════════════════════╝');

        // Check kill switch
        if (killSwitch.isActive()) {
            logger.error('System halted by kill switch');
            return;
        }

        // Initialize voice library
        await this.library.initialize();
        logger.info('✅ Voice library loaded', { stats: this.library.getStats() });

        // Test TTS engines
        const ttsHealth = await this.tts.healthCheck();
        logger.info('TTS health check', ttsHealth);

        // Start main loop
        this.running = true;
        this.runLoop();
        
        // Start retry loop for failed deliveries
        this.startRetryLoop();
        
        // Start metrics reporting
        this.startMetricsLoop();

        logger.info('✅ Manifestation agent running', {
            interval: `${this.config.intervalMinutes} minutes`
        });
    }

    async runLoop() {
        if (!this.running) return;

        try {
            await this.sendManifestation();
        } catch (err) {
            logger.error('Manifestation failed', { error: err.message });
            metrics.increment('manifestation_failures');
        }

        // Schedule next
        setTimeout(() => this.runLoop(), this.config.intervalMinutes * 60 * 1000);
    }

    async sendManifestation() {
        logger.info('Preparing manifestation...');

        // Check kill switch
        killSwitch.check();

        // Get voice (from library or generate)
        let voiceFile;
        try {
            // Try pre-generated library first
            voiceFile = this.library.getVoiceForTime(new Date());
            logger.info('Using pre-generated voice', { file: voiceFile });
        } catch (err) {
            // Fallback: generate fresh
            logger.warn('Library voice failed, generating fresh', { error: err.message });
            
            const script = this.generateScript();
            voiceFile = await this.tts.generate(script);
            logger.info('Generated fresh voice', { file: voiceFile });
        }

        // Send with delivery manager
        const result = await this.delivery.sendVoice(
            voiceFile, 
            '🎯 Manifestation Reminder'
        );

        // Update stats
        this.stats.totalSent++;
        this.stats.lastSent = new Date().toISOString();
        
        metrics.increment('manifestations_sent');
        
        logger.info('✅ Manifestation delivered', {
            messageId: result.message_id,
            totalSent: this.stats.totalSent
        });

        return result;
    }

    generateScript() {
        const scripts = [
            "You are worthy of every dream you hold. The universe conspires in your favor.",
            "Abundance flows to you easily and frequently. You are a magnet for success.",
            "Today you choose greatness. Your potential is infinite.",
            "Everything you need is already within you. Step forward with confidence.",
            "You attract opportunities effortlessly. Success is your natural state."
        ];
        
        return scripts[Math.floor(Math.random() * scripts.length)];
    }

    startRetryLoop() {
        // Retry failed deliveries every 5 minutes
        setInterval(async () => {
            try {
                await this.delivery.retryFailed();
            } catch (err) {
                logger.error('Retry loop failed', { error: err.message });
            }
        }, 300000);
    }

    startMetricsLoop() {
        // Report stats every hour
        setInterval(() => {
            logger.info('Manifestation stats', this.stats);
            metrics.gauge('manifestations_total', this.stats.totalSent);
        }, 3600000);
    }

    async stop() {
        logger.info('Stopping manifestation agent...');
        this.running = false;
    }

    getStatus() {
        return {
            running: this.running,
            stats: this.stats,
            delivery: this.delivery.getStats(),
            library: this.library.getStats()
        };
    }
}

// CLI
if (require.main === module) {
    const agent = new ManifestationAgentV2();
    
    process.on('SIGINT', async () => {
        await agent.stop();
        process.exit(0);
    });

    agent.start().catch(err => {
        logger.error('Fatal error', { error: err.message });
        process.exit(1);
    });
}

module.exports = { ManifestationAgentV2 };
