# Knowledge Management Platform

A comprehensive knowledge management system with RAG-powered semantic search, multi-source data integration, multi-tenant architecture, and embeddable widget.

## Features

- 🔍 **Hybrid Search**: Combine keyword and semantic search with pgvector
- 🤖 **RAG Responses**: AI-generated answers using GPT-4 with source citations
- 📚 **Multi-Source Integration**: Connect APIs, databases, documents, and web sources
- 🔄 **Automatic Sync**: Scheduled data synchronisation with BullMQ
- 📊 **Analytics Dashboard**: Track searches, queries, and feedback
- ✍️ **CMS**: Built-in content management with versioning
- 🎨 **Embeddable Widget**: Drop-in search widget for any website
- 👥 **Multi-Tenant**: Organisation-based data isolation with role-based access
- ❓ **FAQ Management**: AI-powered FAQ generation and RAG chat

## Multi-Tenant Architecture

The platform supports multi-tenant architecture with role-based access control:

| Role | Description | Permissions |
|------|-------------|-------------|
| **SUPER_ADMIN** | Platform administrator | Full access to all organisations and features |
| **ADMIN** | Organisation administrator | Manage users, sources, and content within organisation |
| **CLIENT** | Regular user | Manage sources and FAQs within organisation |

### Data Isolation

- Each organisation has isolated data (sources, documents, FAQs, analytics)
- Users can only access data from their assigned organisation
- SUPER_ADMIN can switch between organisations for management

## Quick Start

```bash
# Install dependencies
pnpm install

# Start infrastructure (PostgreSQL, Redis, MinIO)
pnpm docker:up

# Initialise database
cd apps/api && pnpm db:push

# Start all services
pnpm dev
```

## Project Structure

```
knowledge-platform/
├── apps/
│   ├── api/              # NestJS Backend (port 3333)
│   │   └── modules/
│   │       ├── auth/     # Authentication & registration
│   │       ├── users/    # User management (CRUD)
│   │       ├── organisations/  # Multi-tenant management
│   │       ├── sources/  # Data source connectors
│   │       ├── knowledge/# Document & chunk management
│   │       ├── faq/      # FAQ management & RAG
│   │       └── analytics/# Usage tracking
│   ├── web/              # Next.js Dashboard (port 3000)
│   └── widget/           # Embeddable Widget (port 3001)
├── packages/
│   ├── shared/           # Types, validators, constants
│   ├── connectors/       # Data source connectors
│   └── rag/              # RAG engine components
├── docker/               # Docker Compose infrastructure
└── docs/                 # Documentation
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

## API Endpoints

### Authentication
- `POST /api/v1/auth/register` - Register new user
- `POST /api/v1/auth/login` - User login

### Users (ADMIN+)
- `GET /api/v1/users` - List users in organisation
- `POST /api/v1/users` - Create new user
- `PUT /api/v1/users/:id` - Update user
- `DELETE /api/v1/users/:id` - Delete user

### Organisations
- `GET /api/v1/organisations/current` - Get current user's organisation
- `GET /api/v1/organisations` - List all organisations (SUPER_ADMIN)
- `POST /api/v1/organisations/switch` - Switch organisation context (SUPER_ADMIN)

### Sources
- `GET /api/v1/sources` - List data sources
- `POST /api/v1/sources` - Create data source
- `POST /api/v1/sources/:id/test` - Test connection

### FAQ
- `GET /api/v1/faq` - List FAQ entries
- `POST /api/v1/faq/generate` - Generate FAQs from source
- `POST /api/v1/organisations/:orgId/faq-rag/chat` - RAG chat

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

## Licence

MIT
