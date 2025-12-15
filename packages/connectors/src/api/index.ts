import axios, { AxiosInstance } from 'axios';
import type { ApiSourceConfig, Source } from '@knowledge-platform/shared';
import { BaseConnector, FetchResult, DocumentData, ConnectorStatus } from '../base/index.js';

/**
 * Connector for REST/GraphQL API data sources
 */
export class ApiConnector extends BaseConnector<ApiSourceConfig> {
    private client: AxiosInstance;

    constructor(source: Source) {
        super(source);
        this.client = this.createClient();
    }

    private createClient(): AxiosInstance {
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            ...this.config.headers,
        };

        // Add authentication headers
        if (this.config.authType && this.config.authConfig) {
            switch (this.config.authType) {
                case 'bearer':
                    headers['Authorization'] = `Bearer ${this.config.authConfig.token}`;
                    break;
                case 'basic':
                    const credentials = Buffer.from(
                        `${this.config.authConfig.username}:${this.config.authConfig.password}`
                    ).toString('base64');
                    headers['Authorization'] = `Basic ${credentials}`;
                    break;
                case 'api_key':
                    const keyHeader = this.config.authConfig.headerName || 'X-API-Key';
                    headers[keyHeader] = this.config.authConfig.apiKey || '';
                    break;
            }
        }

        return axios.create({
            baseURL: this.config.url,
            headers,
            timeout: 30000,
        });
    }

    async testConnection(): Promise<ConnectorStatus> {
        try {
            const response = await this.client.request({
                method: this.config.method,
                url: '/',
            });

            return {
                connected: response.status >= 200 && response.status < 300,
                message: 'Connection successful',
                lastChecked: new Date(),
                details: {
                    status: response.status,
                    statusText: response.statusText,
                },
            };
        } catch (error) {
            return {
                connected: false,
                message: error instanceof Error ? error.message : 'Connection failed',
                lastChecked: new Date(),
            };
        }
    }

    async fetchAll(): Promise<FetchResult> {
        const response = await this.client.request({
            method: this.config.method,
            url: '/',
        });

        const documents = this.parseResponse(response.data);

        return {
            documents,
            metadata: {
                totalCount: documents.length,
                fetchedAt: new Date(),
            },
        };
    }

    async fetchIncremental(since: Date): Promise<FetchResult> {
        // For API sources, we typically need to pass the date as a query parameter
        const response = await this.client.request({
            method: this.config.method,
            url: '/',
            params: {
                since: since.toISOString(),
                updated_after: since.toISOString(),
            },
        });

        const documents = this.parseResponse(response.data);

        return {
            documents,
            metadata: {
                totalCount: documents.length,
                fetchedAt: new Date(),
            },
        };
    }

    async fetchOne(externalId: string): Promise<DocumentData | null> {
        try {
            const response = await this.client.request({
                method: 'GET',
                url: `/${externalId}`,
            });

            return this.transform(response.data);
        } catch (error) {
            if (axios.isAxiosError(error) && error.response?.status === 404) {
                return null;
            }
            throw error;
        }
    }

    private parseResponse(data: unknown): DocumentData[] {
        // Handle array response
        if (Array.isArray(data)) {
            return data.map((item) => this.transform(item));
        }

        // Handle object with data array
        if (typeof data === 'object' && data !== null) {
            const obj = data as Record<string, unknown>;

            // Common API response patterns
            const arrayData = obj.data || obj.results || obj.items || obj.records;
            if (Array.isArray(arrayData)) {
                return arrayData.map((item) => this.transform(item));
            }
        }

        // Single item response
        return [this.transform(data)];
    }

    protected transform(raw: unknown): DocumentData {
        const item = raw as Record<string, unknown>;

        // Try to extract common fields
        const id = String(item.id || item._id || item.uuid || Date.now());
        const title = String(
            item.title || item.name || item.subject || item.heading || 'Untitled'
        );
        const content = String(
            item.content || item.body || item.text || item.description || JSON.stringify(item)
        );

        return {
            externalId: id,
            title,
            content,
            metadata: {
                sourceType: 'API',
                url: this.config.url,
                fetchedAt: new Date().toISOString(),
                ...item,
            },
            rawData: raw,
        };
    }

    validateConfig(): boolean {
        if (!this.config.url) return false;
        if (!this.config.method) return false;

        try {
            new URL(this.config.url);
            return true;
        } catch {
            return false;
        }
    }
}
