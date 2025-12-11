import OpenAI from 'openai';
import { SEARCH } from '@knowledge-platform/shared';
import type { ScoredChunk } from '../retrieval/index.js';
import { EmbeddingService } from '../embeddings/index.js';

export interface RerankResult {
    results: ScoredChunk[];
    originalOrder: string[];
}

/**
 * Service for reranking search results using cross-encoder or LLM
 */
export class RerankingService {
    private client: OpenAI;
    private embeddingService: EmbeddingService;

    constructor(apiKey: string) {
        this.client = new OpenAI({ apiKey });
        this.embeddingService = new EmbeddingService(apiKey);
    }

    /**
     * Rerank results using embedding similarity refinement
     * Uses the query to re-score each result
     */
    async rerankByEmbedding(
        query: string,
        results: ScoredChunk[],
        topK: number = SEARCH.RERANK_TOP_K
    ): Promise<RerankResult> {
        const originalOrder = results.map(r => r.id);

        // Get query embedding
        const { embedding: queryEmbedding } = await this.embeddingService.embed(query);

        // Re-embed each result content and calculate similarity
        const reranked: ScoredChunk[] = [];

        for (const result of results.slice(0, topK)) {
            const { embedding } = await this.embeddingService.embed(result.content);
            const similarity = EmbeddingService.cosineSimilarity(queryEmbedding, embedding);

            reranked.push({
                ...result,
                score: similarity,
            });
        }

        // Sort by new scores
        reranked.sort((a, b) => b.score - a.score);

        return { results: reranked, originalOrder };
    }

    /**
     * Rerank using LLM-based relevance scoring
     */
    async rerankByLLM(
        query: string,
        results: ScoredChunk[],
        topK: number = 10
    ): Promise<RerankResult> {
        const originalOrder = results.map(r => r.id);
        const candidates = results.slice(0, Math.min(topK, 20)); // Limit for API cost

        const prompt = `Given the query and a list of text passages, rate each passage's relevance to the query on a scale of 1-10.

Query: "${query}"

Passages:
${candidates.map((c, i) => `[${i + 1}] ${c.content.substring(0, 500)}...`).join('\n\n')}

Return only a JSON array of scores in order, like [8, 5, 9, ...]. Each number should be the relevance score for the corresponding passage.`;

        try {
            const response = await this.client.chat.completions.create({
                model: 'gpt-4',
                messages: [{ role: 'user', content: prompt }],
                temperature: 0,
                max_tokens: 100,
            });

            const content = response.choices[0]?.message?.content || '[]';
            const scores: number[] = JSON.parse(content);

            const reranked = candidates.map((result, index) => ({
                ...result,
                score: scores[index] / 10 || result.score, // Normalize to 0-1
            }));

            reranked.sort((a, b) => b.score - a.score);

            return { results: reranked, originalOrder };
        } catch (error) {
            console.error('LLM reranking failed, returning original order:', error);
            return { results: candidates, originalOrder };
        }
    }

    /**
     * Simple relevance filter using keyword matching
     */
    filterByRelevance(
        query: string,
        results: ScoredChunk[],
        minScore: number = 0.3
    ): ScoredChunk[] {
        const queryTerms = query.toLowerCase().split(/\s+/);

        return results.filter(result => {
            const contentLower = result.content.toLowerCase();
            const matchCount = queryTerms.filter(term =>
                contentLower.includes(term)
            ).length;

            const termCoverage = matchCount / queryTerms.length;
            return termCoverage >= minScore || result.score >= minScore;
        });
    }

    /**
     * Deduplicate results based on content similarity
     */
    deduplicateResults(
        results: ScoredChunk[],
        similarityThreshold: number = 0.9
    ): ScoredChunk[] {
        const unique: ScoredChunk[] = [];

        for (const result of results) {
            const isDuplicate = unique.some(existing =>
                this.textSimilarity(existing.content, result.content) > similarityThreshold
            );

            if (!isDuplicate) {
                unique.push(result);
            }
        }

        return unique;
    }

    /**
     * Simple text similarity using Jaccard coefficient
     */
    private textSimilarity(a: string, b: string): number {
        const setA = new Set(a.toLowerCase().split(/\s+/));
        const setB = new Set(b.toLowerCase().split(/\s+/));

        const intersection = new Set([...setA].filter(x => setB.has(x)));
        const union = new Set([...setA, ...setB]);

        return intersection.size / union.size;
    }
}
