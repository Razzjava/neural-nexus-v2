#!/usr/bin/env node

/**
 * Startup Generator Agent
 * 
 * End-to-end startup creation from idea to MVP.
 * Spawns specialized sub-agents for each phase.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const WORKSPACE = '/root/.openclaw/workspace';
const STARTUP_DIR = path.join(WORKSPACE, 'neural-nexus/workforce/projects/startups');

// Ensure directory exists
if (!fs.existsSync(STARTUP_DIR)) {
  fs.mkdirSync(STARTUP_DIR, { recursive: true });
}

class StartupGenerator {
  constructor() {
    this.phases = [
      { name: 'ideation', duration: 30, agents: ['founder-strategist'] },
      { name: 'validation', duration: 45, agents: ['market-researcher'] },
      { name: 'design', duration: 60, agents: ['product-architect', 'designer'] },
      { name: 'development', duration: 120, agents: ['fullstack-dev'] },
      { name: 'launch', duration: 30, agents: ['growth-hacker'] }
    ];
  }

  /**
   * Generate a complete startup
   */
  async generate(domain = null) {
    const startupId = `startup-${Date.now()}`;
    const startupDir = path.join(STARTUP_DIR, startupId);
    fs.mkdirSync(startupDir, { recursive: true });

    console.log(`[StartupGen] Creating startup: ${startupId}`);
    console.log(`[StartupGen] Domain: ${domain || 'auto-detect'}`);

    const results = {
      id: startupId,
      phases: [],
      outputs: {}
    };

    // Execute each phase
    for (const phase of this.phases) {
      console.log(`[StartupGen] Phase: ${phase.name}`);
      
      const phaseResult = await this.executePhase(startupId, startupDir, phase, domain);
      results.phases.push(phaseResult);
      
      if (!phaseResult.success) {
        console.error(`[StartupGen] Phase failed: ${phase.name}`);
        break;
      }
      
      // Update domain from first phase if not specified
      if (phase.name === 'ideation' && !domain) {
        domain = phaseResult.output?.domain;
      }
    }

    // Generate final package
    await this.createStartupPackage(startupId, startupDir, results);

    return results;
  }

  /**
   * Execute a single phase
   */
  async executePhase(startupId, startupDir, phase, domain) {
    const phaseDir = path.join(startupDir, phase.name);
    fs.mkdirSync(phaseDir, { recursive: true });

    const task = this.buildPhaseTask(phase, startupId, domain, phaseDir);

    try {
      // Spawn phase execution agent
      const result = await this.spawnAgent(phase.agents[0], task, phase.duration);
      
      return {
        name: phase.name,
        success: true,
        output: result,
        artifacts: this.collectArtifacts(phaseDir)
      };
    } catch (error) {
      return {
        name: phase.name,
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Build task prompt for each phase
   */
  buildPhaseTask(phase, startupId, domain, outputDir) {
    const templates = {
      ideation: `You are a Founder Strategist creating a new startup.\n\n` +
        `Task: Generate a compelling startup idea${domain ? ` in the ${domain} domain` : ''}.\n\n` +
        `Requirements:\n` +
        `1. Identify a real problem worth solving\n` +
        `2. Define the target customer\n` +
        `3. Propose a unique solution\n` +
        `4. Suggest a business model\n` +
        `5. Create a catchy name\n\n` +
        `Output: Write your findings to ${outputDir}/concept.md\n` +
        `Include: problem, solution, target market, business model, name`,

      validation: `You are a Market Researcher validating a startup idea.\n\n` +
        `Read the concept from the previous phase.\n\n` +
        `Task: Validate the market opportunity\n\n` +
        `Research:\n` +
        `1. Market size (TAM/SAM/SOM)\n` +
        `2. Competitors and differentiation\n` +
        `3. Customer willingness to pay\n` +
        `4. Market trends supporting this idea\n` +
        `5. Potential risks\n\n` +
        `Output: Write to ${outputDir}/market-validation.md`,

      design: `You are a Product Architect designing an MVP.\n\n` +
        `Read the concept and validation from previous phases.\n\n` +
        `Task: Design the Minimum Viable Product\n\n` +
        `Create:\n` +
        `1. Core features (limit to 3-5 for MVP)\n` +
        `2. User flows\n` +
        `3. Tech stack recommendation\n` +
        `4. Architecture diagram (text-based)\n` +
        `5. Database schema (if applicable)\n\n` +
        `Output: Write to ${outputDir}/mvp-design.md`,

      development: `You are a Full-Stack Developer building an MVP.\n\n` +
        `Read the design from the previous phase.\n\n` +
        `Task: Build a working prototype\n\n` +
        `Requirements:\n` +
        `1. Implement core features\n` +
        `2. Create a simple UI\n` +
        `3. Add basic error handling\n` +
        `4. Include a README with setup instructions\n` +
        `5. Make it runnable\n\n` +
        `Output: Working code in ${outputDir}/mvp/`,

      launch: `You are a Growth Hacker preparing for launch.\n\n` +
        `Review the completed MVP.\n\n` +
        `Task: Create launch materials\n\n` +
        `Create:\n` +
        `1. Landing page copy\n` +
        `2. Pitch deck (10 slides)\n` +
        `3. Product Hunt launch post\n` +
        `4. Twitter announcement thread\n` +
        `5. Go-to-market strategy\n\n` +
        `Output: Write to ${outputDir}/launch-package.md`
    };

    return templates[phase.name] || `Execute phase: ${phase.name}`;
  }

  /**
   * Spawn an agent to execute the task
   */
  async spawnAgent(agentType, task, timeoutMinutes) {
    // In real implementation, this would use OpenClaw sessions spawn
    // For now, simulate with direct execution
    
    console.log(`[StartupGen] Spawning ${agentType} for ${timeoutMinutes}min`);
    
    // Write task to file for agent to pick up
    const taskFile = path.join(WORKSPACE, '.tasks', `${Date.now()}.txt`);
    fs.mkdirSync(path.dirname(taskFile), { recursive: true });
    fs.writeFileSync(taskFile, task);
    
    // Return simulated result
    return {
      agent: agentType,
      taskFile,
      completed: true
    };
  }

  /**
   * Collect artifacts from phase directory
   */
  collectArtifacts(phaseDir) {
    if (!fs.existsSync(phaseDir)) return [];
    
    return fs.readdirSync(phaseDir, { recursive: true })
      .filter(f => fs.statSync(path.join(phaseDir, f)).isFile());
  }

  /**
   * Create final startup package
   */
  async createStartupPackage(startupId, startupDir, results) {
    const packagePath = path.join(startupDir, 'STARTUP.md');
    
    const content = `# Startup: ${startupId}

Generated: ${new Date().toISOString()}

## Phases Completed

${results.phases.map(p => `- **${p.name}**: ${p.success ? '✅' : '❌'}`).join('\n')}

## Artifacts

${results.phases.map(p => {
  if (p.artifacts?.length > 0) {
    return `### ${p.name}\n${p.artifacts.map(a => `- ${a}`).join('\n')}`;
  }
  return '';
}).filter(Boolean).join('\n\n')}

## Next Steps

1. Review the concept and validation
2. Evaluate the MVP
3. Decide: iterate, pivot, or proceed
4. If proceed: deploy MVP, start customer acquisition

---
*Generated by Neural Nexus Startup Generator*
`;

    fs.writeFileSync(packagePath, content);
    
    // Notify
    try {
      execSync(`openclaw message send --target "-5297940191" --message "🚀 Startup Generated: ${startupId}\n\nPhases: ${results.phases.filter(p => p.success).length}/${results.phases.length}\n\nReview at: ${startupDir}"`, {
        timeout: 10000
      });
    } catch {}

    console.log(`[StartupGen] Package created: ${packagePath}`);
  }

  /**
   * List all generated startups
   */
  listStartups() {
    if (!fs.existsSync(STARTUP_DIR)) return [];
    
    return fs.readdirSync(STARTUP_DIR)
      .filter(dir => fs.statSync(path.join(STARTUP_DIR, dir)).isDirectory())
      .map(dir => ({
        id: dir,
        path: path.join(STARTUP_DIR, dir),
        created: fs.statSync(path.join(STARTUP_DIR, dir)).mtime
      }));
  }
}

// Export
const generator = new StartupGenerator();

// CLI usage
if (require.main === module) {
  const command = process.argv[2];
  
  switch(command) {
    case 'generate':
      const domain = process.argv[3];
      generator.generate(domain).then(result => {
        console.log('\n✅ Startup generation complete!');
        console.log(`ID: ${result.id}`);
        console.log(`Phases completed: ${result.phases.filter(p => p.success).length}/${result.phases.length}`);
      });
      break;
    case 'list':
      const startups = generator.listStartups();
      console.log('Generated Startups:');
      startups.forEach(s => console.log(`  ${s.id} - ${s.created}`));
      break;
    default:
      console.log('Usage: node startup-generator.js [generate|list] [domain]');
  }
}

module.exports = generator;
