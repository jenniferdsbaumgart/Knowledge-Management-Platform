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

        // Retrieve relevant context
        const searchResults = await this.searchService.search({
            query,
            limit: 5,
            mode: 'hybrid' as any,
        });

        // Build context from search results
        const context = searchResults.results
            .map((r, i) => `[${i + 1}] ${r.content}`)
            .join('\n\n');

        // Build messages
        const messages: OpenAI.ChatCompletionMessageParam[] = [
            {
                role: 'system',
                content: `You are a helpful assistant that answers questions based on the provided context.
Always cite your sources using [1], [2], etc. when referencing information from the context.
If the context doesn't contain relevant information, say so honestly.

Context:
${context}`,
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
