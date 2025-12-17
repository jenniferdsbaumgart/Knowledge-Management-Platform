import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateSourceDto, UpdateSourceDto, SourceQueryDto } from './dto/sources.dto';
import { createConnector } from '@knowledge-platform/connectors';
import { SyncStatus, SourceType } from '@prisma/client';

@Injectable()
export class SourcesService {
    constructor(private prisma: PrismaService) { }

    async findAll(query: SourceQueryDto, organisationId: string) {
        const page = Number(query.page) || 1;
        const limit = Number(query.limit) || 20;
        const skip = (page - 1) * limit;
        const { type, status } = query;

        const where: any = { organisationId };
        if (type) where.type = type;
        if (status) where.status = status;

        const [sources, total] = await Promise.all([
            this.prisma.source.findMany({
                where,
                skip,
                take: limit,
                orderBy: { updatedAt: 'desc' },
                include: {
                    _count: { select: { documents: true } },
                },
            }),
            this.prisma.source.count({ where }),
        ]);

        return {
            items: sources,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }

    async findOne(id: string, organisationId?: string) {
        const where: any = { id };
        if (organisationId) where.organisationId = organisationId;

        const source = await this.prisma.source.findFirst({
            where,
            include: {
                _count: { select: { documents: true, syncLogs: true } },
                syncLogs: {
                    take: 10,
                    orderBy: { startedAt: 'desc' },
                },
            },
        });

        if (!source) {
            throw new NotFoundException(`Source with ID ${id} not found`);
        }

        return source;
    }

    async create(dto: CreateSourceDto, organisationId: string) {
        return this.prisma.source.create({
            data: {
                name: dto.name,
                description: dto.description,
                type: dto.type as SourceType,
                config: dto.config as any,
                syncSchedule: dto.syncSchedule,
                status: SyncStatus.IDLE,
                organisationId,
            },
        });
    }

    async update(id: string, dto: UpdateSourceDto, organisationId: string) {
        await this.findOne(id, organisationId);

        return this.prisma.source.update({
            where: { id },
            data: {
                name: dto.name,
                description: dto.description,
                type: dto.type as SourceType | undefined,
                config: dto.config as any,
                syncSchedule: dto.syncSchedule,
            },
        });
    }

    async remove(id: string, organisationId: string) {
        await this.findOne(id, organisationId);

        return this.prisma.source.delete({
            where: { id },
        });
    }

    async testConnection(id: string, organisationId: string) {
        const source = await this.findOne(id, organisationId);

        try {
            const connector = createConnector(source as any);
            const status = await connector.testConnection();

            return {
                success: status.connected,
                message: status.message,
                details: status.details,
            };
        } catch (error) {
            return {
                success: false,
                message: error instanceof Error ? error.message : 'Connection test failed',
            };
        }
    }
}
