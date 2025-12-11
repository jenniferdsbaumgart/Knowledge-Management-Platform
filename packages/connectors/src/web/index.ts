import axios from 'axios';
import * as cheerio from 'cheerio';
import type { WebSourceConfig, Source } from '@knowledge-platform/shared';
import { BaseConnector, FetchResult, DocumentData, ConnectorStatus } from '../base/index.js';

interface CrawlResult {
    url: string;
    title: string;
    content: string;
    links: string[];
}

/**
 * Connector for web scraping data sources
 */
export class WebConnector extends BaseConnector<WebSourceConfig> {
    private visited: Set<string> = new Set();

    constructor(source: Source) {
        super(source);
    }

    async testConnection(): Promise<ConnectorStatus> {
        try {
            const response = await axios.get(this.config.url, {
                timeout: 10000,
                headers: {
                    'User-Agent': 'KnowledgePlatform/1.0 (+https://example.com/bot)',
                },
            });

            return {
                connected: response.status === 200,
                message: 'Website accessible',
                lastChecked: new Date(),
                details: {
                    status: response.status,
                    contentType: response.headers['content-type'],
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
        this.visited.clear();
        const documents: DocumentData[] = [];

        await this.crawl(this.config.url, 0, documents);

        return {
            documents,
            metadata: {
                totalCount: documents.length,
                fetchedAt: new Date(),
            },
        };
    }

    async fetchIncremental(since: Date): Promise<FetchResult> {
        // Web scraping typically doesn't support incremental fetches
        // We re-crawl everything
        return this.fetchAll();
    }

    async fetchOne(externalId: string): Promise<DocumentData | null> {
        try {
            const result = await this.scrapePage(externalId);
            return this.transform(result);
        } catch {
            return null;
        }
    }

    private async crawl(
        url: string,
        depth: number,
        documents: DocumentData[]
    ): Promise<void> {
        if (depth > this.config.depth) return;
        if (this.visited.has(url)) return;

        this.visited.add(url);

        try {
            const result = await this.scrapePage(url);
            documents.push(this.transform(result));

            // Crawl linked pages
            if (depth < this.config.depth) {
                const baseUrl = new URL(this.config.url);

                for (const link of result.links) {
                    try {
                        const linkUrl = new URL(link, url);

                        // Only follow links within the same domain
                        if (linkUrl.hostname === baseUrl.hostname) {
                            await this.crawl(linkUrl.href, depth + 1, documents);
                        }
                    } catch {
                        // Invalid URL, skip
                    }
                }
            }
        } catch (error) {
            console.error(`Failed to crawl ${url}:`, error);
        }
    }

    private async scrapePage(url: string): Promise<CrawlResult> {
        const response = await axios.get(url, {
            timeout: 10000,
            headers: {
                'User-Agent': 'KnowledgePlatform/1.0 (+https://example.com/bot)',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            },
        });

        const $ = cheerio.load(response.data);

        // Remove script and style elements
        $('script, style, nav, footer, header, aside').remove();

        // Extract title
        const titleSelector = this.config.selectors?.title || 'title';
        const title = $(titleSelector).first().text().trim() || url;

        // Extract content
        const contentSelector = this.config.selectors?.content || 'body';
        const content = $(contentSelector)
            .text()
            .replace(/\s+/g, ' ')
            .trim();

        // Extract links
        const linksSelector = this.config.selectors?.links || 'a[href]';
        const links: string[] = [];
        $(linksSelector).each((_, el) => {
            const href = $(el).attr('href');
            if (href && !href.startsWith('#') && !href.startsWith('javascript:')) {
                links.push(href);
            }
        });

        return { url, title, content, links };
    }

    protected transform(raw: unknown): DocumentData {
        const data = raw as CrawlResult;

        return {
            externalId: data.url,
            title: data.title,
            content: data.content,
            metadata: {
                sourceType: 'WEB',
                url: data.url,
                linksFound: data.links.length,
                scrapedAt: new Date().toISOString(),
            },
        };
    }

    validateConfig(): boolean {
        if (!this.config.url) return false;
        if (typeof this.config.depth !== 'number' || this.config.depth < 1) return false;

        try {
            new URL(this.config.url);
            return true;
        } catch {
            return false;
        }
    }
}
