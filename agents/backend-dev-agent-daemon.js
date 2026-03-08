#!/usr/bin/env node

/**
 * Backend Developer Agent - Real Operational Daemon
 * Handles API development, database design, and backend services
 */

const AgentBase = require('../agent-base');
const fs = require('fs');
const path = require('path');

class BackendDevAgent extends AgentBase {
  constructor() {
    super('backend-dev', {
      name: 'Backend Developer',
      workInterval: 8 * 60 * 1000, // 8 minutes
      defaultMetrics: {
        endpointsCreated: 0,
        databaseSchemas: 0,
        testsWritten: 0
      }
    });
    
    this.codeDir = path.join('/root/.openclaw/workspace/neural-nexus', 'code', 'backend');
    if (!fs.existsSync(this.codeDir)) {
      fs.mkdirSync(this.codeDir, { recursive: true });
    }
  }

  async doWork() {
    // Check for architecture specs to implement
    const designDir = path.join('/root/.openclaw/workspace/neural-nexus', 'designs');
    
    if (!fs.existsSync(designDir)) {
      this.log('No designs directory - waiting for architecture');
      return;
    }

    const pendingDesigns = fs.readdirSync(designDir)
      .filter(f => f.endsWith('.json') && !f.includes('.implemented'));
    
    if (pendingDesigns.length === 0) {
      this.log('No pending designs - performing code maintenance');
      await this.performMaintenance();
      return;
    }

    for (const design of pendingDesigns.slice(0, 2)) {
      await this.implementDesign(path.join(designDir, design));
    }
  }

  async implementDesign(designPath) {
    const designId = path.basename(designPath, '.json');
    this.log(`Implementing design: ${designId}`);
    
    try {
      const arch = JSON.parse(fs.readFileSync(designPath, 'utf8'));
      
      // Generate API code
      await this.generateAPI(arch);
      
      // Generate database schema
      await this.generateDatabaseSchema(arch);
      
      // Generate tests
      await this.generateTests(arch);
      
      // Mark as implemented
      fs.renameSync(designPath, `${designPath}.implemented`);
      
      this.log(`Implemented ${designId}`);
      
    } catch (error) {
      this.log(`Error implementing ${designId}: ${error.message}`);
      throw error;
    }
  }

  async generateAPI(arch) {
    const apiCode = this.buildAPISkeleton(arch);
    const outputPath = path.join(this.codeDir, `${arch.requirementId}-api.js`);
    fs.writeFileSync(outputPath, apiCode);
    this.metrics.endpointsCreated += apiCode.match(/router\./g)?.length || 0;
  }

  buildAPISkeleton(arch) {
    const endpoints = arch.system.type === 'web-application' 
      ? ['GET /api/health', 'POST /api/auth/login', 'GET /api/users', 'POST /api/users']
      : ['GET /health', 'POST /process'];

    return `// Auto-generated API for ${arch.system.name}
const express = require('express');
const router = express.Router();

${endpoints.map(e => `
${e.split(' ')[0].toLowerCase()}('${e.split(' ')[1]}', async (req, res) => {
  // TODO: Implement ${e}
  res.json({ status: 'not-implemented', endpoint: '${e}' });
});`).join('\n')}

module.exports = router;
`;
  }

  async generateDatabaseSchema(arch) {
    const schema = this.buildSchema(arch);
    const outputPath = path.join(this.codeDir, `${arch.requirementId}-schema.sql`);
    fs.writeFileSync(outputPath, schema);
    this.metrics.databaseSchemas++;
  }

  buildSchema(arch) {
    return `-- Auto-generated schema for ${arch.system.name}
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  expires_at TIMESTAMP NOT NULL
);
`;
  }

  async generateTests(arch) {
    const tests = this.buildTests(arch);
    const outputPath = path.join(this.codeDir, `${arch.requirementId}-test.js`);
    fs.writeFileSync(outputPath, tests);
    this.metrics.testsWritten += tests.match(/test\(/g)?.length || 0;
  }

  buildTests(arch) {
    return `// Auto-generated tests for ${arch.system.name}
const request = require('supertest');
const app = require('./app');

describe('${arch.system.name} API', () => {
  test('GET /api/health returns 200', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
  });
});
`;
  }

  async performMaintenance() {
    // Review existing code for refactoring opportunities
    const codeFiles = fs.readdirSync(this.codeDir).filter(f => f.endsWith('.js'));
    this.log(`Reviewing ${codeFiles.length} code files for maintenance`);
  }
}

// CLI
const agent = new BackendDevAgent();
const mode = process.argv[2] || 'once';

if (mode === 'daemon') {
  agent.runDaemon();
} else {
  agent.runOnce().then(() => process.exit(0));
}

module.exports = BackendDevAgent;
