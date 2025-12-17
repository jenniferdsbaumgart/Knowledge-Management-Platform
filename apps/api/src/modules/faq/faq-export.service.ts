import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

interface ExportOptions {
    status?: 'APPROVED' | 'DRAFT' | 'all';
    categoryId?: string;
    includeEmbeddings?: boolean;
}

interface FaqWithEmbedding {
    id: string;
    question: string;
    answer: string;
    status: string;
    confidence: number;
    category_name: string | null;
    created_at: Date;
    updated_at: Date;
    embedding: number[] | null;
}

@Injectable()
export class FaqExportService {
    constructor(private prisma: PrismaService) { }

    /**
     * Fetch FAQs with embeddings for export
     */
    private async getFaqsForExport(organisationId: string, options: ExportOptions): Promise<FaqWithEmbedding[]> {
        const statusFilter = options.status === 'all'
            ? "status IN ('APPROVED', 'DRAFT', 'ARCHIVED')"
            : options.status === 'DRAFT'
                ? "status = 'DRAFT'"
                : "status = 'APPROVED'";

        const categoryFilter = options.categoryId
            ? `AND category_id = '${options.categoryId}'::uuid`
            : '';

        const results = await this.prisma.$queryRawUnsafe<FaqWithEmbedding[]>(`
            SELECT 
                f.id,
                f.question,
                f.answer,
                f.status,
                f.confidence,
                c.name as category_name,
                f.created_at,
                f.updated_at,
                ${options.includeEmbeddings ? 'f.embedding::text' : 'NULL'} as embedding
            FROM "faq_entries" f
            LEFT JOIN "faq_categories" c ON f.category_id = c.id
            WHERE f.organisation_id = '${organisationId}'::uuid
            AND ${statusFilter}
            ${categoryFilter}
            ORDER BY f.created_at DESC
        `);

        // Parse embedding strings back to arrays if present
        return results.map(faq => ({
            ...faq,
            embedding: faq.embedding && typeof faq.embedding === 'string'
                ? JSON.parse((faq.embedding as string).replace(/^\[/, '[').replace(/\]$/, ']'))
                : faq.embedding
        }));
    }

    /**
     * Export as Full RAG Bundle (JSON with embeddings)
     */
    async exportRagBundle(organisationId: string, options: ExportOptions = {}) {
        const faqs = await this.getFaqsForExport(organisationId, {
            ...options,
            includeEmbeddings: true
        });

        return {
            version: '1.0',
            format: 'rag-bundle',
            model: 'text-embedding-ada-002',
            dimensions: 1536,
            exportedAt: new Date().toISOString(),
            organisationId,
            totalEntries: faqs.length,
            entries: faqs.map(faq => ({
                id: faq.id,
                question: faq.question,
                answer: faq.answer,
                embedding: faq.embedding,
                metadata: {
                    status: faq.status,
                    category: faq.category_name,
                    confidence: faq.confidence,
                    createdAt: faq.created_at,
                    updatedAt: faq.updated_at,
                }
            }))
        };
    }

    /**
     * Export as OpenAI JSONL format for fine-tuning
     */
    async exportOpenAIFormat(organisationId: string, options: ExportOptions = {}): Promise<string> {
        const faqs = await this.getFaqsForExport(organisationId, {
            ...options,
            includeEmbeddings: false
        });

        const systemPrompt = 'You are a helpful FAQ assistant. Answer questions based on your knowledge base accurately and concisely.';

        const lines = faqs.map(faq => {
            const entry = {
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: faq.question },
                    { role: 'assistant', content: faq.answer }
                ]
            };
            return JSON.stringify(entry);
        });

        return lines.join('\n');
    }

    /**
     * Export as LangChain-compatible documents
     */
    async exportLangChainFormat(organisationId: string, options: ExportOptions = {}) {
        const faqs = await this.getFaqsForExport(organisationId, {
            ...options,
            includeEmbeddings: options.includeEmbeddings ?? true
        });

        return {
            version: '1.0',
            format: 'langchain',
            exportedAt: new Date().toISOString(),
            documents: faqs.map(faq => ({
                pageContent: `Question: ${faq.question}\n\nAnswer: ${faq.answer}`,
                metadata: {
                    id: faq.id,
                    source: 'faq',
                    category: faq.category_name,
                    status: faq.status,
                    confidence: faq.confidence,
                    createdAt: faq.created_at,
                    updatedAt: faq.updated_at,
                    ...(options.includeEmbeddings && faq.embedding ? { embedding: faq.embedding } : {})
                }
            }))
        };
    }

    /**
     * Export as System Prompt Bundle (Markdown)
     */
    async exportSystemPrompt(organisationId: string, options: ExportOptions = {}): Promise<string> {
        const faqs = await this.getFaqsForExport(organisationId, {
            ...options,
            includeEmbeddings: false
        });

        // Group by category
        const byCategory = faqs.reduce((acc, faq) => {
            const cat = faq.category_name || 'General';
            if (!acc[cat]) acc[cat] = [];
            acc[cat].push(faq);
            return acc;
        }, {} as Record<string, FaqWithEmbedding[]>);

        let markdown = `# FAQ Knowledge Base

> **Exported:** ${new Date().toISOString()}
> **Total Entries:** ${faqs.length}

## Instructions

You are an AI assistant with access to the FAQ knowledge base below. Answer user questions using ONLY the information contained in this knowledge base. If you cannot find the answer, clearly state that you don't have that information.

---

`;

        for (const [category, categoryFaqs] of Object.entries(byCategory)) {
            markdown += `## ${category}\n\n`;

            for (const faq of categoryFaqs) {
                markdown += `### Q: ${faq.question}\n\n`;
                markdown += `${faq.answer}\n\n`;
                markdown += `---\n\n`;
            }
        }

        return markdown;
    }

    /**
     * Export as CSV format for vector database import
     */
    async exportCsv(organisationId: string, options: ExportOptions = {}): Promise<string> {
        const faqs = await this.getFaqsForExport(organisationId, {
            ...options,
            includeEmbeddings: options.includeEmbeddings ?? true
        });

        // CSV header
        const headers = ['id', 'question', 'answer', 'category', 'status', 'confidence', 'created_at', 'updated_at'];
        if (options.includeEmbeddings) {
            headers.push('embedding');
        }

        const escapeCSV = (value: string | null | undefined): string => {
            if (value === null || value === undefined) return '';
            const str = String(value);
            if (str.includes(',') || str.includes('"') || str.includes('\n')) {
                return `"${str.replace(/"/g, '""')}"`;
            }
            return str;
        };

        const rows = faqs.map(faq => {
            const row = [
                faq.id,
                escapeCSV(faq.question),
                escapeCSV(faq.answer),
                escapeCSV(faq.category_name),
                faq.status,
                String(faq.confidence),
                faq.created_at.toISOString(),
                faq.updated_at.toISOString(),
            ];

            if (options.includeEmbeddings) {
                row.push(faq.embedding ? JSON.stringify(faq.embedding) : '');
            }

            return row.join(',');
        });

        return [headers.join(','), ...rows].join('\n');
    }

    /**
     * Get export metadata/summary
     */
    async getExportSummary(organisationId: string) {
        const counts = await this.prisma.faqEntry.groupBy({
            by: ['status'],
            where: { organisationId },
            _count: true,
        });

        const categories = await this.prisma.faqCategory.findMany({
            include: { _count: { select: { entries: true } } }
        });

        return {
            totalEntries: counts.reduce((sum, c) => sum + c._count, 0),
            byStatus: Object.fromEntries(counts.map(c => [c.status, c._count])),
            categories: categories.map(c => ({
                id: c.id,
                name: c.name,
                count: c._count.entries
            })),
            availableFormats: [
                { id: 'rag-bundle', name: 'RAG Bundle (JSON)', description: 'Full export with embeddings for vector databases' },
                { id: 'openai-jsonl', name: 'OpenAI JSONL', description: 'Fine-tuning format for GPT models' },
                { id: 'langchain', name: 'LangChain Documents', description: 'Compatible with LangChain/LlamaIndex' },
                { id: 'system-prompt', name: 'System Prompt', description: 'Markdown bundle for direct LLM use' },
                { id: 'csv', name: 'CSV', description: 'Tabular format for analytics and import' },
            ]
        };
    }
}
