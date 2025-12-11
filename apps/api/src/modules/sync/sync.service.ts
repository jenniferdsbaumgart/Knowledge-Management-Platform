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

    async triggerSync(sourceId: string) {
        const source = await this.prisma.source.findUnique({
            where: { id: sourceId },
        });

        if (!source) {
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

    async getSyncStatus(sourceId: string) {
        const source = await this.prisma.source.findUnique({
            where: { id: sourceId },
            select: {
                id: true,
                name: true,
                status: true,
                lastSyncAt: true,
            },
        });

        if (!source) {
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

    async getSyncLogs(query: { page?: number | string; limit?: number | string; sourceId?: string }) {
        const page = Number(query.page) || 1;
        const limit = Number(query.limit) || 20;
        const skip = (page - 1) * limit;

        const where = query.sourceId ? { sourceId: query.sourceId } : {};

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

    async cancelSync(sourceId: string) {
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
