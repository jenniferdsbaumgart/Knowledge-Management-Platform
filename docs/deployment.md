# Knowledge Platform - Deployment Guide

## Prerequisites

- Node.js 20+
- pnpm 8+
- Docker & Docker Compose
- OpenAI API key

## Local Development

### 1. Clone and Install

```bash
cd knowledge-platform
pnpm install
```

### 2. Environment Configuration

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` with your settings:
- Set `OPENAI_API_KEY` with your OpenAI key
- Adjust `JWT_SECRET` for production

### 3. Start Infrastructure

```bash
pnpm docker:up
```

This starts:
- PostgreSQL (port 5432) with pgvector
- Redis (port 6379)
- MinIO (ports 9000, 9001)

### 4. Initialize Database

```bash
cd apps/api
pnpm db:generate
pnpm db:push
```

### 5. Start Development Servers

```bash
# From root directory
pnpm dev
```

Or individually:
```bash
# API (port 3333)
cd apps/api && pnpm dev

# Web Dashboard (port 3000)
cd apps/web && pnpm dev

# Widget (port 3001)
cd apps/widget && pnpm dev
```

## Production Deployment

### Option 1: Docker Compose (Recommended)

Create a production `docker-compose.prod.yml`:

```yaml
version: '3.8'
services:
  api:
    build: ./apps/api
    ports:
      - "3333:3333"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://...
      - REDIS_URL=redis://redis:6379
      - OPENAI_API_KEY=${OPENAI_API_KEY}
    depends_on:
      - postgres
      - redis

  web:
    build: ./apps/web
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_API_URL=https://api.yourdomain.com

  postgres:
    image: pgvector/pgvector:pg16
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data

  minio:
    image: minio/minio
    volumes:
      - minio_data:/data
```

### Option 2: Kubernetes

See `k8s/` directory for Kubernetes manifests.

### Option 3: Serverless

Deploy to Vercel (Next.js) + Railway/Render (NestJS API).

## Widget Deployment

### Build the Widget

```bash
cd apps/widget
pnpm build
```

This generates `dist/widget.js` and `dist/widget.es.js`.

### Embed in Your Site

```html
<script src="https://cdn.yourdomain.com/widget.js"></script>
<knowledge-search
  api-url="https://api.yourdomain.com/api/v1"
  api-key="your-widget-api-key"
  theme="light"
  position="bottom-right"
></knowledge-search>
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `REDIS_URL` | Redis connection string | Yes |
| `OPENAI_API_KEY` | OpenAI API key | Yes |
| `JWT_SECRET` | JWT signing secret | Yes |
| `JWT_EXPIRES_IN` | Token expiry (e.g., "7d") | No |
| `MINIO_ENDPOINT` | MinIO/S3 endpoint | For document sources |
| `MINIO_ACCESS_KEY` | MinIO/S3 access key | For document sources |
| `MINIO_SECRET_KEY` | MinIO/S3 secret key | For document sources |

## Health Checks

- API: `GET /api/v1/health`
- Database: Run `prisma db push --preview-feature`
- Redis: `redis-cli ping`

## Monitoring

Recommended tools:
- **Logs**: Docker logs, CloudWatch, or Datadog
- **APM**: New Relic, Datadog APM
- **Uptime**: Pingdom, UptimeRobot

## Backup

### Database Backup
```bash
pg_dump $DATABASE_URL > backup.sql
```

### Document Storage
Use MinIO client or S3 sync:
```bash
mc mirror minio/knowledge-documents ./backup
```

## Scaling

- **API**: Horizontal scaling behind load balancer
- **Workers**: Scale BullMQ workers independently
- **Database**: Read replicas for search queries
- **Redis**: Redis Cluster for high availability
