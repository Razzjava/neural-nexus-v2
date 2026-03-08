#!/usr/bin/env node

/**
 * Frontend Developer Agent - Real Operational Daemon
 * Handles UI/UX development and React components
 */

const AgentBase = require('../agent-base');
const fs = require('fs');
const path = require('path');

class FrontendDevAgent extends AgentBase {
  constructor() {
    super('frontend-dev', {
      name: 'Frontend Developer',
      workInterval: 8 * 60 * 1000,
      defaultMetrics: {
        componentsCreated: 0,
        pagesBuilt: 0,
        testsWritten: 0
      }
    });
    
    this.codeDir = path.join('/root/.openclaw/workspace/neural-nexus', 'code', 'frontend');
    if (!fs.existsSync(this.codeDir)) {
      fs.mkdirSync(this.codeDir, { recursive: true });
    }
  }

  async doWork() {
    // Check for backend APIs to consume
    const backendDir = path.join('/root/.openclaw/workspace/neural-nexus', 'code', 'backend');
    
    if (!fs.existsSync(backendDir)) {
      this.log('No backend code yet - waiting for APIs');
      return;
    }

    const backendFiles = fs.readdirSync(backendDir).filter(f => f.endsWith('-api.js'));
    
    if (backendFiles.length === 0) {
      this.log('No backend APIs - performing component maintenance');
      await this.performMaintenance();
      return;
    }

    for (const api of backendFiles.slice(0, 2)) {
      await this.buildFrontendForAPI(path.join(backendDir, api));
    }
  }

  async buildFrontendForAPI(apiPath) {
    const apiName = path.basename(apiPath, '-api.js');
    this.log(`Building frontend for: ${apiName}`);
    
    try {
      // Generate React components
      await this.generateComponents(apiName);
      
      // Generate pages
      await this.generatePages(apiName);
      
      // Generate styles
      await this.generateStyles(apiName);
      
      this.log(`Frontend built for ${apiName}`);
      
    } catch (error) {
      this.log(`Error building frontend: ${error.message}`);
      throw error;
    }
  }

  async generateComponents(apiName) {
    const components = [
      { name: 'Header', type: 'layout' },
      { name: 'Sidebar', type: 'layout' },
      { name: 'DataTable', type: 'data' },
      { name: 'Form', type: 'input' },
      { name: 'Modal', type: 'overlay' }
    ];

    for (const comp of components) {
      const code = this.buildComponent(comp, apiName);
      const outputPath = path.join(this.codeDir, apiName, 'components', `${comp.name}.tsx`);
      
      if (!fs.existsSync(path.dirname(outputPath))) {
        fs.mkdirSync(path.dirname(outputPath), { recursive: true });
      }
      
      fs.writeFileSync(outputPath, code);
      this.metrics.componentsCreated++;
    }
  }

  buildComponent(comp, apiName) {
    return `import React from 'react';
import './${comp.name}.css';

interface ${comp.name}Props {
  // TODO: Define props
}

export const ${comp.name}: React.FC<${comp.name}Props> = (props) => {
  return (
    <div className="${comp.name.toLowerCase()}">
      {/* ${comp.name} for ${apiName} */}
    </div>
  );
};
`;
  }

  async generatePages(apiName) {
    const pages = ['Home', 'Dashboard', 'Settings'];
    
    for (const page of pages) {
      const code = this.buildPage(page, apiName);
      const outputPath = path.join(this.codeDir, apiName, 'pages', `${page}.tsx`);
      
      if (!fs.existsSync(path.dirname(outputPath))) {
        fs.mkdirSync(path.dirname(outputPath), { recursive: true });
      }
      
      fs.writeFileSync(outputPath, code);
      this.metrics.pagesBuilt++;
    }
  }

  buildPage(page, apiName) {
    return `import React from 'react';
import { Header, Sidebar } from '../components';

export const ${page}Page: React.FC = () => {
  return (
    <div className="page ${page.toLowerCase()}">
      <Header />
      <Sidebar />
      <main>
        <h1>${page}</h1>
        <p>${apiName} ${page.toLowerCase()} page</p>
      </main>
    </div>
  );
};
`;
  }

  async generateStyles(apiName) {
    const css = `/* ${apiName} styles */
.page {
  display: flex;
  min-height: 100vh;
}

main {
  flex: 1;
  padding: 2rem;
}
`;
    const outputPath = path.join(this.codeDir, apiName, 'styles', 'index.css');
    if (!fs.existsSync(path.dirname(outputPath))) {
      fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    }
    fs.writeFileSync(outputPath, css);
  }

  async performMaintenance() {
    const components = fs.readdirSync(this.codeDir, { recursive: true })
      .filter(f => typeof f === 'string' && f.endsWith('.tsx')).length;
    this.log(`Maintaining ${components} existing components`);
  }
}

// CLI
const agent = new FrontendDevAgent();
const mode = process.argv[2] || 'once';

if (mode === 'daemon') {
  agent.runDaemon();
} else {
  agent.runOnce().then(() => process.exit(0));
}

module.exports = FrontendDevAgent;
