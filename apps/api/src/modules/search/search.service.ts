import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../common/prisma/prisma.service';
import { EmbeddingService } from '@knowledge-platform/rag';
import { SearchQueryDto } from './dto/search.dto';
import { SEARCH } from '@knowledge-platform/shared';

export interface SearchResultItem {
    id: string;
    documentId: string;
    content: string;
    documentTitle: string;
    score: number;
    metadata: Record<string, unknown>;
}

@Injectable()
export class SearchService {
    private embeddingService: EmbeddingService;

    constructor(
        private prisma: PrismaService,
        private configService: ConfigService,
    ) {
        const apiKey = this.configService.get<string>('openai.apiKey');
        const model = this.configService.get<string>('openai.embeddingModel');
        this.embeddingService = new EmbeddingService(apiKey!, model);
    }

    async search(dto: SearchQueryDto, organisationId?: string) {
        const startTime = Date.now();
        const { query, limit = 10, offset = 0, sourceIds } = dto;
        let { mode = 'hybrid' } = dto;

        // When using OpenRouter, fall back to keyword-only search
        // because OpenRouter doesn't support embedding API
        const useOpenRouter = process.env.USE_OPENROUTER === 'true';
        if (useOpenRouter && (mode === 'semantic' || mode === 'hybrid')) {
            console.log('[Search] OpenRouter enabled - falling back to keyword-only search');
            mode = 'keyword';
        }

        let results: SearchResultItem[];

        switch (mode) {
            case 'semantic':
                results = await this.semanticSearch(query, limit, sourceIds, organisationId);
                break;
            case 'keyword':
                results = await this.keywordSearch(query, limit, sourceIds, organisationId);
                break;
            case 'hybrid':
            default:
                results = await this.hybridSearch(query, limit, sourceIds, organisationId);
        }

        return {
            results: results.slice(offset, offset + limit),
            total: results.length,
            query,
            took: Date.now() - startTime,
        };
    }

    private async semanticSearch(
        query: string,
        limit: number,
        sourceIds?: string[],
        organisationId?: string,
    ): Promise<SearchResultItem[]> {
        const { embedding } = await this.embeddingService.embed(query);

        // Filter provided sourceIds to org sourceIds if needed?
        // Right now vectorSearch filters by org via JOIN, so even if user passes other org sourceId, 
        // they won't match "AND s.organisation_id = ...". This is secure.

        // Pass orgId to prisma
        let results = await this.prisma.vectorSearch(embedding, limit * 2, organisationId) as SearchResultItem[];

        if (sourceIds?.length) {
            // Client-side set intersection if user wants specific subset of their own sources
            // (We still filter returned results)
            const documents = await this.prisma.document.findMany({
                where: { sourceId: { in: sourceIds } },
                select: { id: true },
            });
            const docIds = new Set(documents.map(d => d.id));
            results = results.filter(r => docIds.has(r.documentId));
        }

        return results.slice(0, limit);
    }

    private async keywordSearch(
        query: string,
        limit: number,
        sourceIds?: string[],
        organisationId?: string,
    ): Promise<SearchResultItem[]> {
        let results = await this.prisma.keywordSearch(query, limit * 2, organisationId) as SearchResultItem[];

        if (sourceIds?.length) {
            const documents = await this.prisma.document.findMany({
                where: { sourceId: { in: sourceIds } },
                select: { id: true },
            });
            const docIds = new Set(documents.map(d => d.id));
            results = results.filter(r => docIds.has(r.documentId));
        }

        return results.slice(0, limit);
    }

    private async hybridSearch(
        query: string,
        limit: number,
        sourceIds?: string[],
        organisationId?: string,
    ): Promise<SearchResultItem[]> {
        const [semanticResults, keywordResults] = await Promise.all([
            this.semanticSearch(query, limit * 2, sourceIds, organisationId),
            this.keywordSearch(query, limit * 2, sourceIds, organisationId),
        ]);

        // Combine with weighted scoring
        const combined = new Map<string, SearchResultItem>();

        for (const result of semanticResults) {
            combined.set(result.id, {
                ...result,
                score: result.score * SEARCH.SEMANTIC_WEIGHT,
            });
        }

        for (const result of keywordResults) {
            const existing = combined.get(result.id);
            if (existing) {
                existing.score += result.score * SEARCH.KEYWORD_WEIGHT;
            } else {
                combined.set(result.id, {
                    ...result,
                    score: result.score * SEARCH.KEYWORD_WEIGHT,
                });
            }
        }

        return Array.from(combined.values())
            .sort((a, b) => b.score - a.score)
            .slice(0, limit);
    }
}
