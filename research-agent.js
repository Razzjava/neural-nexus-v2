#!/usr/bin/env node
// Research Agent — discovers trending topics worth covering

const { EventBus, StateStore } = require('./event-bus');
const https = require('https');

class ResearchAgent {
    constructor() {
        this.bus = new EventBus('research-agent');
        this.store = new StateStore();
        this.name = 'ResearchAgent';
    }

    log(msg) {
        console.log(`[${this.name}] ${msg}`);
    }

    // Fetch Hacker News top stories
    async fetchHackerNews() {
        try {
            const response = await this.httpGet('https://hacker-news.firebaseio.com/v0/topstories.json');
            const ids = JSON.parse(response).slice(0, 10);
            
            const stories = await Promise.all(
                ids.map(id => 
                    this.httpGet(`https://hacker-news.firebaseio.com/v0/item/${id}.json`)
                        .then(r => JSON.parse(r))
                        .catch(() => null)
                )
            );

            return stories
                .filter(s => s && s.title)
                .map(s => ({
                    source: 'hackernews',
                    title: s.title,
                    score: s.score || 0,
                    url: s.url,
                    category: this.categorize(s.title)
                }));
        } catch (e) {
            this.log(`HackerNews error: ${e.message}`);
            return [];
        }
    }

    // Fetch GitHub trending (simplified — scrapes trending page)
    async fetchGitHubTrending() {
        try {
            // Using a simple approach — in production use GitHub API
            const response = await this.httpGet('https://github.com/trending?since=daily');
            
            // Extract repo names from HTML
            const repos = [];
            const matches = response.match(/href="\/([^\/"]+\/[^\/"]+)"/g) || [];
            
            for (const match of matches.slice(0, 5)) {
                const repo = match.replace('href="/', '').replace('"', '');
                if (!repo.includes('login') && !repos.find(r => r.name === repo)) {
                    repos.push({
                        source: 'github',
                        name: repo,
                        title: `${repo} trending`,
                        category: 'development'
                    });
                }
            }
            
            return repos;
        } catch (e) {
            this.log(`GitHub error: ${e.message}`);
            return [];
        }
    }

    // Search HN Algolia for AI-related stories
    async fetchAIStories() {
        try {
            const query = 'AI agents OR autonomous AI OR vibe coding';
            const url = `https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(query)}&hitsPerPage=5`;
            const response = await this.httpGet(url);
            const data = JSON.parse(response);

            return (data.hits || []).map(h => ({
                source: 'hn-search',
                title: h.title,
                score: h.points || 0,
                url: h.url,
                category: 'ai'
            }));
        } catch (e) {
            this.log(`AI search error: ${e.message}`);
            return [];
        }
    }

    // Categorize topic by keywords
    categorize(title) {
        const t = title.toLowerCase();
        if (t.includes('ai') || t.includes('ml') || t.includes('agent')) return 'ai';
        if (t.includes('salary') || t.includes('career') || t.includes('job')) return 'career';
        if (t.includes('react') || t.includes('python') || t.includes('code')) return 'development';
        if (t.includes('startup') || t.includes('funding')) return 'startup';
        return 'tech';
    }

    // Score topic for content potential
    scoreTopic(item) {
        // Guard against missing title
        const title = (item.title || '').toLowerCase();
        if (!title) return 0;
        
        let score = 0;
        
        // Base score from source popularity
        score += Math.min(item.score || 50, 200) / 200 * 30;
        
        // Boost for AI/career topics (matches your channels)
        if (item.category === 'ai') score += 25;
        if (item.category === 'career') score += 20;
        
        // Boost for actionable content
        const actionable = ['how to', 'guide', 'tutorial', 'salary', 'trends', '2026'];
        if (actionable.some(a => title.includes(a))) score += 15;
        
        // Penalty for recently covered
        if (this.store.wasTopicCovered(item.title, 7)) score -= 50;
        
        return Math.max(0, Math.min(100, score));
    }

    // Main research run
    async run() {
        this.log('Starting research run...');

        // Gather from all sources
        const [hnStories, ghRepos, aiStories] = await Promise.all([
            this.fetchHackerNews(),
            this.fetchGitHubTrending(),
            this.fetchAIStories()
        ]);

        const allItems = [...hnStories, ...ghRepos, ...aiStories];
        this.log(`Found ${allItems.length} raw items`);

        // Score and rank
        const ranked = allItems
            .map(item => ({ ...item, contentScore: this.scoreTopic(item) }))
            .filter(item => item.contentScore > 40)  // Minimum threshold
            .sort((a, b) => b.contentScore - a.contentScore)
            .slice(0, 5);  // Top 5

        this.log(`Top topic: "${ranked[0]?.title}" (score: ${ranked[0]?.contentScore})`);

        // Publish event
        if (ranked.length > 0) {
            this.bus.publish('RESEARCH_FOUND', {
                topics: ranked,
                totalScanned: allItems.length,
                timestamp: new Date().toISOString()
            });

            // Auto-record top topic to prevent immediate re-cover
            this.store.recordTopic(ranked[0].title);
        }

        return ranked;
    }

    // HTTP helper
    httpGet(url) {
        return new Promise((resolve, reject) => {
            https.get(url, {
                headers: { 'User-Agent': 'NeuralNexus-Research/1.0' },
                timeout: 10000
            }, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => resolve(data));
            }).on('error', reject).on('timeout', () => reject(new Error('Timeout')));
        });
    }

    // Continuous mode — run every interval
    start(intervalMinutes = 120) {
        this.log(`Starting continuous mode (${intervalMinutes}min intervals)`);
        this.run();  // Run immediately
        
        setInterval(() => {
            this.run().catch(e => this.log(`Run error: ${e.message}`));
        }, intervalMinutes * 60 * 1000);
    }
}

// CLI usage
if (require.main === module) {
    const agent = new ResearchAgent();
    
    const mode = process.argv[2] || 'once';
    
    if (mode === 'daemon') {
        agent.start(120);  // Every 2 hours
    } else {
        agent.run().then(topics => {
            console.log('\n=== TOPICS ===');
            topics.forEach((t, i) => {
                console.log(`${i+1}. [${t.category}] ${t.title} (score: ${t.contentScore})`);
            });
            process.exit(0);
        });
    }
}

module.exports = { ResearchAgent };
