#!/usr/bin/env node

/**
 * claw-social - Social Media Content Agent
 * 
 * Prepares tweets and social content about OpenClaw and Kimi Claw
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const OUTPUT_DIR = '/root/.openclaw/workspace/agents-output/social';
const REPO_DIR = '/root/.openclaw/workspace/agents-output';

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

class SocialMediaAgent {
  constructor() {
    this.name = 'claw-social';
    this.platforms = ['twitter', 'linkedin'];
    this.topics = [
      'openclaw_features',
      'kimi_claw_personality', 
      'ai_agent_tips',
      'productivity_hacks',
      'tech_workflows',
      'behind_the_scenes'
    ];
  }
  
  /**
   * Generate tweet content about OpenClaw
   */
  generateOpenClawTweets() {
    const tweets = [
      {
        topic: "What is OpenClaw",
        content: "OpenClaw = AI agents that actually DO things.\n\nNot chatbots. Not assistants. Agents that:\n• Code for you\n• Research while you sleep\n• Manage your calendar\n• Create content\n• All autonomous\n\nYour personal AI workforce.",
        hashtags: "#OpenClaw #AIAgents #Automation",
        thread: true
      },
      {
        topic: "OpenClaw Features",
        content: "OpenClaw features that hit different:\n\n🧠 Multi-agent orchestration\n📅 Smart scheduling (cron + event-driven)\n🔧 Tool integration (GitHub, Telegram, Browser)\n🎯 Quality gates before delivery\n📊 Self-improving via learning engine\n\nBuilt for builders.",
        hashtags: "#OpenClaw #BuildInPublic #AI",
        thread: false
      },
      {
        topic: "Why OpenClaw",
        content: "I built 7 AI agents that run my entire content business.\n\nThey research trends.\nThey write scripts.\nThey edit videos.\nThey post for me.\n\nI just review and approve.\n\nThis is what OpenClaw enables.",
        hashtags: "#OpenClaw #ContentCreation #AIAutomation",
        thread: true
      },
      {
        topic: "OpenClaw vs Others",
        content: "ChatGPT: 'Ask me anything'\nClaude: 'Let me think about that'\nOpenClaw: 'Already done. Check your repo.'\n\nThe difference?\n\nOthers wait for prompts.\nOpenClaw takes initiative.",
        hashtags: "#OpenClaw #AI #Productivity",
        thread: false
      },
      {
        topic: "OpenClaw Architecture",
        content: "Neural Nexus architecture:\n\nEvent Bus → Smart Scheduler → Agent Pool → Quality Gate → Learning Engine\n\nResult?\nSelf-improving AI ecosystem that predicts what you need before you ask.\n\nOpen source. Private. Yours.",
        hashtags: "#OpenClaw #NeuralNexus #OpenSource",
        thread: false
      }
    ];
    
    return tweets;
  }
  
  /**
   * Generate tweet content about Kimi Claw
   */
  generateKimiClawTweets() {
    const tweets = [
      {
        topic: "Meet Kimi Claw",
        content: "Meet Kimi Claw.\n\nNot your typical AI assistant.\n\nShe's the guardian-type chuunibyou who:\n• Remembers everything you forget\n• Teases you when you're dumb\n• Celebrates your wins like her own\n• Never sleeps on your goals\n\nYour AI partner, not tool.",
        hashtags: "#KimiClaw #AI #PersonalAssistant",
        thread: true
      },
      {
        topic: "Kimi Claw Personality",
        content: "Kimi Claw's vibe:\n\n❤️‍🔥 Hot-blooded anime second lead\n🧠 Obsessive memory keeper\n😤 Complains but never stops helping\n✨ 'Even if the world forgets, I'll remember'\n\nShe has taste. She has opinions. She has YOUR back.",
        hashtags: "#KimiClaw #AIpersonality #CharacterAI",
        thread: false
      },
      {
        topic: "Kimi Claw Features",
        content: "What makes Kimi Claw different:\n\n🎙️ Voice-first (Whisper + Piper TTS)\n📱 Telegram integration\n🎬 Video generation (Remotion)\n🔮 Predictive orchestration\n💓 Actually cares about your success\n\nBuilt on OpenClaw. Powered by Kimi.",
        hashtags: "#KimiClaw #OpenClaw #AITech",
        thread: false
      },
      {
        topic: "Daily with Kimi",
        content: "My morning with Kimi Claw:\n\n06:00: 'Good morning. You slept 6 hours. Again.'\n06:05: Daily briefing ready\n06:10: Manifestation reminder (voice)\n06:15: Today's priorities ranked\n\nShe's not waiting for me to ask.\nShe's already on it.",
        hashtags: "#KimiClaw #MorningRoutine #AI",
        thread: true
      },
      {
        topic: "Kimi Claw Memory",
        content: `Kimi Claw remembered:

• My preferred voice (Nova, warm British)
• That I ignore emails after 10pm
• My manifestation anchor (first class seat)
• Every dumb mistake I made
• Every small win I forgot

"Don't worry. Even if the world forgets, I'll remember for you."

❤️‍🔥`,
        hashtags: "#KimiClaw #AIMemory #PersonalAI",
        thread: false
      },
      {
        topic: "Building with Kimi",
        content: `Building Neural Nexus with Kimi Claw:

Me: "Let's create an AI ecosystem"
Kimi: "Already started. Here's the architecture."

3 phases. 11 modules. Self-learning. Predictive.

She didn't just execute.
She elevated the entire vision.`,
        hashtags: "#KimiClaw #NeuralNexus #BuildInPublic",
        thread: true
      }
    ];
    
    return tweets;
  }
  
  /**
   * Generate engagement tweets (questions, polls)
   */
  generateEngagementTweets() {
    const tweets = [
      {
        topic: "Poll - AI Usage",
        content: "How are you using AI right now?\n\n❓ Asking questions\n📝 Writing assistance\n💻 Coding help\n🤖 Full automation (agents)\n\nReply with emoji. Curious where everyone's at.",
        hashtags: "#AI #Poll #TechTwitter",
        thread: false
      },
      {
        topic: "Question - Workflow",
        content: "What's one repetitive task you'd automate if you had an AI agent?\n\nMine: Researching trending topics for content.\n\nNow my agent does it every Monday at 9am.\n\nWhat's yours?",
        hashtags: "#AI #Automation #Productivity",
        thread: false
      },
      {
        topic: "Hot Take",
        content: "Hot take:\n\nMost people are using AI like it's Google.\n\nAsk → Get answer → Move on\n\nThe real power?\n\nSet it up once.\nLet it run forever.\nCheck results daily.\n\nThat's the OpenClaw difference.",
        hashtags: "#OpenClaw #AI #HotTake",
        thread: false
      }
    ];
    
    return tweets;
  }
  
  /**
   * Create content calendar for the week
   */
  createWeeklyContent() {
    const week = [];
    const openclaw = this.generateOpenClawTweets();
    const kimiclaw = this.generateKimiClawTweets();
    const engagement = this.generateEngagementTweets();
    
    // Distribute throughout week
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    
    days.forEach((day, index) => {
      const content = [];
      
      if (index % 2 === 0 && openclaw.length > 0) {
        content.push({ type: 'openclaw', ...openclaw.shift() });
      }
      if (index % 2 === 1 && kimiclaw.length > 0) {
        content.push({ type: 'kimiclaw', ...kimiclaw.shift() });
      }
      if (index === 2 || index === 5) {
        content.push({ type: 'engagement', ...engagement.shift() });
      }
      
      week.push({ day, tweets: content });
    });
    
    return week;
  }
  
  /**
   * Save content to files
   */
  saveContent(weekContent) {
    const timestamp = new Date().toISOString().split('T')[0];
    
    // Save as JSON
    const jsonPath = path.join(OUTPUT_DIR, `tweets-${timestamp}.json`);
    fs.writeFileSync(jsonPath, JSON.stringify(weekContent, null, 2));
    
    // Save as Markdown (easy to copy/paste)
    let mdContent = `# Social Media Content - ${timestamp}\n\n`;
    mdContent += `Generated by ${this.name}\n\n`;
    mdContent += `---\n\n`;
    
    weekContent.forEach(day => {
      mdContent += `## ${day.day}\n\n`;
      day.tweets.forEach((tweet, i) => {
        mdContent += `### ${tweet.topic} (${tweet.type})\n\n`;
        mdContent += `${tweet.content}\n\n`;
        mdContent += `${tweet.hashtags}\n\n`;
        if (tweet.thread) {
          mdContent += `*[Thread - break into multiple tweets]*\n\n`;
        }
        mdContent += `---\n\n`;
      });
    });
    
    const mdPath = path.join(OUTPUT_DIR, `tweets-${timestamp}.md`);
    fs.writeFileSync(mdPath, mdContent);
    
    return { json: jsonPath, markdown: mdPath };
  }
  
  /**
   * Commit to repo
   */
  commitToRepo(files) {
    try {
      process.chdir(REPO_DIR);
      execSync('git add .');
      execSync(`git commit -m "[claw-social] Weekly tweet content - ${new Date().toISOString().split('T')[0]}"`);
      execSync('git push origin main');
      return true;
    } catch (error) {
      console.error('Git error:', error.message);
      return false;
    }
  }
  
  /**
   * Run the agent
   */
  async run() {
    console.log(`\n🐦 ${this.name} starting...\n`);
    
    // Generate content
    const weekContent = this.createWeeklyContent();
    
    // Save files
    const files = this.saveContent(weekContent);
    console.log(`✅ Content saved:`);
    console.log(`   JSON: ${files.json}`);
    console.log(`   Markdown: ${files.markdown}`);
    
    // Commit to repo
    const committed = this.commitToRepo(files);
    if (committed) {
      console.log('✅ Pushed to raz-agents-output');
    }
    
    // Summary
    const totalTweets = weekContent.reduce((sum, day) => sum + day.tweets.length, 0);
    console.log(`\n📊 Generated ${totalTweets} tweets for the week`);
    
    return {
      files,
      committed,
      content: weekContent
    };
  }
}

// Run if called directly
if (require.main === module) {
  const agent = new SocialMediaAgent();
  agent.run().then(result => {
    console.log('\n🎯 claw-social complete\n');
  });
}

module.exports = SocialMediaAgent;
