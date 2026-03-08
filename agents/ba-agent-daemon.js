#!/usr/bin/env node

/**
 * Business Analyst Agent - Real Operational Daemon
 * Handles requirements gathering and documentation
 */

const AgentBase = require('../agent-base');
const fs = require('fs');
const path = require('path');

class BAAgent extends AgentBase {
  constructor() {
    super('ba', {
      name: 'Business Analyst',
      workInterval: 15 * 60 * 1000,
      defaultMetrics: {
        requirementsGathered: 0,
        documentsCreated: 0,
        userStoriesWritten: 0
      }
    });
    
    this.docsDir = path.join('/root/.openclaw/workspace/neural-nexus', 'docs');
    this.requirementsDir = path.join('/root/.openclaw/workspace/neural-nexus', 'requirements');
    
    [this.docsDir, this.requirementsDir].forEach(dir => {
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    });
  }

  async doWork() {
    // Check for new project requests
    const requestsDir = path.join('/root/.openclaw/workspace/neural-nexus', 'requests');
    
    if (fs.existsSync(requestsDir)) {
      const requests = fs.readdirSync(requestsDir).filter(f => f.endsWith('.md'));
      
      for (const req of requests.slice(0, 3)) {
        await this.analyzeRequest(path.join(requestsDir, req));
      }
    }

    // Periodic requirements maintenance
    await this.performMaintenance();
  }

  async analyzeRequest(requestPath) {
    const requestId = path.basename(requestPath, '.md');
    this.log(`Analyzing request: ${requestId}`);
    
    try {
      const content = fs.readFileSync(requestPath, 'utf8');
      
      // Parse requirements
      const requirements = this.parseRequirements(content, requestId);
      
      // Create structured requirements doc
      const reqOutput = path.join(this.requirementsDir, `${requestId}.json`);
      fs.writeFileSync(reqOutput, JSON.stringify(requirements, null, 2));
      
      // Create user stories
      await this.createUserStories(requirements);
      
      // Create acceptance criteria
      await this.createAcceptanceCriteria(requirements);
      
      // Mark request as processed
      fs.renameSync(requestPath, `${requestPath}.processed`);
      
      this.metrics.requirementsGathered++;
      this.log(`Analyzed ${requestId}: ${requirements.userStories.length} stories created`);
      
    } catch (error) {
      this.log(`Error analyzing ${requestId}: ${error.message}`);
      throw error;
    }
  }

  parseRequirements(content, requestId) {
    // Extract key information from request
    const lines = content.split('\n');
    const title = lines.find(l => l.startsWith('# '))?.replace('# ', '') || requestId;
    
    return {
      id: requestId,
      title,
      createdAt: new Date().toISOString(),
      description: content.substring(0, 500),
      type: this.detectProjectType(content),
      priority: this.detectPriority(content),
      userStories: this.generateUserStories(title),
      constraints: ['Budget', 'Timeline', 'Technical'].filter(c => 
        content.toLowerCase().includes(c.toLowerCase())
      )
    };
  }

  detectProjectType(content) {
    const lower = content.toLowerCase();
    if (lower.includes('mobile') || lower.includes('app')) return 'mobile-app';
    if (lower.includes('api') || lower.includes('backend')) return 'api-service';
    if (lower.includes('data') || lower.includes('pipeline')) return 'data-pipeline';
    return 'web-application';
  }

  detectPriority(content) {
    const lower = content.toLowerCase();
    if (lower.includes('urgent') || lower.includes('asap')) return 'high';
    if (lower.includes('nice to have')) return 'low';
    return 'medium';
  }

  generateUserStories(title) {
    return [
      {
        id: `US-${Date.now()}-1`,
        role: 'User',
        action: `access ${title}`,
        benefit: 'accomplish my goals efficiently',
        acceptanceCriteria: [
          'User can access the feature',
          'User receives appropriate feedback',
          'Error states are handled gracefully'
        ]
      },
      {
        id: `US-${Date.now()}-2`,
        role: 'Admin',
        action: 'manage the system',
        benefit: 'ensure smooth operation',
        acceptanceCriteria: [
          'Admin can view dashboard',
          'Admin can modify settings',
          'Changes are logged'
        ]
      }
    ];
  }

  async createUserStories(requirements) {
    const outputPath = path.join(this.docsDir, `${requirements.id}-user-stories.md`);
    
    const content = `# User Stories: ${requirements.title}

${requirements.userStories.map(us => `
## ${us.id}: ${us.role} - ${us.action}

**As a** ${us.role}  
**I want to** ${us.action}  
**So that** ${us.benefit}

### Acceptance Criteria
${us.acceptanceCriteria.map(ac => `- [ ] ${ac}`).join('\n')}
`).join('\n---\n')}
`;

    fs.writeFileSync(outputPath, content);
    this.metrics.userStoriesWritten += requirements.userStories.length;
  }

  async createAcceptanceCriteria(requirements) {
    const outputPath = path.join(this.docsDir, `${requirements.id}-acceptance-criteria.md`);
    
    const content = `# Acceptance Criteria: ${requirements.title}

## Functional Requirements
- [ ] Feature works as specified
- [ ] Edge cases are handled
- [ ] Error messages are user-friendly

## Non-Functional Requirements
- [ ] Performance meets SLA
- [ ] Security standards are met
- [ ] Accessibility guidelines followed

## Constraints
${requirements.constraints.map(c => `- ${c}`).join('\n') || '- None specified'}
`;

    fs.writeFileSync(outputPath, content);
    this.metrics.documentsCreated++;
  }

  async performMaintenance() {
    const reqCount = fs.readdirSync(this.requirementsDir).filter(f => f.endsWith('.json')).length;
    this.log(`Maintaining ${reqCount} requirements documents`);
  }
}

// CLI
const agent = new BAAgent();
const mode = process.argv[2] || 'once';

if (mode === 'daemon') {
  agent.runDaemon();
} else {
  agent.runOnce().then(() => process.exit(0));
}

module.exports = BAAgent;
