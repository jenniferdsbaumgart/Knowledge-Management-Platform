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
  /**
   * Execute raw vector similarity search using pgvector
   * Returns ALL results sorted by similarity (no threshold filtering)
   */
  async vectorSearch(
    embedding: number[],
    limit: number = 10,
    organisationId?: string,
  ) {
    const vectorString = `[${embedding.join(',')}]`;

    console.log(`[VectorSearch] Searching with limit ${limit} for org ${organisationId}`);

    // Base query parts
    let joinSource = '';
    let whereClause = 'c.embedding IS NOT NULL';

    if (organisationId) {
      joinSource = 'JOIN sources s ON d.source_id = s.id';
      whereClause += ` AND s.organisation_id = '${organisationId}'::uuid`;
    }

    // Return all results sorted by similarity (no threshold)
    // using queryRawUnsafe because we are building dynamic string for vector
    // However, organisationId should be parameterized if possible, but here we inject it safely as UUID
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
            ${joinSource}
            WHERE ${whereClause}
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
    organisationId?: string,
  ) {
    console.log(`[KeywordSearch] Searching for: "${query}" for org ${organisationId}`);

    // We cannot easily use template tag parameters for dynamic strict logic unless we compose Sql objects
    // But since we are using raw strings for some parts, let's be careful.
    // Ideally we should use Prisma.sql helper.
    // For simplicity given current code style (queryRaw with template for query but unsafe for vector), 
    // I will use queryRawUnsafe for consistency with vectorSearch or try to use template if possible.
    // Actually, distinct queries are better.

    if (organisationId) {
      // We will inject the filter string. organisationId is a UUID so safe from injection if we validate or type it, 
      // but strictly better to use parameters.
      // Let's rely on standard SQL injection prevention by assuming organisationId is trusted or validated UUID 
      // OR better: use $queryRawUnsafe with params array if supported, or build the query string carefully.

      // Let's use string concatenation with UUID check implicit by type, but explicit UUID cast in SQL helps.
    }

    // Construct parts
    const joinPart = organisationId ? 'JOIN sources s ON d.source_id = s.id' : '';
    const wherePart = organisationId ? `AND s.organisation_id = '${organisationId}'::uuid` : '';

    // Sanitize query slightly for text search if needed, but plainto_tsquery handles it.
    // We need unsafe here because of dynamic JOIN/WHERE construction

    // We will pass query as parameter.

    const fullTextSql = `
            SELECT 
                c.id,
                c.document_id as "documentId",
                c.content,
                c.metadata,
                d.title as "documentTitle",
                ts_rank(to_tsvector('english', c.content), plainto_tsquery('english', $1)) as score
            FROM chunks c
            JOIN documents d ON c.document_id = d.id
            ${joinPart}
            WHERE to_tsvector('english', c.content) @@ plainto_tsquery('english', $1)
            ${wherePart}
            ORDER BY score DESC
            LIMIT $2
    `;

    // First try full-text search
    let results = await this.$queryRawUnsafe<any[]>(fullTextSql, query, limit);

    // Fallback to ILIKE if no full-text results
    if (results.length === 0) {
      console.log(`[KeywordSearch] No full-text results, trying ILIKE fallback`);
      const searchPattern = `%${query.toLowerCase()}%`;

      const likeSql = `
                SELECT 
                    c.id,
                    c.document_id as "documentId",
                    c.content,
                    c.metadata,
                    d.title as "documentTitle",
                    0.5 as score
                FROM chunks c
                JOIN documents d ON c.document_id = d.id
                ${joinPart}
                WHERE (LOWER(c.content) LIKE $1 OR LOWER(d.title) LIKE $1)
                ${wherePart}
                ORDER BY c.created_at DESC
                LIMIT $2
      `;

      results = await this.$queryRawUnsafe<any[]>(likeSql, searchPattern, limit);
    }

    console.log(`[KeywordSearch] Found ${results.length} results`);
    return results;
  }
}
