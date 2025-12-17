import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../common/prisma/prisma.service';
import { EmbeddingService } from '@knowledge-platform/rag';
import OpenAI from 'openai';

@Injectable()
export class FaqRagService {
    private readonly logger = new Logger(FaqRagService.name);
    private embeddingService: EmbeddingService;
    private openai: OpenAI;
    private chatModel: string;

    constructor(
        private prisma: PrismaService,
        private configService: ConfigService,
    ) {
        // Initialize Embedding Service (assuming OpenAI embeddings for now)
        const useOpenRouter = process.env.USE_OPENROUTER === 'true';
        let apiKey = this.configService.get<string>('openai.apiKey') || process.env.OPENAI_API_KEY;
        let embeddingBaseURL: string | undefined = undefined;

        if (useOpenRouter) {
            apiKey = process.env.OPENROUTER_API_KEY || apiKey;
            embeddingBaseURL = 'https://openrouter.ai/api/v1';
        }

        if (!apiKey) {
            throw new Error('API key not configured');
        }

        // Initialize Embedding Service
        // We pass undefined for model to use the default from shared package
        this.embeddingService = new EmbeddingService(apiKey, undefined, embeddingBaseURL);

        // Initialize Chat Client (OpenRouter or OpenAI)
        if (useOpenRouter) {
            const openRouterKey = process.env.OPENROUTER_API_KEY || apiKey;
            this.openai = new OpenAI({
                apiKey: openRouterKey,
                baseURL: 'https://openrouter.ai/api/v1',
            });
            this.chatModel = process.env.OPENROUTER_MODEL || 'meta-llama/llama-3-8b-instruct:free';
            this.logger.log(`Using OpenRouter with model: ${this.chatModel}`);
        } else {
            this.openai = new OpenAI({ apiKey });
            this.chatModel = this.configService.get<string>('openai.chatModel') || 'gpt-4';
            this.logger.log(`Using OpenAI with model: ${this.chatModel}`);
        }
    }

    /**
     * Index a single FAQ entry (generate and save embedding)
     */
    async indexFaq(faqId: string) {
        const faq = await this.prisma.faqEntry.findUnique({ where: { id: faqId } });
        if (!faq) {
            this.logger.warn(`FAQ ${faqId} not found for indexing`);
            return;
        }

        const textToEmbed = `Question: ${faq.question}\nAnswer: ${faq.answer}`;

        try {
            const { embedding } = await this.embeddingService.embed(textToEmbed);

            // Save embedding using raw SQL for pgvector
            await this.prisma.$executeRaw`
                UPDATE "faq_entries"
                SET embedding = ${embedding}::vector
                WHERE id = ${faqId}::uuid
            `;

            this.logger.log(`Indexed FAQ ${faqId}`);
        } catch (error) {
            this.logger.error(`Failed to index FAQ ${faqId}:`, error);
        }
    }

    /**
     * Search for similar FAQs within an organisation
     */
    async searchFaqs(organisationId: string, query: string, topK: number = 5) {
        // 1. Generate embedding for query
        const { embedding } = await this.embeddingService.embed(query);

        // 2. Vector search using standard pgvector cosine distance (<=>)
        // We select the FaqEntry fields + similarity score
        const results = await this.prisma.$queryRaw`
            SELECT id, question, answer, confidence, status, (1 - (embedding <=> ${embedding}::vector))::float as "similarity"
            FROM "faq_entries"
            WHERE organisation_id = ${organisationId}::uuid
            AND status IN ('APPROVED', 'DRAFT')
            ORDER BY embedding <=> ${embedding}::vector
            LIMIT ${topK}
        `;

        return results as any[];
    }

    /**
     * Answer a user question using RAG over FAQs
     */
    async answerQuestion(organisationId: string, question: string) {
        // 1. Retrieve relevant FAQs
        const relevantFaqs = await this.searchFaqs(organisationId, question, 5);

        if (!relevantFaqs || relevantFaqs.length === 0) {
            return {
                answer: "I couldn't find any relevant information in the FAQ knowledge base.",
                sources: []
            };
        }

        // 2. Construct Prompt
        const faqContext = relevantFaqs.map((f, i) =>
            `[${i + 1}] Question: ${f.question}\nAnswer: ${f.answer}`
        ).join('\n\n');

        const systemPrompt = `You are an AI assistant that answers questions using ONLY the information contained in the FAQ knowledge base provided below.
If the answer is not contained in the context, say you don't know. Do not hallucinate.

FAQ CONTEXT:
${faqContext}`;

        // 3. Call LLM
        try {
            const response = await this.openai.chat.completions.create({
                model: this.chatModel,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: question }
                ],
                temperature: 0.3, // Low temperature for factual retrieval
            });

            return {
                answer: response.choices[0]?.message?.content || "No response generated.",
                sources: relevantFaqs.map(f => ({ id: f.id, question: f.question, similarity: f.similarity }))
            };
        } catch (error) {
            this.logger.error('RAG generation failed:', error);
            throw error;
        }
    }
}
