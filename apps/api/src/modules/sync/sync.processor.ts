import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../common/prisma/prisma.service';
import { createConnector } from '@knowledge-platform/connectors';
import { ChunkingService, EmbeddingService } from '@knowledge-platform/rag';
import { QUEUE_NAMES } from '@knowledge-platform/shared';
import { SyncStatus, SyncLogStatus, DocumentStatus } from '@prisma/client';

interface SyncJobData {
    sourceId: string;
    syncLogId: string;
}

@Processor(QUEUE_NAMES.SYNC)
export class SyncProcessor extends WorkerHost {
    private chunkingService: ChunkingService;
    private embeddingService: EmbeddingService;

    constructor(
        private prisma: PrismaService,
        private configService: ConfigService,
    ) {
        super();
        this.chunkingService = new ChunkingService();
        const apiKey = this.configService.get<string>('openai.apiKey');
        this.embeddingService = new EmbeddingService(apiKey!);
    }

    async process(job: Job<SyncJobData>) {
        const { sourceId, syncLogId } = job.data;
        let documentsProcessed = 0;
        let chunksCreated = 0;

        try {
            // Get source
            const source = await this.prisma.source.findUnique({
                where: { id: sourceId },
            });

            if (!source) {
                throw new Error(`Source ${sourceId} not found`);
            }

            // Create connector and fetch data
            const connector = createConnector(source as any);
            const result = await connector.fetchAll();

            // Process each document
            for (const docData of result.documents) {
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

                // Generate embeddings for chunks
                const { embeddings } = await this.embeddingService.embedBatch(
                    chunkResult.chunks.map((c) => c.content)
                );

                // Save chunks with embeddings
                for (let i = 0; i < chunkResult.chunks.length; i++) {
                    const chunk = chunkResult.chunks[i];
                    const embedding = embeddings[i]?.embedding;

                    await this.prisma.$executeRaw`
            INSERT INTO chunks (id, document_id, content, embedding, metadata, created_at)
            VALUES (
              gen_random_uuid(),
              ${document.id}::uuid,
              ${chunk.content},
              ${embedding ? `[${embedding.join(',')}]` : null}::vector,
              ${JSON.stringify(chunk.metadata)}::jsonb,
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
                await job.updateProgress((documentsProcessed / result.documents.length) * 100);
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

            return { documentsProcessed, chunksCreated };
        } catch (error) {
            // Update source and sync log with error
            await this.prisma.source.update({
                where: { id: sourceId },
                data: { status: SyncStatus.FAILED },
            });

            await this.prisma.syncLog.update({
                where: { id: syncLogId },
                data: {
                    status: SyncLogStatus.FAILED,
                    errorMessage: error instanceof Error ? error.message : 'Unknown error',
                    completedAt: new Date(),
                },
            });

            throw error;
        }
    }
}
