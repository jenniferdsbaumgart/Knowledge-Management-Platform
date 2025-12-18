import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateDocumentDto, UpdateDocumentDto, DocumentQueryDto } from './dto/knowledge.dto';
import { DocumentStatus } from '@prisma/client';

@Injectable()
export class KnowledgeService {
    constructor(private prisma: PrismaService) { }

    async findAll(query: DocumentQueryDto, organisationId?: string) {
        const page = Number(query.page) || 1;
        const limit = Number(query.limit) || 20;
        const skip = (page - 1) * limit;
        const { sourceId, status, search } = query;

        const where: any = {};

        // Filter by organisation through source
        if (organisationId) {
            where.source = { organisationId };
        }

        if (sourceId) where.sourceId = sourceId;
        if (status) where.status = status;
        if (search) {
            where.OR = [
                { title: { contains: search, mode: 'insensitive' } },
                { content: { contains: search, mode: 'insensitive' } },
            ];
        }

        const [documents, total] = await Promise.all([
            this.prisma.document.findMany({
                where,
                skip,
                take: limit,
                orderBy: { updatedAt: 'desc' },
                include: {
                    source: { select: { id: true, name: true, type: true } },
                    _count: { select: { chunks: true } },
                },
            }),
            this.prisma.document.count({ where }),
        ]);

        return {
            items: documents,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }

    async findOne(id: string, organisationId?: string) {
        const where: any = { id };
        if (organisationId) {
            where.source = { organisationId };
        }

        const document = await this.prisma.document.findFirst({
            where,
            include: {
                source: { select: { id: true, name: true, type: true } },
                chunks: {
                    select: { id: true, content: true, metadata: true },
                    take: 100,
                },
            },
        });

        if (!document) {
            throw new NotFoundException(`Document with ID ${id} not found`);
        }

        return document;
    }

    async create(dto: CreateDocumentDto, organisationId?: string) {
        // Verify source belongs to organisation
        if (organisationId) {
            const source = await this.prisma.source.findFirst({
                where: { id: dto.sourceId, organisationId },
            });
            if (!source) {
                throw new NotFoundException('Source not found in your organisation');
            }
        }

        return this.prisma.document.create({
            data: {
                sourceId: dto.sourceId,
                title: dto.title,
                content: dto.content,
                metadata: (dto.metadata || {}) as any,
                status: DocumentStatus.PENDING,
            },
        });
    }

    async update(id: string, dto: UpdateDocumentDto, organisationId?: string) {
        await this.findOne(id, organisationId); // Ensure exists and belongs to org

        return this.prisma.document.update({
            where: { id },
            data: {
                title: dto.title,
                content: dto.content,
                metadata: dto.metadata as any,
                status: DocumentStatus.PENDING, // Re-index on update
            },
        });
    }

    async remove(id: string, organisationId?: string) {
        await this.findOne(id, organisationId);

        return this.prisma.document.delete({
            where: { id },
        });
    }

    async getStats(organisationId?: string) {
        // Build where clause to filter by organisation through source relation
        const documentWhere: any = {};
        const chunkWhere: any = {};

        if (organisationId) {
            documentWhere.source = { organisationId };
            chunkWhere.document = { source: { organisationId } };
        }

        const [totalDocuments, totalChunks, byStatus, bySource] = await Promise.all([
            this.prisma.document.count({ where: documentWhere }),
            this.prisma.chunk.count({ where: chunkWhere }),
            this.prisma.document.groupBy({
                by: ['status'],
                where: documentWhere,
                _count: true,
            }),
            this.prisma.document.groupBy({
                by: ['sourceId'],
                where: documentWhere,
                _count: true,
            }),
        ]);

        return {
            totalDocuments,
            totalChunks,
            byStatus: byStatus.reduce((acc, item) => {
                acc[item.status] = item._count;
                return acc;
            }, {} as Record<string, number>),
            bySource: bySource.length,
        };
    }
}
