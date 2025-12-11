import type { Source, SourceConfig, Document } from '@knowledge-platform/shared';

/**
 * Result from fetching data from a source
 */
export interface FetchResult {
    documents: DocumentData[];
    metadata: {
        totalCount: number;
        fetchedAt: Date;
        nextCursor?: string;
    };
}

/**
 * Raw document data before processing
 */
export interface DocumentData {
    externalId: string;
    title: string;
    content: string;
    metadata: Record<string, unknown>;
    rawData?: unknown;
}

/**
 * Connector status and health check result
 */
export interface ConnectorStatus {
    connected: boolean;
    message: string;
    lastChecked: Date;
    details?: Record<string, unknown>;
}

/**
 * Abstract base class for all data source connectors
 */
export abstract class BaseConnector<TConfig extends SourceConfig = SourceConfig> {
    protected source: Source;
    protected config: TConfig;

    constructor(source: Source) {
        this.source = source;
        this.config = source.config as TConfig;
    }

    /**
     * Get the source ID
     */
    get sourceId(): string {
        return this.source.id;
    }

    /**
     * Test the connection to the data source
     */
    abstract testConnection(): Promise<ConnectorStatus>;

    /**
     * Fetch all documents from the data source
     */
    abstract fetchAll(): Promise<FetchResult>;

    /**
     * Fetch documents incrementally (for sources that support it)
     * @param since - Fetch documents modified since this date
     */
    abstract fetchIncremental(since: Date): Promise<FetchResult>;

    /**
     * Fetch a single document by ID
     * @param externalId - External ID of the document
     */
    abstract fetchOne(externalId: string): Promise<DocumentData | null>;

    /**
     * Transform raw document data into the standard format
     * @param raw - Raw data from the source
     */
    protected abstract transform(raw: unknown): DocumentData;

    /**
     * Validate the connector configuration
     */
    abstract validateConfig(): boolean;
}
