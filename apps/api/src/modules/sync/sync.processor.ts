import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../common/prisma/prisma.service';
import { createConnector } from '@knowledge-platform/connectors';
import { ChunkingService, EmbeddingService } from '@knowledge-platform/rag';
import { QUEUE_NAMES } from '@knowledge-platform/shared';
import { SyncStatus, SyncLogStatus, DocumentStatus, SourceType } from '@prisma/client';
import { UploadService } from '../upload/upload.service';
import pdfParse from 'pdf-parse';
import * as mammoth from 'mammoth';
import * as XLSX from 'xlsx';

interface SyncJobData {
    sourceId: string;
    syncLogId: string;
}

interface DocumentData {
    externalId: string;
    title: string;
    content: string;
    metadata: Record<string, any>;
}

@Processor(QUEUE_NAMES.SYNC)
export class SyncProcessor extends WorkerHost {
    private chunkingService: ChunkingService;
    private embeddingService: EmbeddingService | null = null;

    constructor(
        private prisma: PrismaService,
        private configService: ConfigService,
        private uploadService: UploadService,
    ) {
        super();
        this.chunkingService = new ChunkingService();
    }

    private getEmbeddingService(): EmbeddingService {
        if (!this.embeddingService) {
            // Check if we should use OpenRouter
            const useOpenRouter = process.env.USE_OPENROUTER === 'true';

            let apiKey = this.configService.get<string>('openai.apiKey') || process.env.OPENAI_API_KEY;
            let baseURL = this.configService.get<string>('openai.baseURL') || process.env.OPENAI_BASE_URL;

            if (useOpenRouter) {
                console.log('[Sync] Using OpenRouter configuration');
                apiKey = process.env.OPENROUTER_API_KEY || apiKey;
                baseURL = 'https://openrouter.ai/api/v1';
            }

            console.log(`[Sync] Initializing EmbeddingService with key: ${apiKey?.substring(0, 10)}... URL: ${baseURL || 'default'}`);
            if (!apiKey) {
                throw new Error('API key not configured (OpenAI or OpenRouter)');
            }
            this.embeddingService = new EmbeddingService(apiKey, undefined, baseURL);
        }
        return this.embeddingService;
    }

    private async parseFileContent(buffer: Buffer, fileName: string): Promise<string> {
        const ext = fileName.split('.').pop()?.toLowerCase() || '';

        try {
            switch (ext) {
                case 'pdf': {
                    const pdfData = await pdfParse(buffer);
                    return pdfData.text || '';
                }
                case 'docx':
                case 'doc': {
                    const result = await mammoth.extractRawText({ buffer });
                    return result.value || '';
                }
                case 'xlsx':
                case 'xls': {
                    const workbook = XLSX.read(buffer, { type: 'buffer' });
                    let content = '';
                    for (const sheetName of workbook.SheetNames) {
                        const sheet = workbook.Sheets[sheetName];
                        content += `--- Sheet: ${sheetName} ---\n`;
                        content += XLSX.utils.sheet_to_csv(sheet) + '\n';
                    }
                    return content.trim();
                }
                case 'csv':
                case 'txt':
                case 'md':
                case 'json':
                    return buffer.toString('utf-8');
                default:
                    console.warn(`[Sync] Unknown file type: ${ext}, treating as text`);
                    return buffer.toString('utf-8');
            }
        } catch (error) {
            console.error(`[Sync] Failed to parse ${fileName}:`, error);
            throw error;
        }
    }

    private async fetchDocumentsFromMinIO(sourceId: string): Promise<DocumentData[]> {
        const documents: DocumentData[] = [];
        const files = await this.uploadService.listFiles(sourceId);

        console.log(`[Sync] Found ${files.length} files in MinIO for source ${sourceId}`);

        for (const fileName of files) {
            try {
                const buffer = await this.uploadService.getFile(fileName);
                const baseName = fileName.split('/').pop() || fileName;

                console.log(`[Sync] Parsing file: ${baseName}`);
                const content = await this.parseFileContent(buffer, baseName);

                if (!content || content.trim().length === 0) {
                    console.warn(`[Sync] Empty content for ${baseName}, skipping`);
                    continue;
                }

                documents.push({
                    externalId: fileName,
                    title: baseName,
                    content: content,
                    metadata: {
                        sourceType: 'DOCUMENT',
                        fileName: baseName,
                        filePath: fileName,
                        fileSize: buffer.length,
                    },
                });
            } catch (error) {
                console.error(`[Sync] Failed to process file ${fileName}:`, error);
            }
        }

        return documents;
    }

    async process(job: Job<SyncJobData>) {
        const { sourceId, syncLogId } = job.data;
        let documentsProcessed = 0;
        let chunksCreated = 0;

        console.log(`[Sync] Starting sync job for source: ${sourceId}`);

        try {
            // Get source
            const source = await this.prisma.source.findUnique({
                where: { id: sourceId },
            });

            if (!source) {
                throw new Error(`Source ${sourceId} not found`);
            }

            console.log(`[Sync] Fetching data from source: ${source.name} (type: ${source.type})`);

            // Fetch documents based on source type
            let fetchedDocuments: DocumentData[];

            if (source.type === SourceType.DOCUMENT) {
                // For DOCUMENT sources, read from MinIO
                fetchedDocuments = await this.fetchDocumentsFromMinIO(sourceId);
            } else {
                // For other sources, use the connector
                const connector = createConnector(source as any);
                const result = await connector.fetchAll();
                fetchedDocuments = result.documents;
            }

            console.log(`[Sync] Fetched ${fetchedDocuments.length} documents`);

            // Process each document
            for (const docData of fetchedDocuments) {
                console.log(`[Sync] Processing document: ${docData.title || docData.externalId}`);

                // Create or update document
                const document = await this.prisma.document.upsert({
                    where: {
                        sourceId_externalId: {
                            sourceId,
                            externalId: docData.externalId,
                        },
                    },
                    create: {
                        sourceId,
                        externalId: docData.externalId,
                        title: docData.title,
                        content: docData.content,
                        metadata: docData.metadata as any,
                        status: DocumentStatus.PROCESSING,
                    },
                    update: {
                        title: docData.title,
                        content: docData.content,
                        metadata: docData.metadata as any,
                        status: DocumentStatus.PROCESSING,
                    },
                });

                // Delete existing chunks
                await this.prisma.chunk.deleteMany({
                    where: { documentId: document.id },
                });

                // Create chunks
                const chunkResult = this.chunkingService.chunkSemantic(docData.content);

                console.log(`[Sync] Generated ${chunkResult.chunks.length} chunks, generating embeddings...`);

                // Generate embeddings for chunks
                const { embeddings } = await this.getEmbeddingService().embedBatch(
                    chunkResult.chunks.map((c) => c.content)
                );

                console.log(`[Sync] Generated ${embeddings.length} embeddings, saving...`);

                // Save chunks with embeddings
                for (let i = 0; i < chunkResult.chunks.length; i++) {
                    const chunk = chunkResult.chunks[i];
                    const embedding = embeddings[i]?.embedding;
                    const chunkMetadata = JSON.stringify(chunk.metadata || {});

                    await this.prisma.$executeRaw`
            INSERT INTO chunks (id, document_id, content, embedding, metadata, created_at)
            VALUES (
              gen_random_uuid(),
              ${document.id}::uuid,
              ${chunk.content},
              ${embedding ? `[${embedding.join(',')}]` : null}::vector,
              ${chunkMetadata}::jsonb,
              NOW()
            )
          `;
                    chunksCreated++;
                }

                // Update document status
                await this.prisma.document.update({
                    where: { id: document.id },
                    data: { status: DocumentStatus.INDEXED },
                });

                documentsProcessed++;
                await job.updateProgress((documentsProcessed / fetchedDocuments.length) * 100);
            }

            // Update source and sync log
            await this.prisma.source.update({
                where: { id: sourceId },
                data: {
                    status: SyncStatus.SUCCESS,
                    lastSyncAt: new Date(),
                },
            });

            await this.prisma.syncLog.update({
                where: { id: syncLogId },
                data: {
                    status: SyncLogStatus.COMPLETED,
                    documentsCount: documentsProcessed,
                    chunksCount: chunksCreated,
                    completedAt: new Date(),
                },
            });

            console.log(`[Sync] ✅ Completed! Processed ${documentsProcessed} docs, ${chunksCreated} chunks`);
            return { documentsProcessed, chunksCreated };
        } catch (error) {
            console.error(`[Sync] ❌ Error:`, error);

            // Update source and sync log with error
            await this.prisma.source.update({
                where: { id: sourceId },
                data: { status: SyncStatus.FAILED },
            });

            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error(`[Sync] Saving error message: ${errorMessage}`);

            await this.prisma.syncLog.update({
                where: { id: syncLogId },
                data: {
                    status: SyncLogStatus.FAILED,
                    errorMessage,
                    completedAt: new Date(),
                },
            });

            throw error;
        }
    }
}
