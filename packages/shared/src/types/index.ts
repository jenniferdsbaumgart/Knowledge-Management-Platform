// User types
export interface User {
    id: string;
    email: string;
    name: string;
    role: UserRole;
    createdAt: Date;
    updatedAt: Date;
}

export enum UserRole {
    ADMIN = 'ADMIN',
    EDITOR = 'EDITOR',
    VIEWER = 'VIEWER',
}

// Source types
export interface Source {
    id: string;
    name: string;
    description?: string;
    type: SourceType;
    config: SourceConfig;
    status: SyncStatus;
    lastSyncAt?: Date;
    syncSchedule?: string;
    createdAt: Date;
    updatedAt: Date;
}

export enum SourceType {
    API = 'API',
    DATABASE = 'DATABASE',
    DOCUMENT = 'DOCUMENT',
    WEB = 'WEB',
}

export enum SyncStatus {
    IDLE = 'IDLE',
    SYNCING = 'SYNCING',
    SUCCESS = 'SUCCESS',
    FAILED = 'FAILED',
}

export type SourceConfig =
    | ApiSourceConfig
    | DatabaseSourceConfig
    | DocumentSourceConfig
    | WebSourceConfig;

export interface ApiSourceConfig {
    type: 'API';
    url: string;
    method: 'GET' | 'POST';
    headers?: Record<string, string>;
    authType?: 'none' | 'bearer' | 'basic' | 'api_key';
    authConfig?: Record<string, string>;
}

export interface DatabaseSourceConfig {
    type: 'DATABASE';
    dialect: 'postgresql' | 'mysql' | 'mssql' | 'mongodb';
    connectionString: string;
    query?: string;
    tables?: string[];
}

export interface DocumentSourceConfig {
    type: 'DOCUMENT';
    storageType: 'local' | 's3' | 'minio';
    path: string;
    fileTypes: string[];
}

export interface WebSourceConfig {
    type: 'WEB';
    url: string;
    depth: number;
    selectors?: {
        content?: string;
        title?: string;
        links?: string;
    };
}

// Document types
export interface Document {
    id: string;
    sourceId: string;
    title: string;
    content: string;
    metadata: DocumentMetadata;
    status: DocumentStatus;
    createdAt: Date;
    updatedAt: Date;
}

export interface DocumentMetadata {
    url?: string;
    filePath?: string;
    fileType?: string;
    author?: string;
    language?: string;
    wordCount?: number;
    customFields?: Record<string, unknown>;
}

export enum DocumentStatus {
    PENDING = 'PENDING',
    PROCESSING = 'PROCESSING',
    INDEXED = 'INDEXED',
    FAILED = 'FAILED',
}

// Chunk types
export interface Chunk {
    id: string;
    documentId: string;
    content: string;
    embedding?: number[];
    metadata: ChunkMetadata;
    createdAt: Date;
}

export interface ChunkMetadata {
    startIndex: number;
    endIndex: number;
    pageNumber?: number;
    section?: string;
    headings?: string[];
}

// Search types
export interface SearchQuery {
    query: string;
    filters?: SearchFilters;
    limit?: number;
    offset?: number;
    includeMetadata?: boolean;
}

export interface SearchFilters {
    sourceIds?: string[];
    documentIds?: string[];
    dateFrom?: Date;
    dateTo?: Date;
    metadata?: Record<string, unknown>;
}

export interface SearchResult {
    id: string;
    documentId: string;
    documentTitle: string;
    content: string;
    score: number;
    metadata: ChunkMetadata;
    highlights?: string[];
}

export interface SearchResponse {
    results: SearchResult[];
    total: number;
    query: string;
    took: number;
}

// RAG types
export interface RAGQuery {
    query: string;
    conversationHistory?: ConversationMessage[];
    filters?: SearchFilters;
    maxTokens?: number;
    temperature?: number;
}

export interface ConversationMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
}

export interface RAGResponse {
    answer: string;
    sources: SearchResult[];
    conversationId?: string;
    usage?: {
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
    };
}

// CMS types
export interface Content {
    id: string;
    title: string;
    slug: string;
    body: string;
    status: ContentStatus;
    authorId: string;
    publishedAt?: Date;
    version: number;
    createdAt: Date;
    updatedAt: Date;
}

export enum ContentStatus {
    DRAFT = 'DRAFT',
    REVIEW = 'REVIEW',
    PUBLISHED = 'PUBLISHED',
    ARCHIVED = 'ARCHIVED',
}

// Analytics types
export interface AnalyticsEvent {
    id: string;
    type: AnalyticsEventType;
    userId?: string;
    metadata: Record<string, unknown>;
    timestamp: Date;
}

export enum AnalyticsEventType {
    SEARCH = 'SEARCH',
    RAG_QUERY = 'RAG_QUERY',
    DOCUMENT_VIEW = 'DOCUMENT_VIEW',
    FEEDBACK = 'FEEDBACK',
    SYNC_STARTED = 'SYNC_STARTED',
    SYNC_COMPLETED = 'SYNC_COMPLETED',
}

export interface AnalyticsSummary {
    totalSearches: number;
    totalRAGQueries: number;
    averageResponseTime: number;
    topQueries: { query: string; count: number }[];
    feedbackStats: {
        positive: number;
        negative: number;
    };
}

// API response types
export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: ApiError;
    meta?: {
        page?: number;
        limit?: number;
        total?: number;
    };
}

export interface ApiError {
    code: string;
    message: string;
    details?: Record<string, unknown>;
}

// Pagination
export interface PaginationParams {
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
    items: T[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}
