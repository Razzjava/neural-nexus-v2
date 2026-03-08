import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  
  database: {
    url: process.env.DATABASE_URL || 'postgresql://localhost:5432/sentinelcode',
  },
  
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },
  
  clerk: {
    publishableKey: process.env.CLERK_PUBLISHABLE_KEY || '',
    secretKey: process.CLERK_SECRET_KEY || '',
  },
  
  github: {
    appId: process.env.GITHUB_APP_ID || '',
    privateKey: (process.env.GITHUB_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
    webhookSecret: process.env.GITHUB_WEBHOOK_SECRET || '',
  },
  
  isDevelopment(): boolean {
    return this.nodeEnv === 'development';
  },
  
  isProduction(): boolean {
    return this.nodeEnv === 'production';
  },
};
