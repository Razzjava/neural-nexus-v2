# SentinelCode MVP

AI-generated code quality guardian.

## Quick Start

```bash
# Install dependencies
npm install

# Setup environment
cp .env.example .env
# Edit .env with your credentials

# Start database and cache
docker-compose up -d

# Run migrations
npm run migrate

# Start development server
npm run dev
```

## Environment Variables

```bash
PORT=3000
NODE_ENV=development

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/sentinelcode

# Redis
REDIS_URL=redis://localhost:6379

# Clerk Auth
CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# GitHub App
GITHUB_APP_ID=123456
GITHUB_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\n..."
GITHUB_WEBHOOK_SECRET=webhook_secret
```

## Project Structure

```
src/
├── config/         # Configuration
├── db/             # Database schema and migrations
├── github/         # GitHub App integration
├── routes/         # API routes
├── scanner/        # Security scanning engine
├── services/       # Business logic
├── types/          # TypeScript types
└── server.ts       # Entry point
```

## API Endpoints

- `POST /webhooks/github` - GitHub App webhooks
- `GET /health` - Health check

## License

MIT
