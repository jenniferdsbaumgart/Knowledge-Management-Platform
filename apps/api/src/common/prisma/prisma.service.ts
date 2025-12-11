import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
    async onModuleInit() {
        await this.$connect();
    }

    async onModuleDestroy() {
        await this.$disconnect();
    }

    /**
     * Execute raw vector similarity search using pgvector
     */
    async vectorSearch(
        embedding: number[],
        limit: number = 10,
        threshold: number = 0.5,
    ) {
        const vectorString = `[${embedding.join(',')}]`;

        return this.$queryRaw`
      SELECT 
        c.id,
        c.document_id as "documentId",
        c.content,
        c.metadata,
        d.title as "documentTitle",
        1 - (c.embedding <=> ${vectorString}::vector) as score
      FROM chunks c
      JOIN documents d ON c.document_id = d.id
      WHERE c.embedding IS NOT NULL
        AND 1 - (c.embedding <=> ${vectorString}::vector) > ${threshold}
      ORDER BY c.embedding <=> ${vectorString}::vector
      LIMIT ${limit}
    `;
    }

    /**
     * Full-text keyword search
     */
    async keywordSearch(
        query: string,
        limit: number = 10,
    ) {
        return this.$queryRaw`
      SELECT 
        c.id,
        c.document_id as "documentId",
        c.content,
        c.metadata,
        d.title as "documentTitle",
        ts_rank(to_tsvector('english', c.content), plainto_tsquery('english', ${query})) as score
      FROM chunks c
      JOIN documents d ON c.document_id = d.id
      WHERE to_tsvector('english', c.content) @@ plainto_tsquery('english', ${query})
      ORDER BY score DESC
      LIMIT ${limit}
    `;
    }
}
