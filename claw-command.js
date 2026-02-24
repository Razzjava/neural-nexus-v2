const EventBus = require('./event-bus');
const SmartScheduler = require('./smart-scheduler');

class ClawCommand {
  constructor() {
    this.commands = new Map();
    this.registerDefaultCommands();
  }
  
  /**
   * Register default natural language commands
   */
  registerDefaultCommands() {
    // Research commands
    this.register('find.*viral.*video.*ideas', {
      agents: ['claw-researcher'],
      event: 'command.research.viral',
      description: 'Find viral video ideas'
    });
    
    this.register('research.*trending', {
      agents: ['claw-researcher'],
      event: 'command.research.trends',
      description: 'Research trending topics'
    });
    
    // Job commands
    this.register('find.*jobs?', {
      agents: ['claw-hunter'],
      event: 'command.job.search',
      description: 'Find job opportunities'
    });
    
    this.register('search.*pega', {
      agents: ['claw-hunter'],
      event: 'command.job.pega',
      description: 'Search Pega developer jobs'
    });
    
    // Video commands
    this.register('create.*video', {
      agents: ['claw-researcher', 'claw-video-editor'],
      event: 'command.video.create',
      description: 'Create video from trending topic'
    });
    
    this.register('make.*short', {
      agents: ['claw-video-editor'],
      event: 'command.video.short',
      description: 'Create a short/reel'
    });
    
    // Coaching commands
    this.register('need.*motivation', {
      agents: ['claw-coach', 'claw-manifestation-coach'],
      event: 'command.coach.motivate',
      description: 'Get motivation and coaching'
    });
    
    this.register('feeling.*stuck', {
      agents: ['claw-coach'],
      event: 'command.coach.stuck',
      description: 'Help when feeling stuck'
    });
    
    // System commands
    this.register('system.*status', {
      agents: ['claw-ceo'],
      event: 'command.ceo.status',
      description: 'Get full system status'
    });
    
    this.register('agent.*performance', {
      agents: ['claw-ceo'],
      event: 'command.ceo.performance',
      description: 'Get agent performance report'
    });
    
    // Development commands
    this.register('fix.*bug', {
      agents: ['claw-dev', 'claw-qa'],
      event: 'command.dev.fix',
      description: 'Fix a bug'
    });
    
    this.register('improve.*code', {
      agents: ['claw-dev'],
      event: 'command.dev.improve',
      description: 'Code improvement'
    });
    
    // Multi-agent workflows
    this.register('full.*content.*pipeline', {
      agents: ['claw-researcher', 'claw-video-editor', 'claw-coach'],
      event: 'command.workflow.content',
      description: 'Research → Video → Motivation'
    });
    
    this.register('job.*hunt.*mode', {
      agents: ['claw-hunter', 'claw-coach', 'claw-ceo'],
      event: 'command.workflow.jobhunt',
      description: 'Intensive job search with coaching'
    });
  }
  
  /**
   * Register a command pattern
   */
  register(pattern, config) {
    this.commands.set(pattern, {
      regex: new RegExp(pattern, 'i'),
      ...config
    });
  }
  
  /**
   * Parse and execute a natural language command
   */
  async execute(input) {
    console.log(`[ClawCommand] Parsing: "${input}"`);
    
    const normalized = input.toLowerCase().trim();
    
    // Find matching command
    for (const [pattern, config] of this.commands) {
      if (config.regex.test(normalized)) {
        console.log(`[ClawCommand] Matched: ${config.description}`);
        return this.dispatch(config, input);
      }
    }
    
    // No match - use fallback
    return this.fallback(input);
  }
  
  /**
   * Dispatch to appropriate agents
   */
  async dispatch(config, originalInput) {
    const { agents, event, description } = config;
    
    console.log(`[ClawCommand] Dispatching to: ${agents.join(', ')}`);
    
    // Emit event for each agent
    agents.forEach((agent, index) => {
      setTimeout(() => {
        EventBus.emit(event, {
          agent,
          command: originalInput,
          description,
          sequence: index,
          totalAgents: agents.length
        }, 10 - index); // Higher priority for first agents
      }, index * 1000); // Stagger by 1 second
    });
    
    return {
      success: true,
      command: description,
      agents: agents,
      message: `Executing "${description}" with ${agents.length} agent(s)`
    };
  }
  
  /**
   * Fallback for unrecognized commands
   */
  fallback(input) {
    console.log(`[ClawCommand] No pattern match for: "${input}"`);
    
    // Try to infer intent
    const keywords = {
      'research': ['claw-researcher'],
      'job': ['claw-hunter'],
      'video': ['claw-video-editor'],
      'code': ['claw-dev'],
      'test': ['claw-qa'],
      'coach': ['claw-coach'],
      'help': ['claw-coach', 'claw-ceo'],
      'status': ['claw-ceo']
    };
    
    for (const [keyword, agents] of Object.entries(keywords)) {
      if (input.includes(keyword)) {
        console.log(`[ClawCommand] Inferred intent: ${keyword}`);
        return this.dispatch({
          agents,
          event: `command.inferred.${keyword}`,
          description: `Inferred: ${keyword}`
        }, input);
      }
    }
    
    // Ultimate fallback - ask CEO
    return this.dispatch({
      agents: ['claw-ceo'],
      event: 'command.ceo.unknown',
      description: 'Unknown command - CEO review'
    }, input);
  }
  
  /**
   * List all available commands
   */
  listCommands() {
    const list = [];
    for (const [pattern, config] of this.commands) {
      list.push({
        pattern: pattern.replace(/\\.\*/g, '...'),
        description: config.description,
        agents: config.agents
      });
    }
    return list;
  }
  
  /**
   * Get command help text
   */
  getHelp() {
    const commands = this.listCommands();
    
    let help = '# ClawCommand - Natural Language Interface\n\n';
    help += 'Say anything naturally. I\'ll understand.\n\n';
    
    // Group by category
    const categories = {
      'Research': commands.filter(c => c.agents.includes('claw-researcher')),
      'Jobs': commands.filter(c => c.agents.includes('claw-hunter')),
      'Video': commands.filter(c => c.agents.includes('claw-video-editor')),
      'Coaching': commands.filter(c => c.agents.includes('claw-coach')),
      'Development': commands.filter(c => c.agents.includes('claw-dev')),
      'System': commands.filter(c => c.agents.includes('claw-ceo'))
    };
    
    for (const [category, cmds] of Object.entries(categories)) {
      if (cmds.length > 0) {
        help += `## ${category}\n`;
        cmds.forEach(c => {
          help += `- "${c.pattern}" → ${c.description}\n`;
        });
        help += '\n';
      }
    }
    
    return help;
  }
}

// Export singleton
module.exports = new ClawCommand();

// CLI test
if (require.main === module) {
  const cmd = new ClawCommand();
  
  console.log('=== ClawCommand Test ===\n');
  console.log(cmd.getHelp());
  
  // Test commands
  const tests = [
    'Find me viral video ideas',
    'Search for Pega jobs',
    'I need motivation',
    'Create a video',
    'System status',
    'Something random'
  ];
  
  console.log('\n=== Test Executions ===\n');
  
  tests.forEach(async (test) => {
    const result = await cmd.execute(test);
    console.log(`"${test}"`);
    console.log(`→ ${result.message}\n`);
  });
}
