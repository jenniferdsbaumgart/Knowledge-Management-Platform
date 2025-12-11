// API Constants
export const API_VERSION = 'v1';
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

// Rate Limiting
export const RATE_LIMIT = {
    DEFAULT_TTL: 60, // seconds
    DEFAULT_LIMIT: 100, // requests per TTL
    SEARCH_LIMIT: 30,
    RAG_LIMIT: 10,
} as const;

// Embedding Configuration
export const EMBEDDING = {
    MODEL: 'text-embedding-3-small',
    DIMENSIONS: 1536,
    MAX_TOKENS: 8191,
} as const;

// Chunking Configuration
export const CHUNKING = {
    DEFAULT_SIZE: 512,
    MIN_SIZE: 100,
    MAX_SIZE: 2000,
    OVERLAP: 50,
} as const;

// Search Configuration
export const SEARCH = {
    DEFAULT_LIMIT: 10,
    MAX_LIMIT: 100,
    KEYWORD_WEIGHT: 0.3,
    SEMANTIC_WEIGHT: 0.7,
    RERANK_TOP_K: 50,
} as const;

// File Types
export const SUPPORTED_FILE_TYPES = {
    DOCUMENTS: ['.pdf', '.docx', '.doc', '.txt', '.md'],
    SPREADSHEETS: ['.xlsx', '.xls', '.csv'],
    PRESENTATIONS: ['.pptx', '.ppt'],
} as const;

export const ALL_SUPPORTED_FILE_TYPES = [
    ...SUPPORTED_FILE_TYPES.DOCUMENTS,
    ...SUPPORTED_FILE_TYPES.SPREADSHEETS,
    ...SUPPORTED_FILE_TYPES.PRESENTATIONS,
] as const;

// Sync Configuration
export const SYNC = {
    DEFAULT_BATCH_SIZE: 100,
    MAX_RETRIES: 3,
    RETRY_DELAY: 1000, // ms
    CONCURRENT_JOBS: 5,
} as const;

// Cache TTL (in seconds)
export const CACHE_TTL = {
    SEARCH_RESULTS: 300, // 5 minutes
    DOCUMENT_METADATA: 3600, // 1 hour
    USER_SESSION: 86400, // 24 hours
    ANALYTICS: 60, // 1 minute
} as const;

// Error Codes
export const ERROR_CODES = {
    // Auth errors
    UNAUTHORIZED: 'AUTH_001',
    INVALID_CREDENTIALS: 'AUTH_002',
    TOKEN_EXPIRED: 'AUTH_003',
    INSUFFICIENT_PERMISSIONS: 'AUTH_004',

    // Resource errors
    NOT_FOUND: 'RESOURCE_001',
    ALREADY_EXISTS: 'RESOURCE_002',
    VALIDATION_ERROR: 'RESOURCE_003',

    // Source errors
    SOURCE_CONNECTION_FAILED: 'SOURCE_001',
    SOURCE_SYNC_FAILED: 'SOURCE_002',
    UNSUPPORTED_SOURCE_TYPE: 'SOURCE_003',

    // Search errors
    SEARCH_FAILED: 'SEARCH_001',
    INVALID_QUERY: 'SEARCH_002',

    // RAG errors
    RAG_GENERATION_FAILED: 'RAG_001',
    CONTEXT_TOO_LONG: 'RAG_002',

    // System errors
    INTERNAL_ERROR: 'SYSTEM_001',
    RATE_LIMIT_EXCEEDED: 'SYSTEM_002',
    SERVICE_UNAVAILABLE: 'SYSTEM_003',
} as const;

// WebSocket Events
export const WS_EVENTS = {
    // Sync events
    SYNC_STARTED: 'sync:started',
    SYNC_PROGRESS: 'sync:progress',
    SYNC_COMPLETED: 'sync:completed',
    SYNC_FAILED: 'sync:failed',

    // Search events
    SEARCH_RESULT: 'search:result',

    // Analytics events
    ANALYTICS_UPDATE: 'analytics:update',
} as const;

// Queue Names
export const QUEUE_NAMES = {
    SYNC: 'sync-queue',
    EMBEDDING: 'embedding-queue',
    INDEXING: 'indexing-queue',
    ANALYTICS: 'analytics-queue',
} as const;

// Content Status Workflow
export const CONTENT_STATUS_TRANSITIONS = {
    DRAFT: ['REVIEW', 'ARCHIVED'],
    REVIEW: ['DRAFT', 'PUBLISHED', 'ARCHIVED'],
    PUBLISHED: ['DRAFT', 'ARCHIVED'],
    ARCHIVED: ['DRAFT'],
} as const;
