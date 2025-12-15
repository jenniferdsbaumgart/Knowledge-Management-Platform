import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { SearchService } from './search.service';
import { RagQueryDto } from './dto/search.dto';

@Injectable()
export class RagService {
    private openai: OpenAI;
    private model: string;

    constructor(
        private searchService: SearchService,
        private configService: ConfigService,
    ) {
        const apiKey = this.configService.get<string>('openai.apiKey');
        this.openai = new OpenAI({ apiKey });
        this.model = this.configService.get<string>('openai.chatModel') || 'gpt-4';
    }

    async generateResponse(dto: RagQueryDto) {
        const { query, conversationHistory = [], maxTokens = 1024, temperature = 0.7 } = dto;

        // Retrieve relevant context - increased limit for better coverage
        const searchResults = await this.searchService.search({
            query,
            limit: 10,
            mode: 'hybrid' as any,
        });

        console.log(`[RAG] Query: "${query}"`);
        console.log(`[RAG] Search returned ${searchResults.results.length} results (took ${searchResults.took}ms)`);
        if (searchResults.results.length > 0) {
            console.log(`[RAG] Top result: "${searchResults.results[0].content.substring(0, 100)}..."`);
        }

        // Build context from search results with source titles for better context
        const context = searchResults.results
            .map((r, i) => `[${i + 1}] (Source: ${r.documentTitle})\n${r.content}`)
            .join('\n\n---\n\n');

        // Build messages with improved system prompt
        const messages: OpenAI.ChatCompletionMessageParam[] = [
            {
                role: 'system',
                content: `You are a helpful assistant that answers questions based ONLY on the provided context from the user's knowledge base.

INSTRUCTIONS:
- Answer questions using ONLY the information found in the context below
- Cite your sources using [1], [2], etc. when referencing information
- If multiple sources discuss the same topic, synthesize the information
- IGNORE any context that is clearly irrelevant to the user's question
- If no relevant information is found in the context, say "I couldn't find relevant information about that in your knowledge base"
- Be concise and direct in your answers

CONTEXT FROM KNOWLEDGE BASE:
${context || 'No relevant documents found.'}`,
            },
            ...conversationHistory.map((msg) => ({
                role: msg.role as 'user' | 'assistant',
                content: msg.content,
            })),
            {
                role: 'user',
                content: query,
            },
        ];

        // Generate response
        const response = await this.openai.chat.completions.create({
            model: this.model,
            messages,
            max_tokens: maxTokens,
            temperature,
        });

        const answer = response.choices[0]?.message?.content || '';

        return {
            answer,
            sources: searchResults.results.map((r) => ({
                id: r.id,
                documentId: r.documentId,
                documentTitle: r.documentTitle,
                content: r.content.substring(0, 200) + '...',
                score: r.score,
            })),
            usage: {
                promptTokens: response.usage?.prompt_tokens || 0,
                completionTokens: response.usage?.completion_tokens || 0,
                totalTokens: response.usage?.total_tokens || 0,
            },
        };
    }
}
