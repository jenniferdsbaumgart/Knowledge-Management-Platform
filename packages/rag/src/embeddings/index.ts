import OpenAI from 'openai';
import { EMBEDDING } from '@knowledge-platform/shared';

export interface EmbeddingResult {
    embedding: number[];
    tokens: number;
}

export interface BatchEmbeddingResult {
    embeddings: EmbeddingResult[];
    totalTokens: number;
}

/**
 * Service for generating text embeddings using OpenAI
 */
export class EmbeddingService {
    private client: OpenAI;
    private model: string;

    constructor(apiKey: string, model: string = EMBEDDING.MODEL) {
        this.client = new OpenAI({ apiKey });
        this.model = model;
    }

    /**
     * Generate embedding for a single text
     */
    async embed(text: string): Promise<EmbeddingResult> {
        const response = await this.client.embeddings.create({
            model: this.model,
            input: text,
        });

        return {
            embedding: response.data[0].embedding,
            tokens: response.usage.total_tokens,
        };
    }

    /**
     * Generate embeddings for multiple texts in batch
     */
    async embedBatch(texts: string[]): Promise<BatchEmbeddingResult> {
        if (texts.length === 0) {
            return { embeddings: [], totalTokens: 0 };
        }

        // OpenAI allows up to 2048 texts per batch
        const batchSize = 2048;
        const batches: string[][] = [];

        for (let i = 0; i < texts.length; i += batchSize) {
            batches.push(texts.slice(i, i + batchSize));
        }

        const results: EmbeddingResult[] = [];
        let totalTokens = 0;

        for (const batch of batches) {
            const response = await this.client.embeddings.create({
                model: this.model,
                input: batch,
            });

            for (const data of response.data) {
                results.push({
                    embedding: data.embedding,
                    tokens: 0, // Individual token counts not available in batch
                });
            }
            totalTokens += response.usage.total_tokens;
        }

        return { embeddings: results, totalTokens };
    }

    /**
     * Calculate cosine similarity between two embeddings
     */
    static cosineSimilarity(a: number[], b: number[]): number {
        if (a.length !== b.length) {
            throw new Error('Embeddings must have the same dimensions');
        }

        let dotProduct = 0;
        let normA = 0;
        let normB = 0;

        for (let i = 0; i < a.length; i++) {
            dotProduct += a[i] * b[i];
            normA += a[i] * a[i];
            normB += b[i] * b[i];
        }

        return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
    }

    /**
     * Get the embedding dimensions for the current model
     */
    get dimensions(): number {
        return EMBEDDING.DIMENSIONS;
    }
}
