# Knowledge Platform - Architecture

## System Overview

The Knowledge Management Platform is a modular system for integrating multiple data sources and providing intelligent, AI-powered search capabilities.

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Client Layer                                 │
│  ┌─────────────────────┐  ┌─────────────────────────────────────┐  │
│  │   Admin Dashboard   │  │  Embeddable Widget (Web Component)   │  │
│  │   (Next.js 14)      │  │         (Lit Elements)               │  │
│  └─────────────────────┘  └─────────────────────────────────────┘  │
└─────────────────────────────┬───────────────────────────────────────┘
                              │ HTTPS
┌─────────────────────────────▼───────────────────────────────────────┐
│                         API Layer                                    │
│                    NestJS Backend (TypeScript)                       │
│  ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐           │
│  │   Auth    │ │ Knowledge │ │  Search   │ │  Sources  │           │
│  │  Module   │ │  Module   │ │(RAG+Hybrid│ │  Module   │           │
│  └───────────┘ └───────────┘ └───────────┘ └───────────┘           │
│  ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐           │
│  │   Sync    │ │ Analytics │ │    CMS    │ │ Webhooks  │           │
│  │  Module   │ │  Module   │ │  Module   │ │  Module   │           │
│  └───────────┘ └───────────┘ └───────────┘ └───────────┘           │
└────────────────────────┬────────────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────────────┐
│                      Data Layer                                      │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │              PostgreSQL 16 + pgvector Extension                 │ │
│  │   • Users, Sources, Documents, Chunks (with embeddings)        │ │
│  │   • Content (CMS), Analytics Events, Sync Logs                 │ │
│  └────────────────────────────────────────────────────────────────┘ │
│  ┌─────────────────────┐  ┌──────────────────────────────────────┐ │
│  │       Redis         │  │              MinIO                    │ │
│  │  • Session cache    │  │  • Document storage (S3-compatible)  │ │
│  │  • Rate limiting    │  │  • PDF, Word, Excel files            │ │
│  │  • BullMQ queues    │  └──────────────────────────────────────┘ │
│  └─────────────────────┘                                            │
└─────────────────────────────────────────────────────────────────────┘
```

## Technology Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| Backend | NestJS + TypeScript | Modular API framework |
| Frontend | Next.js 14 + TailwindCSS | Admin dashboard |
| Widget | Lit + Vite | Embeddable Web Components |
| Database | PostgreSQL 16 + pgvector | Data storage + vector search |
| Cache | Redis | Sessions, rate limiting, job queues |
| Storage | MinIO | S3-compatible document storage |
| AI | OpenAI API | Embeddings (text-embedding-3-small) + GPT-4 |

## Core Modules

### Auth Module
- JWT-based authentication with refresh tokens
- Role-based access control (ADMIN, EDITOR, VIEWER)
- Password hashing with bcrypt

### Knowledge Module
- Document CRUD operations
- Chunk management for semantic search
- Statistics and metadata tracking

### Search Module
- **Keyword Search**: PostgreSQL full-text search
- **Semantic Search**: pgvector cosine similarity
- **Hybrid Search**: Weighted combination (70% semantic, 30% keyword)
- **RAG**: Context-augmented generation with GPT-4

### Sources Module
- Data source configuration (API, Document, Web)
- Connection testing
- Connector factory pattern

### Sync Module
- BullMQ job queues for async processing
- Document fetching from sources
- Automatic chunking and embedding generation
- Progress tracking and error handling

### Analytics Module
- Event tracking (searches, RAG queries, feedback)
- Dashboard statistics
- Top queries and usage trends

### CMS Module
- Content management with versioning
- Status workflow (Draft → Review → Published → Archived)
- Slug-based routing

## Data Flow

### Document Ingestion
```
Source → Connector → Fetch → Chunk → Embed → Store
```

1. User creates/triggers sync for a Source
2. Appropriate connector fetches documents
3. Documents are split into semantic chunks
4. OpenAI generates embeddings for each chunk
5. Chunks with embeddings stored in PostgreSQL

### Search Query
```
Query → Embed → Hybrid Search → Rerank → RAG → Response
```

1. User submits a search query
2. Query is embedded using OpenAI
3. Hybrid search combines keyword + vector results
4. Results are optionally reranked
5. RAG generates contextual answer using GPT-4
6. Response includes answer + source documents

## Shared Packages

- `@knowledge-platform/shared`: Types, validators (Zod), constants
- `@knowledge-platform/connectors`: API, Document, Web connectors
- `@knowledge-platform/rag`: Embedding, chunking, retrieval, reranking
