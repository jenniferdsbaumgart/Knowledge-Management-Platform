import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { PrismaService } from '../../common/prisma/prisma.service';
import { FaqStatus } from '@prisma/client';

interface GeneratedFaq {
    question: string;
    answer: string;
    category?: string;
}

import { FaqRagService } from './faq-rag.service';

@Injectable()
export class FaqGeneratorService {
    private client: OpenAI;
    private model: string;
    private useOpenRouter: boolean;

    constructor(
        private prisma: PrismaService,
        private configService: ConfigService,
        private faqRagService: FaqRagService,
    ) {
        // Check if we should use OpenRouter
        console.log('[FaqGenerator] USE_OPENROUTER env value:', process.env.USE_OPENROUTER);
        this.useOpenRouter = process.env.USE_OPENROUTER === 'true';

        let apiKey = this.configService.get<string>('openai.apiKey') || process.env.OPENAI_API_KEY;
        let baseURL = this.configService.get<string>('openai.baseURL') || process.env.OPENAI_BASE_URL;

        if (this.useOpenRouter) {
            apiKey = process.env.OPENROUTER_API_KEY || apiKey;
            baseURL = 'https://openrouter.ai/api/v1';
            this.model = process.env.OPENROUTER_MODEL || 'meta-llama/llama-3.3-70b-instruct:free';
            console.log('[FaqGenerator] Using OpenRouter with model:', this.model);
        } else {
            this.model = this.configService.get<string>('openai.chatModel') || 'gpt-4';
            console.log('[FaqGenerator] Using OpenAI with model:', this.model);
        }

        if (!apiKey) {
            console.warn('[FaqGenerator] Warning: No API Key configured');
        }

        this.client = new OpenAI({
            apiKey,
            baseURL: baseURL || undefined,
        });
    }

    async generateFromSource(sourceId: string, organisationId: string, maxPerDocument: number = 5): Promise<number> {
        console.log(`[FaqGenerator] Generating FAQs from source: ${sourceId}`);

        // Get documents from source
        const documents = await this.prisma.document.findMany({
            where: { sourceId },
            include: {
                chunks: {
                    orderBy: { createdAt: 'asc' },
                },
            },
        });

        if (documents.length === 0) {
            console.log(`[FaqGenerator] No documents found for source ${sourceId}`);
            return 0;
        }

        let totalGenerated = 0;

        for (const doc of documents) {
            // Combine chunks into content
            const content = doc.chunks.map((c) => c.content).join('\n\n');

            if (!content || content.length < 100) {
                console.log(`[FaqGenerator] Skipping document ${doc.id} - content too short`);
                continue;
            }

            try {
                const faqs = await this.generateFaqs(content, maxPerDocument);
                console.log(`[FaqGenerator] Generated ${faqs.length} FAQs from document: ${doc.title}`);

                // Save FAQs
                for (const faq of faqs) {
                    const entry = await this.prisma.faqEntry.create({
                        data: {
                            question: faq.question,
                            answer: faq.answer,
                            sourceIds: [sourceId],
                            confidence: 0.8, // Default confidence for AI-generated
                            status: FaqStatus.DRAFT,
                            organisationId,
                        },
                    });
                    totalGenerated++;

                    // Index FAQ for RAG immediately
                    await this.faqRagService.indexFaq(entry.id);
                }
            } catch (error) {
                console.error(`[FaqGenerator] Error generating FAQs for document ${doc.id}:`, error);
            }
        }

        console.log(`[FaqGenerator] Total FAQs generated: ${totalGenerated}`);
        return totalGenerated;
    }

    async generateFromAllSources(organisationId: string, maxPerSource: number = 5): Promise<number> {
        console.log('[FaqGenerator] Generating FAQs from ALL sources...');

        const sources = await this.prisma.source.findMany({
            where: { organisationId },
        });

        if (sources.length === 0) {
            console.log('[FaqGenerator] No sources found');
            return 0;
        }

        console.log(`[FaqGenerator] Found ${sources.length} sources`);

        let totalGenerated = 0;
        for (const source of sources) {
            try {
                const count = await this.generateFromSource(source.id, organisationId, maxPerSource);
                totalGenerated += count;
            } catch (error) {
                console.error(`[FaqGenerator] Error processing source ${source.name}:`, error);
            }
        }

        console.log(`[FaqGenerator] Total FAQs generated from all sources: ${totalGenerated}`);
        return totalGenerated;
    }

    private async generateFaqs(content: string, maxCount: number): Promise<GeneratedFaq[]> {
        // Truncate content if too long (max ~10k tokens)
        const truncatedContent = content.substring(0, 15000);

        const prompt = `You are an expert at creating company FAQs.
Based on the content below, generate up to ${maxCount} frequently asked questions that a customer or user might ask.

RULES:
- Questions should be natural and direct
- Answers should be concise (max 3 paragraphs)
- Include enough context for standalone understanding
- Use professional language
- Only generate questions that can be fully answered from the content

OUTPUT FORMAT (JSON array):
[
  {"question": "...", "answer": "..."},
  {"question": "...", "answer": "..."}
]

CONTENT:
${truncatedContent}`;

        const response = await this.client.chat.completions.create({
            model: this.model,
            messages: [{ role: 'user', content: prompt }],
            max_tokens: 2000,
            temperature: 0.7,
        });

        const responseText = response.choices[0]?.message?.content || '[]';

        try {
            // Extract JSON from response (handle markdown code blocks)
            const jsonMatch = responseText.match(/\[[\s\S]*\]/);
            if (!jsonMatch) {
                console.error('[FaqGenerator] No JSON array found in response');
                return [];
            }

            const faqs = JSON.parse(jsonMatch[0]) as GeneratedFaq[];
            return faqs.slice(0, maxCount);
        } catch (error) {
            console.error('[FaqGenerator] Failed to parse FAQ response:', responseText);
            return [];
        }
    }
}
