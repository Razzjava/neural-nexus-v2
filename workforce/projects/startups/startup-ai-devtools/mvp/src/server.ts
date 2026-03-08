import Fastify from 'fastify';
import cors from '@fastify/cors';
import { config } from './config';
import { registerRoutes } from './routes';
import { githubIntegration } from './github';

/**
 * SentinelCode MVP Server
 * Fastify-based API server
 */
async function main() {
  const app = Fastify({
    logger: {
      level: config.isDevelopment() ? 'debug' : 'info',
    },
  });

  // CORS
  await app.register(cors, {
    origin: config.isDevelopment() 
      ? ['http://localhost:3000', 'http://localhost:5173'] 
      : ['https://sentinelcode.io'],
    credentials: true,
  });

  // GitHub webhook middleware
  const githubMiddleware = githubIntegration.getMiddleware();
  app.addHook('onRequest', async (request, reply) => {
    if (request.url === '/webhooks/github') {
      // Let the GitHub middleware handle this
      return;
    }
  });

  // Raw body handling for GitHub webhooks
  app.addContentTypeParser('application/json', { parseAs: 'string' }, (req, body, done) => {
    try {
      const json = JSON.parse(body as string);
      done(null, json);
    } catch {
      done(new Error('Invalid JSON'), undefined);
    }
  });

  // Register routes
  await registerRoutes(app);

  // Error handler
  app.setErrorHandler((error, request, reply) => {
    app.log.error(error);
    reply.status(500).send({
      error: 'Internal Server Error',
      message: config.isDevelopment() ? error.message : undefined,
    });
  });

  // Start server
  try {
    await app.listen({ port: config.port, host: '0.0.0.0' });
    app.log.info(`🚀 SentinelCode MVP server running on port ${config.port}`);
    app.log.info(`📊 Health check: http://localhost:${config.port}/health`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

main();
