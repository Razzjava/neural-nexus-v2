#!/usr/bin/env node
// Script Agent — generates platform-optimized scripts from research

const { EventBus, StateStore } = require('./event-bus');
const fs = require('fs');
const path = require('path');

class ScriptAgent {
    constructor() {
        this.bus = new EventBus('script-agent');
        this.store = new StateStore();
        this.name = 'ScriptAgent';
        this.outputDir = path.join(__dirname, 'agents-output', 'scripts');
        
        if (!fs.existsSync(this.outputDir)) {
            fs.mkdirSync(this.outputDir, { recursive: true });
        }
    }

    log(msg) {
        console.log(`[${this.name}] ${msg}`);
    }

    // Subscribe to research events
    start() {
        this.log('Starting script agent...');
        
        this.bus.subscribe('RESEARCH_FOUND', (payload) => {
            this.handleResearch(payload);
        });

        this.pollLoop();
    }

    pollLoop() {
        this.bus.poll();
        setTimeout(() => this.pollLoop(), 3000);
    }

    async handleResearch(payload) {
        const topTopic = payload.topics[0];
        
        // Only generate if score is high enough
        if (topTopic.contentScore < 45) {
            this.log(`Topic score too low (${topTopic.contentScore}), skipping`);
            return;
        }

        this.log(`Generating scripts for: "${topTopic.title}"`);

        // Generate both formats
        const shortScript = this.generateShortScript(topTopic);
        const longScript = this.generateLongScript(topTopic);

        // Save files
        const safeName = this.safeName(topTopic.title);
        const shortPath = path.join(this.outputDir, `${safeName}-short.md`);
        const longPath = path.join(this.outputDir, `${safeName}-long.md`);

        fs.writeFileSync(shortPath, shortScript);
        fs.writeFileSync(longPath, longScript);

        this.log(`Scripts saved: ${safeName}-short.md, ${safeName}-long.md`);

        // Publish event
        this.bus.publish('SCRIPT_CREATED', {
            topic: topTopic.title,
            category: topTopic.category,
            shortScript: shortPath,
            longScript: longPath,
            hooks: {
                short: this.extractHook(shortScript),
                long: this.extractHook(longScript)
            },
            timestamp: new Date().toISOString()
        });
    }

    generateShortScript(topic) {
        const year = new Date().getFullYear();
        const hook = this.generateHook(topic, 'short');
        
        return `# Short Script (45s, 9:16)
# Topic: ${topic.title}
# Source: ${topic.source}
# Generated: ${new Date().toISOString()}

## HOOK (0-3s)
${hook}

## SCENES

### Scene 1: Flash Text (3s)
TEXT: "${year}"
SUBTEXT: "${topic.category.toUpperCase()}"
VOICEOVER: "${year}. ${this.summarize(topic.title, 8)}."

### Scene 2: Counter (4s)  
COUNTER: 0 → 92%
LABEL: "Adoption Rate"
VOICEOVER: "92% of teams now use this."

### Scene 3: Emoji Reaction (3s)
EMOJI: 🤯
TEXT: "Game changer"
VOICEOVER: "This changes everything."

### Scene 4: Progress Bar (3s)
PERCENT: 78%
LABEL: "Tasks Automated"  
VOICEOVER: "78% of work—automated."

### Scene 5: Quote Card (4s)
QUOTE: "The question isn't if. It's when."
AUTHOR: "Tech Reality ${year}"
VOICEOVER: "The only question is when you'll start."

### Scene 6: CTA (3s)
BUTTON: "FOLLOW +"
SUBTEXT: "Daily ${topic.category} Insights"
VOICEOVER: "Follow for what happens next."

## FULL VOICEOVER
"${hook} 92% of teams now use this. This changes everything. 
78% of work—automated. The only question is when you'll start. 
Follow for what happens next."

## TAGS
${topic.category}, ${topic.source}, ${year}, trending
`;
    }

    generateLongScript(topic) {
        const year = new Date().getFullYear();
        const hook = this.generateHook(topic, 'long');
        
        return `# Long Script (3.5min, 16:9)
# Topic: ${topic.title}
# Source: ${topic.source}
# Generated: ${new Date().toISOString()}

## HOOK (0-5s)
${hook}

## SCENES

### Scene 1: Flash Text (4s)
TEXT: "${topic.category.toUpperCase()}"
SUBTEXT: "The ${year} Reality"
VOICEOVER: "${topic.category} in ${year}. Not hype. Reality."

### Scene 2: Split Compare (5s)
LEFT: "Old Way"
RIGHT: "New Way"
VOICEOVER: "The old way waits. The new way acts."

### Scene 3: Counter (4s)
COUNTER: 0 → 60%
LABEL: "Impact"
VOICEOVER: "60% of repetitive work—gone."

### Scene 4: Emoji Reaction (3s)
EMOJI: ⚡
TEXT: "95% efficiency"
VOICEOVER: "95% efficiency. Not 55. Ninety-five."

### Scene 5: Use Case Grid (6s)
CASES: ${this.generateUseCases(topic.category)}
VOICEOVER: "Support, coding, research, reports—all automated end-to-end."

### Scene 6: Quote Card (5s)
QUOTE: "The best teams now manage AI, not tasks."
AUTHOR: "${year} Tech Lead"
VOICEOVER: "The best teams don't do more—they manage what does it for them."

### Scene 7: Bar Chart (6s)
TITLE: "Results ${year}"
DATA: Before → After
VOICEOVER: "Before: 20% efficiency. After: 95%."

### Scene 8: Checklist (6s)
ITEMS: Try it → Automate → Scale
VOICEOVER: "This week: try it. Next week: automate one thing. Month three: scale."

### Scene 9: CTA (4s)
BUTTON: "SUBSCRIBE"
SUBTEXT: "Weekly Deep Dives"
VOICEOVER: "Subscribe. The shift is just starting."

## FULL VOICEOVER
"${hook} The old way waits. The new way acts. 60% of repetitive work—gone. 
95% efficiency. Support, coding, research—all automated. 
The best teams manage AI, not tasks. Before: 20% efficiency. After: 95%. 
This week: try it. Next week: automate. Month three: scale. 
Subscribe. The shift is just starting."

## TAGS
${topic.category}, ${topic.source}, ${year}, tutorial, career
`;
    }

    generateHook(topic, format) {
        const hooks = {
            ai: {
                short: [`This changes everything in ${new Date().getFullYear()}`, `AI just got real`, `Your job is about to change`],
                long: [`60% of your workflow—automated by ${new Date().getFullYear()}`, `The AI shift nobody saw coming`, `Why the best developers are switching`]
            },
            career: {
                short: [`Salary data just dropped`, `The $150k skill in 2026`, `Stop learning the wrong things`],
                long: [`The career path that pays $150k in ${new Date().getFullYear()}`, `Why some developers get left behind`, `The skill gap is widening`]
            },
            development: {
                short: [`New way to code just dropped`, `Developers are switching`, `This changes how you build`],
                long: [`The end of manual coding as we know it`, `Why vibe coding took over`, `Build 10x faster or get left behind`]
            },
            tech: {
                short: [`This just changed everything`, `The trend you can't ignore`, `2026's biggest shift`],
                long: [`The tech shift of ${new Date().getFullYear()}`, `What nobody's telling you about ${new Date().getFullYear()}`, `The change that affects everyone`]
            }
        };

        const category = topic.category || 'tech';
        const options = hooks[category]?.[format] || hooks.tech[format];
        return options[Math.floor(Math.random() * options.length)];
    }

    generateUseCases(category) {
        const cases = {
            ai: 'AI coding, Research, Analysis, Reports',
            career: 'Job search, Skill building, Networking, Salary negotiation',
            development: 'Code review, Testing, Deployment, Documentation',
            tech: 'Research, Analysis, Reporting, Communication'
        };
        return cases[category] || cases.tech;
    }

    summarize(text, maxWords) {
        return text.split(' ').slice(0, maxWords).join(' ').replace(/[^a-zA-Z0-9\s]/g, '');
    }

    safeName(text) {
        return text.toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .slice(0, 50)
            .replace(/-+$/, '');
    }

    extractHook(script) {
        const match = script.match(/## HOOK.*\n(.+)/);
        return match ? match[1].trim() : '';
    }
}

// CLI
if (require.main === module) {
    const agent = new ScriptAgent();
    
    if (process.argv[2] === 'daemon') {
        agent.start();
    } else {
        // Test mode — generate from mock research
        agent.handleResearch({
            topics: [{
                title: 'AI Agents Transforming Workflows',
                category: 'ai',
                contentScore: 75,
                source: 'hackernews'
            }]
        });
    }
}

module.exports = { ScriptAgent };
