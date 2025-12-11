import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class WebhooksService {
    private readonly logger = new Logger(WebhooksService.name);

    constructor(private prisma: PrismaService) { }

    async handleSourceUpdate(payload: {
        sourceId: string;
        action: 'created' | 'updated' | 'deleted';
        data?: Record<string, unknown>;
    }) {
        this.logger.log(`Received source webhook: ${payload.action} for ${payload.sourceId}`);

        // Handle the webhook based on action
        switch (payload.action) {
            case 'created':
            case 'updated':
                // Could trigger a sync here
                break;
            case 'deleted':
                // Cleanup if needed
                break;
        }

        return { received: true, timestamp: new Date() };
    }

    async handleDocumentUpdate(payload: {
        documentId: string;
        action: 'created' | 'updated' | 'deleted';
        data?: Record<string, unknown>;
    }) {
        this.logger.log(`Received document webhook: ${payload.action} for ${payload.documentId}`);

        return { received: true, timestamp: new Date() };
    }

    async handleFeedback(payload: {
        queryId?: string;
        rating: 'positive' | 'negative';
        comment?: string;
        userId?: string;
    }) {
        this.logger.log(`Received feedback: ${payload.rating}`);

        // Track the feedback event
        await this.prisma.analyticsEvent.create({
            data: {
                type: 'FEEDBACK',
                userId: payload.userId,
                metadata: {
                    queryId: payload.queryId,
                    rating: payload.rating,
                    comment: payload.comment,
                },
            },
        });

        return { received: true, timestamp: new Date() };
    }
}
