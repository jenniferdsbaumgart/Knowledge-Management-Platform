import { registerAs } from '@nestjs/config';

export const openaiConfig = registerAs('openai', () => ({
    apiKey: process.env.OPENAI_API_KEY,
    embeddingModel: process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small',
    chatModel: process.env.OPENAI_CHAT_MODEL || 'gpt-4',
}));
