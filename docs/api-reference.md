# Knowledge Platform - API Reference

Base URL: `http://localhost:3333/api/v1`

## Authentication

All endpoints (except `/auth/*`) require a Bearer token.

```
Authorization: Bearer <jwt_token>
```

---

## Auth Endpoints

### POST /auth/register
Register a new user.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123",
  "name": "John Doe"
}
```

**Response:** `201 Created`
```json
{
  "user": { "id": "uuid", "email": "...", "name": "...", "role": "VIEWER" },
  "accessToken": "jwt...",
  "refreshToken": "jwt..."
}
```

### POST /auth/login
Login with credentials.

### POST /auth/logout
Logout current user. (Requires auth)

### POST /auth/refresh
Refresh access token.

---

## Knowledge Endpoints

### GET /knowledge
List documents with pagination.

**Query params:** `page`, `limit`, `sourceId`, `status`, `search`

### GET /knowledge/:id
Get single document with chunks.

### POST /knowledge
Create a document. (ADMIN, EDITOR)

### PUT /knowledge/:id
Update a document. (ADMIN, EDITOR)

### DELETE /knowledge/:id
Delete a document. (ADMIN)

### GET /knowledge/stats
Get knowledge base statistics.

---

## Search Endpoints

### POST /search
Search the knowledge base.

**Request:**
```json
{
  "query": "How do I reset my password?",
  "limit": 10,
  "mode": "hybrid",
  "sourceIds": ["uuid1", "uuid2"]
}
```

**Response:**
```json
{
  "results": [
    {
      "id": "chunk-uuid",
      "documentId": "doc-uuid",
      "documentTitle": "User Guide",
      "content": "To reset your password...",
      "score": 0.89
    }
  ],
  "total": 15,
  "query": "How do I reset my password?",
  "took": 125
}
```

### POST /search/rag
RAG query with AI-generated response.

**Request:**
```json
{
  "query": "How do I reset my password?",
  "maxTokens": 1024,
  "temperature": 0.7
}
```

**Response:**
```json
{
  "answer": "To reset your password, follow these steps: [1] Go to...",
  "sources": [...],
  "usage": {
    "promptTokens": 500,
    "completionTokens": 150,
    "totalTokens": 650
  }
}
```

---

## Sources Endpoints

### GET /sources
List data sources.

### GET /sources/:id
Get source details with sync logs.

### POST /sources
Create a data source. (ADMIN)

**Request:**
```json
{
  "name": "Company Docs",
  "type": "DOCUMENT",
  "config": {
    "type": "DOCUMENT",
    "storageType": "local",
    "path": "/data/docs",
    "fileTypes": [".pdf", ".docx"]
  }
}
```

### PUT /sources/:id
Update a source. (ADMIN)

### DELETE /sources/:id
Delete a source. (ADMIN)

### POST /sources/:id/test
Test source connection. (ADMIN)

---

## Sync Endpoints

### POST /sync/:sourceId
Trigger sync for a source. (ADMIN, EDITOR)

### GET /sync/:sourceId/status
Get sync status.

### GET /sync/logs
List sync logs.

### POST /sync/:sourceId/cancel
Cancel running sync. (ADMIN)

---

## Analytics Endpoints

### GET /analytics/dashboard
Get dashboard statistics.

**Query params:** `days` (default: 30)

### GET /analytics/events
List analytics events. (ADMIN)

---

## CMS Endpoints

### GET /cms
List content.

### GET /cms/:id
Get content by ID.

### GET /cms/slug/:slug
Get content by slug.

### POST /cms
Create content. (ADMIN, EDITOR)

### PUT /cms/:id
Update content. (ADMIN, EDITOR)

### DELETE /cms/:id
Delete content. (ADMIN)

### POST /cms/:id/publish
Publish content. (ADMIN, EDITOR)

### POST /cms/:id/unpublish
Unpublish content. (ADMIN, EDITOR)

---

## Webhooks Endpoints

### POST /webhooks/feedback
Submit user feedback (public endpoint for widget).

**Request:**
```json
{
  "rating": "positive",
  "queryId": "optional-query-id",
  "comment": "Very helpful!"
}
```

---

## Error Responses

```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "error": "Bad Request"
}
```

Common status codes:
- `400` - Bad Request (validation error)
- `401` - Unauthorized (missing/invalid token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `429` - Too Many Requests
- `500` - Internal Server Error
