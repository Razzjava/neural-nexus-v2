#!/usr/bin/env node
/**
 * claw-cleanup-agent.js
 * 
 * Daily cleanup agent for the Neural Nexus system.
 * Removes video files after they've been sent to Telegram.
 * Runs at end of day (11:59 PM) to clean up processed content.
 */

const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
  videosDir: '/root/.openclaw/workspace/agents-output/videos',
  logsDir: '/root/.openclaw/workspace/agents-output/logs',
  retentionDays: 1, // Keep videos for 1 day before cleanup
  dryRun: process.argv.includes('--dry-run'),
  verbose: process.argv.includes('--verbose')
};

// Utility: Log with timestamp
function log(message, type = 'info') {
  const timestamp = new Date().toISOString();
  const prefix = type === 'error' ? '❌' : type === 'warn' ? '⚠️' : '✅';
  console.log(`${prefix} [${timestamp}] ${message}`);
}

// Utility: Get file age in days
function getFileAgeDays(filePath) {
  const stats = fs.statSync(filePath);
  const now = new Date();
  const fileTime = new Date(stats.mtime);
  const diffMs = now - fileTime;
  return diffMs / (1000 * 60 * 60 * 24);
}

// Utility: Format bytes to human readable
function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Main cleanup function
async function cleanupVideos() {
  log('🧹 Starting daily video cleanup...', 'info');
  
  const results = {
    scanned: 0,
    removed: 0,
    kept: 0,
    errors: 0,
    spaceFreed: 0,
    filesRemoved: []
  };

  try {
    // Ensure videos directory exists
    if (!fs.existsSync(CONFIG.videosDir)) {
      log(`Videos directory doesn't exist: ${CONFIG.videosDir}`, 'warn');
      return results;
    }

    // Read videos directory
    const files = fs.readdirSync(CONFIG.videosDir);
    const videoFiles = files.filter(f => f.endsWith('.mp4') || f.endsWith('.mov') || f.endsWith('.webm'));
    
    results.scanned = videoFiles.length;
    log(`Found ${videoFiles.length} video files to check`, 'info');

    for (const file of videoFiles) {
      const filePath = path.join(CONFIG.videosDir, file);
      
      try {
        const ageDays = getFileAgeDays(filePath);
        const stats = fs.statSync(filePath);
        
        if (CONFIG.verbose) {
          log(`Checking: ${file} (${formatBytes(stats.size)}, ${ageDays.toFixed(1)} days old)`);
        }

        // Remove files older than retention period
        if (ageDays >= CONFIG.retentionDays) {
          if (CONFIG.dryRun) {
            log(`[DRY RUN] Would remove: ${file} (${formatBytes(stats.size)})`, 'warn');
          } else {
            fs.unlinkSync(filePath);
            log(`Removed: ${file} (${formatBytes(stats.size)})`, 'info');
          }
          results.removed++;
          results.spaceFreed += stats.size;
          results.filesRemoved.push(file);
        } else {
          results.kept++;
          if (CONFIG.verbose) {
            log(`Kept (too recent): ${file}`, 'info');
          }
        }
      } catch (err) {
        log(`Error processing ${file}: ${err.message}`, 'error');
        results.errors++;
      }
    }

    // Clean up any temp render files in remotion folder
    await cleanupTempRenders();

  } catch (err) {
    log(`Cleanup failed: ${err.message}`, 'error');
    results.errors++;
  }

  return results;
}

// Clean up temporary render files
async function cleanupTempRenders() {
  const remotionDir = '/root/.openclaw/workspace/remotion';
  
  try {
    if (!fs.existsSync(remotionDir)) return;
    
    const files = fs.readdirSync(remotionDir);
    const tempFiles = files.filter(f => 
      f.includes('-fixed') || 
      f.includes('-v2') || 
      f.includes('-temp') ||
      f.endsWith('.mp4') && !f.includes('Root')
    );

    for (const file of tempFiles) {
      const filePath = path.join(remotionDir, file);
      try {
        const stats = fs.statSync(filePath);
        if (CONFIG.dryRun) {
          log(`[DRY RUN] Would remove temp: ${file}`, 'warn');
        } else {
          fs.unlinkSync(filePath);
          log(`Removed temp file: ${file}`, 'info');
        }
      } catch (err) {
        // Ignore errors for temp files
      }
    }
  } catch (err) {
    // Silently ignore
  }
}

// Generate cleanup report
function generateReport(results) {
  const report = {
    timestamp: new Date().toISOString(),
    agent: 'claw-cleanup',
    type: 'daily-cleanup',
    summary: {
      filesScanned: results.scanned,
      filesRemoved: results.removed,
      filesKept: results.kept,
      errors: results.errors,
      spaceFreed: formatBytes(results.spaceFreed)
    },
    filesRemoved: results.filesRemoved,
    dryRun: CONFIG.dryRun
  };

  // Save report
  const reportPath = path.join(CONFIG.logsDir, `cleanup-${new Date().toISOString().split('T')[0]}.json`);
  
  try {
    if (!fs.existsSync(CONFIG.logsDir)) {
      fs.mkdirSync(CONFIG.logsDir, { recursive: true });
    }
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    log(`Report saved: ${reportPath}`, 'info');
  } catch (err) {
    log(`Failed to save report: ${err.message}`, 'error');
  }

  return report;
}

// Send notification to Telegram (optional)
async function notifyTelegram(report) {
  // This would integrate with your message tool
  // For now, just log the summary
  log('\n📊 Cleanup Summary:', 'info');
  log(`   Files scanned: ${report.summary.filesScanned}`, 'info');
  log(`   Files removed: ${report.summary.filesRemoved}`, 'info');
  log(`   Files kept: ${report.summary.filesKept}`, 'info');
  log(`   Space freed: ${report.summary.spaceFreed}`, 'info');
  if (report.summary.errors > 0) {
    log(`   Errors: ${report.summary.errors}`, 'warn');
  }
}

// Main execution
async function main() {
  log('🚀 Claw Cleanup Agent starting...', 'info');
  
  if (CONFIG.dryRun) {
    log('⚠️  DRY RUN MODE - No files will actually be deleted', 'warn');
  }

  const results = await cleanupVideos();
  const report = generateReport(results);
  await notifyTelegram(report);

  log('✅ Cleanup complete!', 'info');
  
  // Exit with appropriate code
  process.exit(results.errors > 0 ? 1 : 0);
}

// Run if called directly
if (require.main === module) {
  main().catch(err => {
    log(`Fatal error: ${err.message}`, 'error');
    process.exit(1);
  });
}

module.exports = { cleanupVideos, generateReport };
