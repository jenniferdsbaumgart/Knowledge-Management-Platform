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
    ) {
        return this.prisma.analyticsEvent.create({
            data: {
                type,
                userId,
                metadata: (metadata || {}) as any,
            },
        });
    }

    async getDashboardStats(days: number = 30) {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

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
                where: { type: 'SEARCH', timestamp: { gte: startDate } },
            }),
            this.prisma.analyticsEvent.count({
                where: { type: 'RAG_QUERY', timestamp: { gte: startDate } },
            }),
            this.prisma.document.count(),
            this.prisma.chunk.count(),
            this.getSearchesByDay(startDate),
            this.getTopQueries(startDate, 10),
            this.getFeedbackStats(startDate),
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

    private async getSearchesByDay(startDate: Date) {
        const events = await this.prisma.analyticsEvent.findMany({
            where: {
                type: { in: ['SEARCH', 'RAG_QUERY'] },
                timestamp: { gte: startDate },
            },
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

    private async getTopQueries(startDate: Date, limit: number) {
        const events = await this.prisma.analyticsEvent.findMany({
            where: {
                type: { in: ['SEARCH', 'RAG_QUERY'] },
                timestamp: { gte: startDate },
            },
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

    private async getFeedbackStats(startDate: Date) {
        const events = await this.prisma.analyticsEvent.findMany({
            where: {
                type: 'FEEDBACK',
                timestamp: { gte: startDate },
            },
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

    async getEvents(query: { page?: number | string; limit?: number | string; type?: AnalyticsEventType }) {
        const page = Number(query.page) || 1;
        const limit = Number(query.limit) || 20;
        const skip = (page - 1) * limit;

        const where = query.type ? { type: query.type } : {};

        const [events, total] = await Promise.all([
            this.prisma.analyticsEvent.findMany({
                where,
                skip,
                take: limit,
                orderBy: { timestamp: 'desc' },
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
