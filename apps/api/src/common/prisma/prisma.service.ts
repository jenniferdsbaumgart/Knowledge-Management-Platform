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
   * Returns ALL results sorted by similarity (no threshold filtering)
   */
  async vectorSearch(
    embedding: number[],
    limit: number = 10,
  ) {
    const vectorString = `[${embedding.join(',')}]`;

    console.log(`[VectorSearch] Searching with limit ${limit}`);

    // First check if we have any chunks with embeddings
    const chunkCount = await this.$queryRaw<{ count: bigint }[]>`
            SELECT COUNT(*) as count FROM chunks WHERE embedding IS NOT NULL
        `;
    console.log(`[VectorSearch] Total chunks with embeddings: ${chunkCount[0]?.count || 0}`);

    // Return all results sorted by similarity (no threshold)
    const results = await this.$queryRawUnsafe(`
            SELECT 
                c.id,
                c.document_id as "documentId",
                c.content,
                c.metadata,
                d.title as "documentTitle",
                1 - (c.embedding <=> '${vectorString}'::vector) as score
            FROM chunks c
            JOIN documents d ON c.document_id = d.id
            WHERE c.embedding IS NOT NULL
            ORDER BY c.embedding <=> '${vectorString}'::vector
            LIMIT ${limit}
        `);

    console.log(`[VectorSearch] Found ${(results as any[]).length} results`);
    return results;
  }

  /**
   * Full-text keyword search with ILIKE fallback for better recall
   */
  async keywordSearch(
    query: string,
    limit: number = 10,
  ) {
    console.log(`[KeywordSearch] Searching for: "${query}"`);

    // First try full-text search
    let results = await this.$queryRaw<any[]>`
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

    // Fallback to ILIKE if no full-text results
    if (results.length === 0) {
      console.log(`[KeywordSearch] No full-text results, trying ILIKE fallback`);
      const searchPattern = `%${query.toLowerCase()}%`;
      results = await this.$queryRaw<any[]>`
                SELECT 
                    c.id,
                    c.document_id as "documentId",
                    c.content,
                    c.metadata,
                    d.title as "documentTitle",
                    0.5 as score
                FROM chunks c
                JOIN documents d ON c.document_id = d.id
                WHERE LOWER(c.content) LIKE ${searchPattern}
                   OR LOWER(d.title) LIKE ${searchPattern}
                ORDER BY c.created_at DESC
                LIMIT ${limit}
            `;
    }

    console.log(`[KeywordSearch] Found ${results.length} results`);
    return results;
  }
}
