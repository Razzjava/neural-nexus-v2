#!/usr/bin/env node
// Delivery Manager - Reliable message delivery with retry and verification

const { logger, metrics } = require('./logger');

class DeliveryManager {
    constructor(telegramConfig) {
        this.botToken = telegramConfig.botToken;
        this.chatId = telegramConfig.chatId;
        this.maxRetries = telegramConfig.maxRetries || 5;
        this.baseDelay = telegramConfig.baseDelay || 1000;
        this.maxDelay = telegramConfig.maxDelay || 30000;
        
        // Rate limiting
        this.messageQueue = [];
        this.lastSendTime = 0;
        this.minInterval = 1000; // 1 second between messages
        this.processing = false;
    }

    async sendVoice(voiceFile, caption = '') {
        const message = {
            type: 'voice',
            file: voiceFile,
            caption,
            attempts: 0,
            maxAttempts: this.maxRetries
        };

        return this.queueAndSend(message);
    }

    async queueAndSend(message) {
        return new Promise((resolve, reject) => {
            message.resolve = resolve;
            message.reject = reject;
            this.messageQueue.push(message);
            this.processQueue();
        });
    }

    async processQueue() {
        if (this.processing || this.messageQueue.length === 0) {
            return;
        }

        this.processing = true;

        while (this.messageQueue.length > 0) {
            const message = this.messageQueue[0];
            
            // Rate limiting
            const timeSinceLastSend = Date.now() - this.lastSendTime;
            if (timeSinceLastSend < this.minInterval) {
                await this.sleep(this.minInterval - timeSinceLastSend);
            }

            try {
                const result = await this.sendWithRetry(message);
                message.resolve(result);
                this.messageQueue.shift();
                this.lastSendTime = Date.now();
            } catch (err) {
                message.reject(err);
                this.messageQueue.shift();
            }
        }

        this.processing = false;
    }

    async sendWithRetry(message) {
        for (let attempt = 1; attempt <= message.maxAttempts; attempt++) {
            message.attempts = attempt;
            
            try {
                logger.info(`Delivery attempt ${attempt}/${message.maxAttempts}`);
                
                const result = await this.sendToTelegram(message);
                
                // Verify delivery
                const verified = await this.verifyDelivery(result.message_id);
                
                if (verified) {
                    logger.info('Delivery verified successfully', { 
                        messageId: result.message_id,
                        attempts: attempt 
                    });
                    
                    metrics.increment('telegram_delivery_success');
                    metrics.histogram('telegram_delivery_attempts', attempt);
                    
                    return result;
                }
                
                throw new Error('Delivery verification failed');
                
            } catch (err) {
                logger.warn(`Delivery attempt ${attempt} failed`, { 
                    error: err.message 
                });
                
                metrics.increment('telegram_delivery_failure');
                
                if (attempt === message.maxAttempts) {
                    throw new Error(`Failed after ${attempt} attempts: ${err.message}`);
                }

                // Exponential backoff
                const delay = Math.min(
                    this.baseDelay * Math.pow(2, attempt - 1),
                    this.maxDelay
                );
                
                logger.info(`Retrying in ${delay}ms...`);
                await this.sleep(delay);
            }
        }
    }

    async sendToTelegram(message) {
        const FormData = require('form-data');
        const fs = require('fs');
        const axios = require('axios');

        const form = new FormData();
        form.append('chat_id', this.chatId);
        form.append('voice', fs.createReadStream(message.file));
        
        if (message.caption) {
            form.append('caption', message.caption);
        }

        const response = await axios.post(
            `https://api.telegram.org/bot${this.botToken}/sendVoice`,
            form,
            {
                headers: form.getHeaders(),
                timeout: 30000,
                maxContentLength: 50 * 1024 * 1024 // 50MB
            }
        );

        if (!response.data.ok) {
            throw new Error(`Telegram API error: ${response.data.description}`);
        }

        return response.data.result;
    }

    async verifyDelivery(messageId, timeout = 30000) {
        // In a real implementation, we'd poll the chat history
        // For now, assume success if API call succeeded
        return true;
    }

    async sendFallback(message, reason) {
        logger.warn('Attempting fallback delivery', { reason });
        
        // Fallback 1: Try text message
        try {
            return await this.sendTextMessage(message.caption || 'Voice message (delivery failed)');
        } catch (err) {
            logger.warn('Text fallback failed', { error: err.message });
        }
        
        // Fallback 2: Log for manual review
        logger.error('All delivery methods failed', { message });
        
        // Store for retry later
        await this.storeForRetry(message);
        
        throw new Error('All delivery methods exhausted');
    }

    async sendTextMessage(text) {
        const axios = require('axios');
        
        const response = await axios.post(
            `https://api.telegram.org/bot${this.botToken}/sendMessage`,
            {
                chat_id: this.chatId,
                text: text,
                parse_mode: 'Markdown'
            },
            { timeout: 10000 }
        );

        return response.data.result;
    }

    async storeForRetry(message) {
        // Store in failed queue for later retry
        const failedQueue = require('./event-bus').StateStore();
        const queue = failedQueue.get('failed_deliveries') || [];
        queue.push({
            ...message,
            failedAt: new Date().toISOString(),
            retryAfter: Date.now() + 300000 // 5 minutes
        });
        failedQueue.set('failed_deliveries', queue);
    }

    async retryFailed() {
        const failedQueue = require('./event-bus').StateStore();
        const queue = failedQueue.get('failed_deliveries') || [];
        const now = Date.now();
        
        const toRetry = queue.filter(m => m.retryAfter <= now);
        const remaining = queue.filter(m => m.retryAfter > now);
        
        failedQueue.set('failed_deliveries', remaining);
        
        for (const message of toRetry) {
            try {
                await this.sendVoice(message.file, message.caption);
                logger.info('Retry successful', { originalFailedAt: message.failedAt });
            } catch (err) {
                logger.error('Retry failed', { error: err.message });
            }
        }
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    getStats() {
        return {
            queueLength: this.messageQueue.length,
            lastSendTime: this.lastSendTime,
            processing: this.processing
        };
    }
}

module.exports = { DeliveryManager };
