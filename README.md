# Knowledge Management Platform

A comprehensive knowledge management system with RAG-powered semantic search, multi-source data integration, and embeddable widget.

## Features

- 🔍 **Hybrid Search**: Combine keyword and semantic search with pgvector
- 🤖 **RAG Responses**: AI-generated answers using GPT-4 with source citations
- 📚 **Multi-Source Integration**: Connect APIs, databases, documents, and web sources
- 🔄 **Automatic Sync**: Scheduled data synchronization with BullMQ
- 📊 **Analytics Dashboard**: Track searches, queries, and feedback
- ✍️ **CMS**: Built-in content management with versioning
- 🎨 **Embeddable Widget**: Drop-in search widget for any website

## Quick Start

```bash
# Install dependencies
pnpm install

# Start infrastructure (PostgreSQL, Redis, MinIO)
pnpm docker:up

# Initialize database
cd apps/api && pnpm db:push

# Start all services
pnpm dev
```

## Project Structure

```
knowledge-platform/
├── apps/
│   ├── api/          # NestJS Backend (port 3333)
│   ├── web/          # Next.js Dashboard (port 3000)
│   └── widget/       # Embeddable Widget (port 3001)
├── packages/
│   ├── shared/       # Types, validators, constants
│   ├── connectors/   # Data source connectors
│   └── rag/          # RAG engine components
├── docker/           # Docker Compose infrastructure
└── docs/             # Documentation
```

## Tech Stack

| Component | Technology |
|-----------|------------|
| Backend | NestJS + TypeScript |
| Frontend | Next.js 14 + TailwindCSS |
| Widget | Lit Web Components |
| Database | PostgreSQL + pgvector |
| Cache/Queue | Redis + BullMQ |
| Storage | MinIO (S3-compatible) |
| AI | OpenAI (GPT-4 + Embeddings) |

## Environment Setup

Copy `.env.example` to `.env` and configure:

```env
# Required
DATABASE_URL=postgresql://knowledge:knowledge_secret@localhost:5432/knowledge_platform
REDIS_URL=redis://localhost:6379
OPENAI_API_KEY=your-api-key

# Optional
JWT_SECRET=your-secret
```

## Documentation

- [Architecture](docs/architecture.md)
- [API Reference](docs/api-reference.md)
- [Deployment Guide](docs/deployment.md)

## Widget Usage

```html
<script src="https://your-domain.com/widget.js"></script>
<knowledge-search
  api-url="https://api.example.com/api/v1"
  theme="light"
  position="bottom-right"
></knowledge-search>
```

## License

MIT
