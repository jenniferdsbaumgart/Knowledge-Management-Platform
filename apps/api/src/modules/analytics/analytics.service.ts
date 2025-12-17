import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AnalyticsEventType } from '@prisma/client';

@Injectable()
export class AnalyticsService {
    constructor(private prisma: PrismaService) { }

    async trackEvent(
        type: AnalyticsEventType,
        userId?: string,
        metadata?: Record<string, unknown>,
        organisationId?: string,
    ) {
        return this.prisma.analyticsEvent.create({
            data: {
                type,
                userId,
                organisationId,
                metadata: (metadata || {}) as any,
            } as any,
        });
    }

    async getDashboardStats(days: number = 30, organisationId?: string) {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        const eventWhere: any = { timestamp: { gte: startDate } };
        if (organisationId) eventWhere.organisationId = organisationId;

        const docWhere: any = {};
        if (organisationId) docWhere.source = { organisationId };

        const chunkWhere: any = {};
        if (organisationId) chunkWhere.document = { source: { organisationId } };

        const [
            totalSearches,
            totalRagQueries,
            totalDocuments,
            totalChunks,
            searchesByDay,
            topQueries,
            feedbackStats,
        ] = await Promise.all([
            this.prisma.analyticsEvent.count({
                where: { ...eventWhere, type: 'SEARCH' },
            }),
            this.prisma.analyticsEvent.count({
                where: { ...eventWhere, type: 'RAG_QUERY' },
            }),
            this.prisma.document.count({ where: docWhere }),
            this.prisma.chunk.count({ where: chunkWhere }),
            this.getSearchesByDay(startDate, organisationId),
            this.getTopQueries(startDate, 10, organisationId),
            this.getFeedbackStats(startDate, organisationId),
        ]);

        return {
            period: { days, startDate, endDate: new Date() },
            metrics: {
                totalSearches,
                totalRagQueries,
                totalDocuments,
                totalChunks,
            },
            charts: {
                searchesByDay,
            },
            insights: {
                topQueries,
                feedback: feedbackStats,
            },
        };
    }

    private async getSearchesByDay(startDate: Date, organisationId?: string) {
        const where: any = {
            type: { in: ['SEARCH', 'RAG_QUERY'] },
            timestamp: { gte: startDate },
        };
        if (organisationId) where.organisationId = organisationId;

        const events = await this.prisma.analyticsEvent.findMany({
            where,
            select: { type: true, timestamp: true },
        });

        const byDay: Record<string, { searches: number; ragQueries: number }> = {};

        for (const event of events) {
            const day = event.timestamp.toISOString().split('T')[0];
            if (!byDay[day]) {
                byDay[day] = { searches: 0, ragQueries: 0 };
            }
            if (event.type === 'SEARCH') {
                byDay[day].searches++;
            } else {
                byDay[day].ragQueries++;
            }
        }

        return Object.entries(byDay)
            .map(([date, counts]) => ({ date, ...counts }))
            .sort((a, b) => a.date.localeCompare(b.date));
    }

    private async getTopQueries(startDate: Date, limit: number, organisationId?: string) {
        const where: any = {
            type: { in: ['SEARCH', 'RAG_QUERY'] },
            timestamp: { gte: startDate },
        };
        if (organisationId) where.organisationId = organisationId;

        const events = await this.prisma.analyticsEvent.findMany({
            where,
            select: { metadata: true },
        });

        const queryCounts: Record<string, number> = {};

        for (const event of events) {
            const query = (event.metadata as any)?.query;
            if (query && typeof query === 'string') {
                const normalized = query.toLowerCase().trim();
                queryCounts[normalized] = (queryCounts[normalized] || 0) + 1;
            }
        }

        return Object.entries(queryCounts)
            .map(([query, count]) => ({ query, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, limit);
    }

    private async getFeedbackStats(startDate: Date, organisationId?: string) {
        const where: any = {
            type: 'FEEDBACK',
            timestamp: { gte: startDate },
        };
        if (organisationId) where.organisationId = organisationId;

        const events = await this.prisma.analyticsEvent.findMany({
            where,
            select: { metadata: true },
        });

        let positive = 0;
        let negative = 0;

        for (const event of events) {
            const rating = (event.metadata as any)?.rating;
            if (rating === 'positive') positive++;
            else if (rating === 'negative') negative++;
        }

        return { positive, negative, total: positive + negative };
    }

    async getEvents(query: { page?: number | string; limit?: number | string; type?: AnalyticsEventType }, organisationId?: string) {
        const page = Number(query.page) || 1;
        const limit = Number(query.limit) || 20;
        const skip = (page - 1) * limit;

        const where: any = query.type ? { type: query.type } : {};
        if (organisationId) where.organisationId = organisationId;

        const [events, total] = await Promise.all([
            this.prisma.analyticsEvent.findMany({
                where,
                skip,
                take: limit,
                orderBy: { timestamp: 'desc' },
                include: { user: { select: { id: true, name: true, email: true } } },
            }),
            this.prisma.analyticsEvent.count({ where }),
        ]);

        return {
            items: events,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }
}
