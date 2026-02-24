#!/usr/bin/env node
// Voice Library - Pre-generated manifestation cache

const fs = require('fs').promises;
const path = require('path');
const { TTSManager } = require('./tts-manager');
const { logger } = require('./logger');

class VoiceLibrary {
    constructor() {
        this.libraryDir = path.join(__dirname, '..', 'manifestations', 'voices');
        this.manifestationsDir = path.join(__dirname, '..', 'manifestations');
        this.tts = new TTSManager();
        this.cache = new Map();
        
        this.themes = {
            morning: {
                scripts: [
                    "Today is your day. Everything you need is already within you. Step forward with confidence.",
                    "You are worthy of every dream you hold. The universe conspires in your favor today.",
                    "Your potential is infinite. Today you choose greatness, abundance, and joy.",
                    "You wake up powerful. You move through this day with purpose and clarity.",
                    "Success is your natural state. Today you attract opportunities effortlessly."
                ]
            },
            abundance: {
                scripts: [
                    "Money flows to you easily and frequently. You are a magnet for wealth.",
                    "Abundance is your birthright. You deserve unlimited prosperity.",
                    "Wealth surrounds you. Every dollar you spend returns to you multiplied.",
                    "You are financially free. Your bank account grows while you sleep.",
                    "Prosperity follows you everywhere. You attract riches in expected and unexpected ways."
                ]
            },
            success: {
                scripts: [
                    "You are unstoppable. Every goal you set becomes your reality.",
                    "Success comes naturally to you. You achieve what others only dream of.",
                    "You are a winner. Victory is your default state in everything you do.",
                    "Your success inspires others. You lead by example and lift everyone around you.",
                    "You turn obstacles into stepping stones. Every challenge makes you stronger."
                ]
            },
            confidence: {
                scripts: [
                    "You trust yourself completely. Your intuition guides you perfectly.",
                    "You speak with authority. People listen when you share your vision.",
                    "You are enough exactly as you are. Your presence commands respect.",
                    "Fear has no power over you. You act boldly and create your reality.",
                    "You radiate self-assurance. Confidence flows through every cell of your being."
                ]
            },
            gratitude: {
                scripts: [
                    "You are deeply grateful for all you have. Your gratitude multiplies your blessings.",
                    "Thank you flows from your heart constantly. You see miracles everywhere.",
                    "Your appreciation attracts more to appreciate. Life gifts you abundantly.",
                    "You focus on what's working. Your positive energy transforms everything.",
                    "Gratitude is your superpower. You attract joy by acknowledging joy."
                ]
            },
            health: {
                scripts: [
                    "Your body is strong and vibrant. You radiate health and vitality.",
                    "Every cell in your body works perfectly. You heal quickly and completely.",
                    "You choose wellness in every moment. Your energy increases daily.",
                    "Your mind and body are in perfect harmony. You feel better than ever.",
                    "Health is your natural state. You nourish yourself with love and care."
                ]
            }
        };
    }

    async initialize() {
        logger.info('Initializing voice library...');
        
        // Create directories
        await fs.mkdir(this.libraryDir, { recursive: true });
        
        // Check existing cache
        await this.loadCache();
        
        // Generate missing voices
        await this.generateMissing();
        
        logger.info('Voice library initialized', { 
            totalFiles: this.cache.size 
        });
    }

    async loadCache() {
        try {
            const files = await fs.readdir(this.libraryDir);
            
            for (const file of files) {
                if (file.endsWith('.ogg')) {
                    const theme = file.split('_')[0];
                    if (!this.cache.has(theme)) {
                        this.cache.set(theme, []);
                    }
                    this.cache.get(theme).push(path.join(this.libraryDir, file));
                }
            }
        } catch (err) {
            logger.warn('Failed to load voice cache', { error: err.message });
        }
    }

    async generateMissing() {
        for (const [theme, data] of Object.entries(this.themes)) {
            const existing = this.cache.get(theme) || [];
            const needed = data.scripts.length - existing.length;
            
            if (needed > 0) {
                logger.info(`Generating ${needed} voices for theme: ${theme}`);
                
                for (let i = existing.length; i < data.scripts.length; i++) {
                    try {
                        const outputFile = path.join(
                            this.libraryDir, 
                            `${theme}_${i + 1}.ogg`
                        );
                        
                        await this.tts.generate(data.scripts[i], { outputFile });
                        
                        if (!this.cache.has(theme)) {
                            this.cache.set(theme, []);
                        }
                        this.cache.get(theme).push(outputFile);
                        
                        logger.debug(`Generated voice: ${outputFile}`);
                    } catch (err) {
                        logger.error(`Failed to generate voice for ${theme}_${i}`, {
                            error: err.message
                        });
                    }
                }
            }
        }
    }

    getRandomVoice(theme = null) {
        // If theme specified, use it
        if (theme && this.cache.has(theme)) {
            const voices = this.cache.get(theme);
            return voices[Math.floor(Math.random() * voices.length)];
        }
        
        // Otherwise pick random theme
        const themes = Array.from(this.cache.keys());
        const randomTheme = themes[Math.floor(Math.random() * themes.length)];
        const voices = this.cache.get(randomTheme);
        
        return voices[Math.floor(Math.random() * voices.length)];
    }

    getVoiceForTime(timeOfDay) {
        const hour = new Date(timeOfDay).getHours();
        
        if (hour >= 5 && hour < 12) {
            return this.getRandomVoice('morning');
        } else if (hour >= 12 && hour < 18) {
            return this.getRandomVoice('abundance');
        } else {
            return this.getRandomVoice('gratitude');
        }
    }

    getStats() {
        const stats = {};
        for (const [theme, voices] of this.cache) {
            stats[theme] = voices.length;
        }
        return stats;
    }

    async regenerateCache() {
        logger.info('Regenerating voice cache...');
        
        // Clear existing
        this.cache.clear();
        
        try {
            const files = await fs.readdir(this.libraryDir);
            for (const file of files) {
                await fs.unlink(path.join(this.libraryDir, file));
            }
        } catch (err) {
            logger.warn('Failed to clear cache', { error: err.message });
        }
        
        // Regenerate
        await this.generateMissing();
        
        logger.info('Voice cache regenerated');
    }
}

module.exports = { VoiceLibrary };
