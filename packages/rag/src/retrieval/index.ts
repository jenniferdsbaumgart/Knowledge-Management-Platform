import { SEARCH } from '@knowledge-platform/shared';
import type { SearchFilters } from '@knowledge-platform/shared';
import { EmbeddingService } from '../embeddings/index.js';

export interface RetrievalResult {
    results: ScoredChunk[];
    query: string;
    took: number;
}

export interface ScoredChunk {
    id: string;
    documentId: string;
    content: string;
    score: number;
    keywordScore: number;
    semanticScore: number;
    metadata: Record<string, unknown>;
}

export interface VectorSearchFn {
    (queryEmbedding: number[], limit: number, filters?: SearchFilters): Promise<ScoredChunk[]>;
}

export interface KeywordSearchFn {
    (query: string, limit: number, filters?: SearchFilters): Promise<ScoredChunk[]>;
}

/**
 * Hybrid retrieval service combining keyword and semantic search
 */
export class RetrievalService {
    private embeddingService: EmbeddingService;
    private keywordWeight: number;
    private semanticWeight: number;

    constructor(
        embeddingService: EmbeddingService,
        options: {
            keywordWeight?: number;
            semanticWeight?: number;
        } = {}
    ) {
        this.embeddingService = embeddingService;
        this.keywordWeight = options.keywordWeight ?? SEARCH.KEYWORD_WEIGHT;
        this.semanticWeight = options.semanticWeight ?? SEARCH.SEMANTIC_WEIGHT;
    }

    /**
     * Perform hybrid search combining keyword and semantic retrieval
     */
    async hybridSearch(
        query: string,
        vectorSearch: VectorSearchFn,
        keywordSearch: KeywordSearchFn,
        limit: number = SEARCH.DEFAULT_LIMIT,
        filters?: SearchFilters
    ): Promise<RetrievalResult> {
        const startTime = Date.now();

        // Generate query embedding
        const { embedding } = await this.embeddingService.embed(query);

        // Perform both searches in parallel
        const [semanticResults, keywordResults] = await Promise.all([
            vectorSearch(embedding, limit * 2, filters),
            keywordSearch(query, limit * 2, filters),
        ]);

        // Combine and re-score results
        const combined = this.combineResults(semanticResults, keywordResults);

        // Sort by combined score and limit
        const sorted = combined
            .sort((a, b) => b.score - a.score)
            .slice(0, limit);

        return {
            results: sorted,
            query,
            took: Date.now() - startTime,
        };
    }

    /**
     * Semantic-only search using vector similarity
     */
    async semanticSearch(
        query: string,
        vectorSearch: VectorSearchFn,
        limit: number = SEARCH.DEFAULT_LIMIT,
        filters?: SearchFilters
    ): Promise<RetrievalResult> {
        const startTime = Date.now();

        const { embedding } = await this.embeddingService.embed(query);
        const results = await vectorSearch(embedding, limit, filters);

        return {
            results: results.map(r => ({
                ...r,
                score: r.semanticScore,
                keywordScore: 0,
            })),
            query,
            took: Date.now() - startTime,
        };
    }

    /**
     * Keyword-only search using full-text search
     */
    async keywordOnlySearch(
        query: string,
        keywordSearch: KeywordSearchFn,
        limit: number = SEARCH.DEFAULT_LIMIT,
        filters?: SearchFilters
    ): Promise<RetrievalResult> {
        const startTime = Date.now();

        const results = await keywordSearch(query, limit, filters);

        return {
            results: results.map(r => ({
                ...r,
                score: r.keywordScore,
                semanticScore: 0,
            })),
            query,
            took: Date.now() - startTime,
        };
    }

    /**
     * Combine results from semantic and keyword search with weighted scoring
     */
    private combineResults(
        semanticResults: ScoredChunk[],
        keywordResults: ScoredChunk[]
    ): ScoredChunk[] {
        const resultMap = new Map<string, ScoredChunk>();

        // Add semantic results
        for (const result of semanticResults) {
            resultMap.set(result.id, {
                ...result,
                semanticScore: result.semanticScore || result.score,
                keywordScore: 0,
                score: result.semanticScore * this.semanticWeight,
            });
        }

        // Merge keyword results
        for (const result of keywordResults) {
            const existing = resultMap.get(result.id);

            if (existing) {
                existing.keywordScore = result.keywordScore || result.score;
                existing.score =
                    existing.semanticScore * this.semanticWeight +
                    existing.keywordScore * this.keywordWeight;
            } else {
                resultMap.set(result.id, {
                    ...result,
                    keywordScore: result.keywordScore || result.score,
                    semanticScore: 0,
                    score: (result.keywordScore || result.score) * this.keywordWeight,
                });
            }
        }

        return Array.from(resultMap.values());
    }

    /**
     * Reciprocal Rank Fusion for combining multiple result sets
     */
    static reciprocalRankFusion(
        resultSets: ScoredChunk[][],
        k: number = 60
    ): ScoredChunk[] {
        const scores = new Map<string, { chunk: ScoredChunk; score: number }>();

        for (const results of resultSets) {
            for (let rank = 0; rank < results.length; rank++) {
                const chunk = results[rank];
                const rrfScore = 1 / (k + rank + 1);

                const existing = scores.get(chunk.id);
                if (existing) {
                    existing.score += rrfScore;
                } else {
                    scores.set(chunk.id, { chunk, score: rrfScore });
                }
            }
        }

        return Array.from(scores.values())
            .sort((a, b) => b.score - a.score)
            .map(({ chunk, score }) => ({ ...chunk, score }));
    }
}
