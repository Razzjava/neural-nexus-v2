#!/usr/bin/env node

/**
 * Send Dynamic Manifestation Voice Reminder
 * 
 * Called by cron to send voice message using TTS tool
 */

const { execSync } = require('child_process');
const path = require('path');

const WORKSPACE = '/root/.openclaw/workspace/neural-nexus';
const TELEGRAM_GROUP = '-5297940191';

// Get random reminder from rotator
function getReminder() {
  const rotator = require(path.join(WORKSPACE, 'manifestation-rotator'));
  return rotator.getReminder();
}

// Main function
async function sendVoiceReminder() {
  console.log('🎯 Sending dynamic manifestation voice reminder...');
  
  const reminder = getReminder();
  console.log(`Selected: [${reminder.type}] ${reminder.text.substring(0, 50)}...`);
  
  // The tts tool will be called by the parent process
  // This script outputs the text for the tts tool to use
  console.log('REMINDER_TEXT:', reminder.text);
  
  return reminder.text;
}

// Run if called directly
if (require.main === module) {
  sendVoiceReminder().then(text => {
    console.log('\n✅ Ready for TTS:', text);
  }).catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
}

module.exports = { sendVoiceReminder };
