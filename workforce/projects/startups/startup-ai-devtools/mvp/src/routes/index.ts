import { FastifyInstance } from 'fastify';
import { securityScanner } from '../scanner';
import { CodeContext } from '../types';

/**
 * API Routes
 * RESTful endpoints for the web application
 */
export async function registerRoutes(app: FastifyInstance) {
  
  // Health check
  app.get('/health', async () => {
    return { 
      status: 'ok', 
      version: '0.1.0',
      timestamp: new Date().toISOString(),
    };
  });

  // Scan code endpoint (for IDE integration)
  app.post('/api/v1/scan', async (request, reply) => {
    const body = request.body as {
      code: string;
      language: string;
      filePath: string;
      repositoryId?: string;
    };

    if (!body.code || !body.language) {
      return reply.status(400).send({
        error: 'Missing required fields: code, language',
      });
    }

    try {
      // Detect if AI-generated
      const aiCheck = await securityScanner.detectAIGenerated(body.code);
      
      const context: CodeContext = {
        filePath: body.filePath || 'unknown',
        language: body.language,
        repositoryId: body.repositoryId || 'unknown',
      };

      const result = await securityScanner.scan(body.code, body.language, context);

      return {
        aiGenerated: aiCheck,
        scan: result,
        scannedAt: new Date().toISOString(),
      };
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({
        error: 'Scan failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // Quick scan endpoint (lightweight for real-time IDE feedback)
  app.post('/api/v1/scan/quick', async (request, reply) => {
    const body = request.body as {
      code: string;
      language: string;
      filePath: string;
    };

    if (!body.code || !body.language) {
      return reply.status(400).send({
        error: 'Missing required fields',
      });
    }

    try {
      const context: CodeContext = {
        filePath: body.filePath,
        language: body.language,
        repositoryId: 'unknown',
      };

      const result = await securityScanner.scan(body.code, body.language, context);

      // Return simplified response for IDE
      return {
        hasIssues: result.vulnerabilities.length > 0,
        issueCount: result.vulnerabilities.length,
        criticalCount: result.summary.critical,
        highCount: result.summary.high,
        issues: result.vulnerabilities.slice(0, 5).map(v => ({
          ruleId: v.ruleId,
          severity: v.severity,
          line: v.lineStart,
          message: v.message,
        })),
      };
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({
        error: 'Quick scan failed',
      });
    }
  });

  // Detect AI-generated code
  app.post('/api/v1/detect-ai', async (request, reply) => {
    const body = request.body as { code: string };

    if (!body.code) {
      return reply.status(400).send({
        error: 'Missing required field: code',
      });
    }

    try {
      const result = await securityScanner.detectAIGenerated(body.code);
      return {
        result,
        analyzedAt: new Date().toISOString(),
      };
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({
        error: 'Detection failed',
      });
    }
  });

  // Get organization stats (placeholder)
  app.get('/api/v1/orgs/:orgId/stats', async (request) => {
    const { orgId } = request.params as { orgId: string };
    
    // Placeholder - would query database in full implementation
    return {
      organizationId: orgId,
      totalScans: 0,
      totalIssues: 0,
      issuesBySeverity: {
        critical: 0,
        high: 0,
        medium: 0,
        low: 0,
      },
      repositories: [],
    };
  });

  // Get repository stats (placeholder)
  app.get('/api/v1/repos/:repoId/stats', async (request) => {
    const { repoId } = request.params as { repoId: string };
    
    return {
      repositoryId: repoId,
      totalScans: 0,
      totalIssues: 0,
      lastScanAt: null,
      aiGeneratedLines: 0,
    };
  });

  // List security rules
  app.get('/api/v1/rules', async () => {
    return {
      rules: [
        {
          id: 'ai-hardcoded-secret',
          name: 'Hardcoded Secret in AI-Generated Code',
          severity: 'critical',
          cweId: 'CWE-798',
          owaspCategory: 'A07:2021',
          languages: ['javascript', 'typescript', 'python', 'java', 'go'],
        },
        {
          id: 'ai-sql-injection',
          name: 'SQL Injection in AI-Generated Code',
          severity: 'critical',
          cweId: 'CWE-89',
          owaspCategory: 'A03:2021',
          languages: ['javascript', 'typescript', 'python', 'java'],
        },
        {
          id: 'ai-xss-innerhtml',
          name: 'XSS via innerHTML in AI-Generated Code',
          severity: 'high',
          cweId: 'CWE-79',
          owaspCategory: 'A03:2021',
          languages: ['javascript', 'typescript'],
        },
        {
          id: 'ai-command-injection',
          name: 'Command Injection in AI-Generated Code',
          severity: 'critical',
          cweId: 'CWE-78',
          owaspCategory: 'A03:2021',
          languages: ['javascript', 'typescript', 'python'],
        },
        {
          id: 'ai-path-traversal',
          name: 'Path Traversal in AI-Generated Code',
          severity: 'high',
          cweId: 'CWE-22',
          owaspCategory: 'A01:2021',
          languages: ['javascript', 'typescript', 'python', 'java'],
        },
      ],
    };
  });

  // Webhook handler for GitHub
  app.post('/webhooks/github', async (request, reply) => {
    // Handled by GitHub integration middleware
    reply.status(200).send({ received: true });
  });
}
