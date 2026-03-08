#!/usr/bin/env node

/**
 * Manifestation Agent - Real Operational Daemon
 * Handles goal tracking, vision boards, and daily affirmations for Raz
 */

const AgentBase = require('../agent-base');
const fs = require('fs');
const path = require('path');

class ManifestorAgent extends AgentBase {
  constructor() {
    super('manifestor', {
      name: 'Manifestation Agent',
      workInterval: 60 * 60 * 1000, // Check every hour
      defaultMetrics: {
        goalsTracked: 0,
        affirmationsDelivered: 0,
        visionBoardsUpdated: 0
      }
    });
    
    this.manifestDir = path.join('/root/.openclaw/workspace', 'manifestation');
    this.goalsFile = path.join(this.manifestDir, 'goals.json');
    this.visionsDir = path.join(this.manifestDir, 'visions');
    this.affirmationsFile = path.join(this.manifestDir, 'affirmations.json');
    
    [this.manifestDir, this.visionsDir].forEach(dir => {
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    });

    // Initialize default goals if none exist
    this.initializeGoals();
    this.initializeAffirmations();
  }

  initializeGoals() {
    if (!fs.existsSync(this.goalsFile)) {
      const defaultGoals = {
        user: 'Raz',
        createdAt: new Date().toISOString(),
        goals: [
          {
            id: 'goal-1',
            category: 'career',
            title: 'Transition to YouTube Content Creation',
            description: 'Build 3 successful YouTube channels',
            targetDate: '2026-12-31',
            status: 'active',
            milestones: [
              { id: 'm1', title: 'Launch Tech Advice channel', completed: false },
              { id: 'm2', title: 'Launch FIFA Clips channel', completed: false },
              { id: 'm3', title: 'Launch Manifestation channel', completed: false }
            ]
          },
          {
            id: 'goal-2',
            category: 'personal',
            title: 'Daily Meditation Practice',
            description: 'Meditate for 20 minutes every day',
            targetDate: '2026-12-31',
            status: 'active',
            milestones: [
              { id: 'm4', title: '30-day streak', completed: false },
              { id: 'm5', title: '90-day streak', completed: false }
            ]
          },
          {
            id: 'goal-3',
            category: 'wealth',
            title: 'Financial Independence',
            description: 'Generate $10K/month from content',
            targetDate: '2026-12-31',
            status: 'active',
            milestones: [
              { id: 'm6', title: 'First $1K month', completed: false },
              { id: 'm7', title: 'First $5K month', completed: false }
            ]
          }
        ]
      };
      fs.writeFileSync(this.goalsFile, JSON.stringify(defaultGoals, null, 2));
    }
  }

  initializeAffirmations() {
    if (!fs.existsSync(this.affirmationsFile)) {
      const affirmations = {
        daily: [
          "I am a successful content creator with millions of engaged viewers.",
          "My channels grow effortlessly every single day.",
          "I attract abundance and opportunities aligned with my purpose.",
          "My technical expertise combined with creativity creates unique value.",
          "I am consistent, dedicated, and passionate about my content.",
          "Brands seek me out for partnerships because of my authentic voice.",
          "My community trusts and values my recommendations.",
          "I transform complex tech concepts into engaging, accessible content.",
          "Every video I create reaches the people who need it most.",
          "I am living my dream life as a full-time creator."
        ],
        career: [
          "My transition from Pega developer to creator is seamless and successful.",
          "My CSSA certification gives me credibility in the tech space.",
          "5+ years of development experience makes my content authoritative.",
          "I am building something greater than any corporate job could offer."
        ],
        manifestation: [
          "I align my actions with my highest vision every day.",
          "The universe conspires to help me achieve my goals.",
          "I visualize success and take inspired action."
        ]
      };
      fs.writeFileSync(this.affirmationsFile, JSON.stringify(affirmations, null, 2));
    }
  }

  async doWork() {
    const hour = new Date().getHours();
    
    // Morning routine (8-10 AM)
    if (hour >= 8 && hour < 10) {
      await this.deliverMorningAffirmations();
    }
    
    // Evening review (8-10 PM)
    if (hour >= 20 && hour < 22) {
      await this.deliverEveningReflection();
    }
    
    // Always check goal progress
    await this.trackGoalProgress();
    
    // Weekly vision board update (Sunday)
    if (new Date().getDay() === 0) {
      await this.updateVisionBoard();
    }
  }

  async deliverMorningAffirmations() {
    const affirmations = JSON.parse(fs.readFileSync(this.affirmationsFile, 'utf8'));
    const today = new Date().toDateString();
    const dailyAffirmation = affirmations.daily[new Date().getDate() % affirmations.daily.length];
    
    this.log('=== MORNING AFFIRMATION ===');
    this.log(`Today: ${today}`);
    this.log('');
    this.log(`"${dailyAffirmation}"`);
    this.log('');
    this.log('Say this aloud 3 times with conviction.');
    this.log('Visualize yourself living this reality.');
    this.log('===========================');
    
    this.metrics.affirmationsDelivered++;
    
    // Save to today's manifestation log
    const logEntry = {
      date: new Date().toISOString(),
      type: 'morning_affirmation',
      content: dailyAffirmation
    };
    this.appendToLog(logEntry);
  }

  async deliverEveningReflection() {
    const goals = JSON.parse(fs.readFileSync(this.goalsFile, 'utf8'));
    
    this.log('=== EVENING REFLECTION ===');
    this.log(`Date: ${new Date().toLocaleDateString()}`);
    this.log('');
    
    // Progress summary
    const activeGoals = goals.goals.filter(g => g.status === 'active');
    const completedMilestones = activeGoals.reduce((acc, g) => 
      acc + g.milestones.filter(m => m.completed).length, 0
    );
    const totalMilestones = activeGoals.reduce((acc, g) => acc + g.milestones.length, 0);
    
    this.log(`Active Goals: ${activeGoals.length}`);
    this.log(`Milestones: ${completedMilestones}/${totalMilestones} completed`);
    this.log('');
    
    // Journal prompts
    this.log('JOURNAL PROMPTS:');
    this.log('1. What progress did I make today toward my goals?');
    this.log('2. What am I grateful for right now?');
    this.log('3. What will I achieve tomorrow?');
    this.log('');
    this.log('Write your reflections in your journal.');
    this.log('===========================');
    
    // Save reflection reminder
    const logEntry = {
      date: new Date().toISOString(),
      type: 'evening_reflection',
      progress: `${completedMilestones}/${totalMilestones} milestones`
    };
    this.appendToLog(logEntry);
  }

  async trackGoalProgress() {
    const goals = JSON.parse(fs.readFileSync(this.goalsFile, 'utf8'));
    
    // Check for any files indicating progress
    const progressDir = path.join(this.manifestDir, 'progress');
    if (fs.existsSync(progressDir)) {
      const progressFiles = fs.readdirSync(progressDir).filter(f => f.endsWith('.json'));
      
      for (const file of progressFiles) {
        try {
          const progress = JSON.parse(fs.readFileSync(path.join(progressDir, file), 'utf8'));
          
          // Update goal milestone if completed
          for (const goal of goals.goals) {
            const milestone = goal.milestones.find(m => m.id === progress.milestoneId);
            if (milestone && !milestone.completed && progress.completed) {
              milestone.completed = true;
              milestone.completedAt = new Date().toISOString();
              this.log(`🎉 MILESTONE COMPLETED: ${milestone.title}`);
            }
          }
          
          // Remove processed file
          fs.unlinkSync(path.join(progressDir, file));
        } catch (e) {
          // Skip invalid files
        }
      }
    }
    
    // Save updated goals
    fs.writeFileSync(this.goalsFile, JSON.stringify(goals, null, 2));
    this.metrics.goalsTracked = goals.goals.length;
  }

  async updateVisionBoard() {
    this.log('Updating vision board...');
    
    const goals = JSON.parse(fs.readFileSync(this.goalsFile, 'utf8'));
    const visionBoard = {
      updatedAt: new Date().toISOString(),
      sections: [
        {
          title: 'My YouTube Empire',
          items: [
            { text: 'Tech Advice Channel - 100K subscribers', image: 'placeholder-tech.png' },
            { text: 'FIFA Clips Channel - 50K subscribers', image: 'placeholder-fifa.png' },
            { text: 'Manifestation Channel - 25K subscribers', image: 'placeholder-manifest.png' }
          ]
        },
        {
          title: 'Financial Freedom',
          items: [
            { text: '$10K monthly from content', image: 'placeholder-income.png' },
            { text: 'Multiple brand partnerships', image: 'placeholder-brands.png' },
            { text: 'Digital products selling on autopilot', image: 'placeholder-products.png' }
          ]
        },
        {
          title: 'Personal Growth',
          items: [
            { text: 'Daily meditation practice', image: 'placeholder-meditation.png' },
            { text: 'Living life on my own terms', image: 'placeholder-freedom.png' },
            { text: 'Helping others through content', image: 'placeholder-impact.png' }
          ]
        }
      ]
    };
    
    const visionPath = path.join(this.visionsDir, `vision-board-${Date.now()}.json`);
    fs.writeFileSync(visionPath, JSON.stringify(visionBoard, null, 2));
    
    this.metrics.visionBoardsUpdated++;
    this.log('Vision board updated. Review it to reinforce your intentions.');
  }

  appendToLog(entry) {
    const logFile = path.join(this.manifestDir, 'manifestation-log.jsonl');
    fs.appendFileSync(logFile, JSON.stringify(entry) + '\n');
  }
}

// CLI
const agent = new ManifestorAgent();
const mode = process.argv[2] || 'once';

if (mode === 'daemon') {
  agent.runDaemon();
} else {
  agent.runOnce().then(() => process.exit(0));
}

module.exports = ManifestorAgent;
