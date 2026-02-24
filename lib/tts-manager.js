#!/usr/bin/env node
// TTS Manager - Multi-engine text-to-speech with fallback

const { exec } = require('child_exec');
const { promisify } = require('util');
const fs = require('fs').promises;
const path = require('path');
const { logger } = require('./logger');

const execAsync = promisify(exec);

class TTSManager {
    constructor() {
        this.engines = [
            {
                name: 'piper',
                priority: 1,
                timeout: 10000,
                enabled: true,
                model: '/tmp/piper/piper/en_US-lessac-medium.onnx'
            },
            {
                name: 'espeak',
                priority: 2,
                timeout: 5000,
                enabled: true
            },
            {
                name: 'coqui',
                priority: 3,
                timeout: 15000,
                enabled: true
            }
        ];
        
        this.tempDir = '/tmp/tts-output';
        this.ensureTempDir();
    }

    async ensureTempDir() {
        try {
            await fs.mkdir(this.tempDir, { recursive: true });
        } catch (err) {
            logger.error('Failed to create TTS temp dir', { error: err.message });
        }
    }

    async generate(text, options = {}) {
        const engines = options.engines || this.getEnabledEngines();
        const outputFile = options.outputFile || path.join(this.tempDir, `tts_${Date.now()}.ogg`);

        for (const engine of engines) {
            try {
                logger.info(`Trying TTS engine: ${engine.name}`, { text: text.substring(0, 50) });
                
                const result = await this.generateWithEngine(engine, text, outputFile);
                
                // Validate output
                if (await this.validateOutput(result)) {
                    logger.info(`TTS success with ${engine.name}`);
                    return result;
                }
                
                logger.warn(`TTS validation failed for ${engine.name}, trying next...`);
            } catch (err) {
                logger.warn(`TTS engine ${engine.name} failed`, { error: err.message });
                continue;
            }
        }

        throw new Error('All TTS engines failed');
    }

    async generateWithEngine(engine, text, outputFile) {
        const wavFile = outputFile.replace('.ogg', '.wav');
        
        switch(engine.name) {
            case 'piper':
                return this.generatePiper(engine, text, wavFile, outputFile);
            case 'espeak':
                return this.generateEspeak(text, wavFile, outputFile);
            case 'coqui':
                return this.generateCoqui(text, wavFile, outputFile);
            default:
                throw new Error(`Unknown TTS engine: ${engine.name}`);
        }
    }

    async generatePiper(engine, text, wavFile, oggFile) {
        // Write text to temp file
        const textFile = path.join(this.tempDir, `input_${Date.now()}.txt`);
        await fs.writeFile(textFile, text);

        try {
            // Generate with piper
            await execAsync(
                `piper --model "${engine.model}" --output_file "${wavFile}" < "${textFile}"`,
                { timeout: 10000 }
            );

            // Convert to OGG
            await this.convertToOgg(wavFile, oggFile);

            return oggFile;
        } finally {
            // Cleanup
            try { await fs.unlink(textFile); } catch {}
            try { await fs.unlink(wavFile); } catch {}
        }
    }

    async generateEspeak(text, wavFile, oggFile) {
        // Generate with espeak
        await execAsync(
            `espeak -v en-us -w "${wavFile}" "${text.replace(/"/g, '\\"')}"`,
            { timeout: 5000 }
        );

        // Convert to OGG
        await this.convertToOgg(wavFile, oggFile);

        // Cleanup
        try { await fs.unlink(wavFile); } catch {}

        return oggFile;
    }

    async generateCoqui(text, wavFile, oggFile) {
        // Generate with Coqui TTS (open source)
        await execAsync(
            `tts --model_name tts_models/en/ljspeech/tacotron2-DDC --out_path "${wavFile}" --text "${text.replace(/"/g, '\\"')}"`,
            { timeout: 15000 }
        );

        // Convert to OGG
        await this.convertToOgg(wavFile, oggFile);

        // Cleanup
        try { await fs.unlink(wavFile); } catch {}

        return oggFile;
    }

    async convertToOgg(inputFile, outputFile) {
        await execAsync(
            `ffmpeg -y -i "${inputFile}" -c:a libopus -b:a 32k "${outputFile}"`,
            { timeout: 10000 }
        );
    }

    async validateOutput(filePath) {
        try {
            const stats = await fs.stat(filePath);
            
            // Check file exists and has content
            if (!stats.isFile() || stats.size === 0) {
                logger.warn('TTS output validation failed: empty file');
                return false;
            }

            // Check minimum size (1KB)
            if (stats.size < 1024) {
                logger.warn('TTS output validation failed: file too small', { size: stats.size });
                return false;
            }

            // Check maximum size (10MB)
            if (stats.size > 10 * 1024 * 1024) {
                logger.warn('TTS output validation failed: file too large', { size: stats.size });
                return false;
            }

            // Verify it's a valid OGG file
            const header = await fs.readFile(filePath, { length: 4 });
            const isOgg = header.toString('hex').startsWith('4f6767'); // "OggS"
            
            if (!isOgg) {
                logger.warn('TTS output validation failed: not valid OGG');
                return false;
            }

            return true;
        } catch (err) {
            logger.error('TTS validation error', { error: err.message });
            return false;
        }
    }

    getEnabledEngines() {
        return this.engines
            .filter(e => e.enabled)
            .sort((a, b) => a.priority - b.priority);
    }

    async healthCheck() {
        const results = {};
        
        for (const engine of this.engines) {
            try {
                const testFile = path.join(this.tempDir, `health_${engine.name}.ogg`);
                await this.generateWithEngine(engine, 'Test', testFile);
                await fs.unlink(testFile);
                results[engine.name] = 'healthy';
            } catch (err) {
                results[engine.name] = `unhealthy: ${err.message}`;
            }
        }
        
        return results;
    }
}

module.exports = { TTSManager };
