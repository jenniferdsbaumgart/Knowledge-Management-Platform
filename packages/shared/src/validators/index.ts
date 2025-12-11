import { z } from 'zod';

// User validators
export const createUserSchema = z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    name: z.string().min(2, 'Name must be at least 2 characters'),
    role: z.enum(['ADMIN', 'EDITOR', 'VIEWER']).optional().default('VIEWER'),
});

export const loginSchema = z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(1, 'Password is required'),
});

// Source validators
export const apiSourceConfigSchema = z.object({
    type: z.literal('API'),
    url: z.string().url('Invalid URL'),
    method: z.enum(['GET', 'POST']),
    headers: z.record(z.string()).optional(),
    authType: z.enum(['none', 'bearer', 'basic', 'api_key']).optional(),
    authConfig: z.record(z.string()).optional(),
});

export const databaseSourceConfigSchema = z.object({
    type: z.literal('DATABASE'),
    dialect: z.enum(['postgresql', 'mysql', 'mssql', 'mongodb']),
    connectionString: z.string().min(1, 'Connection string is required'),
    query: z.string().optional(),
    tables: z.array(z.string()).optional(),
});

export const documentSourceConfigSchema = z.object({
    type: z.literal('DOCUMENT'),
    storageType: z.enum(['local', 's3', 'minio']),
    path: z.string().min(1, 'Path is required'),
    fileTypes: z.array(z.string()).min(1, 'At least one file type is required'),
});

export const webSourceConfigSchema = z.object({
    type: z.literal('WEB'),
    url: z.string().url('Invalid URL'),
    depth: z.number().int().min(1).max(10),
    selectors: z.object({
        content: z.string().optional(),
        title: z.string().optional(),
        links: z.string().optional(),
    }).optional(),
});

export const sourceConfigSchema = z.discriminatedUnion('type', [
    apiSourceConfigSchema,
    databaseSourceConfigSchema,
    documentSourceConfigSchema,
    webSourceConfigSchema,
]);

export const createSourceSchema = z.object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    description: z.string().optional(),
    type: z.enum(['API', 'DATABASE', 'DOCUMENT', 'WEB']),
    config: sourceConfigSchema,
    syncSchedule: z.string().optional(),
});

export const updateSourceSchema = createSourceSchema.partial();

// Search validators
export const searchQuerySchema = z.object({
    query: z.string().min(1, 'Query is required'),
    filters: z.object({
        sourceIds: z.array(z.string().uuid()).optional(),
        documentIds: z.array(z.string().uuid()).optional(),
        dateFrom: z.string().datetime().optional(),
        dateTo: z.string().datetime().optional(),
        metadata: z.record(z.unknown()).optional(),
    }).optional(),
    limit: z.number().int().min(1).max(100).optional().default(10),
    offset: z.number().int().min(0).optional().default(0),
    includeMetadata: z.boolean().optional().default(true),
});

export const ragQuerySchema = z.object({
    query: z.string().min(1, 'Query is required'),
    conversationHistory: z.array(z.object({
        role: z.enum(['user', 'assistant', 'system']),
        content: z.string(),
    })).optional(),
    filters: searchQuerySchema.shape.filters,
    maxTokens: z.number().int().min(1).max(4096).optional().default(1024),
    temperature: z.number().min(0).max(2).optional().default(0.7),
});

// CMS validators
export const createContentSchema = z.object({
    title: z.string().min(2, 'Title must be at least 2 characters'),
    slug: z.string().min(2).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase with hyphens'),
    body: z.string().min(1, 'Content body is required'),
    status: z.enum(['DRAFT', 'REVIEW', 'PUBLISHED', 'ARCHIVED']).optional().default('DRAFT'),
});

export const updateContentSchema = createContentSchema.partial();

// Pagination validators
export const paginationSchema = z.object({
    page: z.number().int().min(1).optional().default(1),
    limit: z.number().int().min(1).max(100).optional().default(20),
    sortBy: z.string().optional(),
    sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

// Type exports
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type CreateSourceInput = z.infer<typeof createSourceSchema>;
export type UpdateSourceInput = z.infer<typeof updateSourceSchema>;
export type SearchQueryInput = z.infer<typeof searchQuerySchema>;
export type RAGQueryInput = z.infer<typeof ragQuerySchema>;
export type CreateContentInput = z.infer<typeof createContentSchema>;
export type UpdateContentInput = z.infer<typeof updateContentSchema>;
export type PaginationInput = z.infer<typeof paginationSchema>;
