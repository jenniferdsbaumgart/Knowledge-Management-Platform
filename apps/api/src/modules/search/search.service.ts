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

    async search(dto: SearchQueryDto) {
        const startTime = Date.now();
        const { query, limit = 10, offset = 0, mode = 'hybrid', sourceIds } = dto;

        let results: SearchResultItem[];

        switch (mode) {
            case 'semantic':
                results = await this.semanticSearch(query, limit, sourceIds);
                break;
            case 'keyword':
                results = await this.keywordSearch(query, limit, sourceIds);
                break;
            case 'hybrid':
            default:
                results = await this.hybridSearch(query, limit, sourceIds);
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
    ): Promise<SearchResultItem[]> {
        const { embedding } = await this.embeddingService.embed(query);

        let results = await this.prisma.vectorSearch(embedding, limit * 2) as SearchResultItem[];

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

    private async keywordSearch(
        query: string,
        limit: number,
        sourceIds?: string[],
    ): Promise<SearchResultItem[]> {
        let results = await this.prisma.keywordSearch(query, limit * 2) as SearchResultItem[];

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
    ): Promise<SearchResultItem[]> {
        const [semanticResults, keywordResults] = await Promise.all([
            this.semanticSearch(query, limit * 2, sourceIds),
            this.keywordSearch(query, limit * 2, sourceIds),
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
