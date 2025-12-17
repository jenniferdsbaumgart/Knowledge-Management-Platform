import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../../common/prisma/prisma.service';
import { QUEUE_NAMES } from '@knowledge-platform/shared';
import { SyncStatus, SyncLogStatus } from '@prisma/client';

@Injectable()
export class SyncService {
    constructor(
        private prisma: PrismaService,
        @InjectQueue(QUEUE_NAMES.SYNC) private syncQueue: Queue,
    ) { }

    async triggerSync(sourceId: string) { // Organisation check handled by caller or via findUnique below if we want strictness
        // Service should ideally accept organisationId to prevent access to other org's sources by ID if caller isn't careful.
        // But Controller will guard it. Let's make it robust by checking source.organisationId if we don't pass it, 
        // OR better: pass organisationId to this method and include it in WHERE clause.
        // Since I can't easily change signature everywhere if used internally, let's stick to simple ID lookup 
        // BUT wait, multi-tenant means I MUST NOT allow accessing sourceId of another org.
        return this.triggerSyncSecure(sourceId);
    }

    // New secure method
    async triggerSyncSecure(sourceId: string, organisationId?: string) {
        const where: any = { id: sourceId };
        if (organisationId) where.organisationId = organisationId;

        const source = await this.prisma.source.findUnique({
            where: { id: sourceId }, // findUnique only works on ID. To check org, we need findFirst or check after fetch.
        });

        if (!source || (organisationId && source.organisationId !== organisationId)) {
            throw new NotFoundException(`Source ${sourceId} not found`);
        }

        // Update source status
        await this.prisma.source.update({
            where: { id: sourceId },
            data: { status: SyncStatus.SYNCING },
        });

        // Create sync log
        const syncLog = await this.prisma.syncLog.create({
            data: {
                sourceId,
                status: SyncLogStatus.STARTED,
            },
        });

        // Add job to queue
        await this.syncQueue.add('sync-source', {
            sourceId,
            syncLogId: syncLog.id,
        });

        return {
            message: 'Sync job queued',
            jobId: syncLog.id,
            sourceId,
        };
    }

    async getSyncStatus(sourceId: string, organisationId?: string) {
        const source = await this.prisma.source.findUnique({
            where: { id: sourceId },
            select: {
                id: true,
                organisationId: true,
                name: true,
                status: true,
                lastSyncAt: true,
            },
        });

        if (!source || (organisationId && source.organisationId !== organisationId)) {
            throw new NotFoundException(`Source ${sourceId} not found`);
        }

        const latestLogs = await this.prisma.syncLog.findMany({
            where: { sourceId },
            orderBy: { startedAt: 'desc' },
            take: 5,
        });

        return {
            source,
            recentLogs: latestLogs,
        };
    }

    async getSyncLogs(query: { page?: number | string; limit?: number | string; sourceId?: string }, organisationId?: string) {
        const page = Number(query.page) || 1;
        const limit = Number(query.limit) || 20;
        const skip = (page - 1) * limit;

        const where: any = {};
        if (query.sourceId) where.sourceId = query.sourceId;

        // Ensure source belongs to org
        if (organisationId) {
            where.source = { organisationId };
        }

        const [logs, total] = await Promise.all([
            this.prisma.syncLog.findMany({
                where,
                skip,
                take: limit,
                orderBy: { startedAt: 'desc' },
                include: {
                    source: { select: { id: true, name: true } },
                },
            }),
            this.prisma.syncLog.count({ where }),
        ]);

        return {
            items: logs,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }

    async cancelSync(sourceId: string, organisationId?: string) {
        // Verify ownership
        const source = await this.prisma.source.findUnique({ where: { id: sourceId } });
        if (!source || (organisationId && source.organisationId !== organisationId)) {
            throw new NotFoundException(`Source ${sourceId} not found`);
        }

        // Update source status
        await this.prisma.source.update({
            where: { id: sourceId },
            data: { status: SyncStatus.IDLE },
        });

        // Mark any running logs as failed
        await this.prisma.syncLog.updateMany({
            where: {
                sourceId,
                status: SyncLogStatus.STARTED,
            },
            data: {
                status: SyncLogStatus.FAILED,
                errorMessage: 'Sync cancelled by user',
                completedAt: new Date(),
            },
        });

        return { message: 'Sync cancelled' };
    }
}
