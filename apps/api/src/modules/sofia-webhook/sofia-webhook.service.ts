import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../../common/prisma/prisma.service';
import { SofiaFaqPayload, SofiaWebhookJob } from './interfaces/sofia-payload.interface';

@Injectable()
export class SofiaWebhookService {
    private readonly logger = new Logger(SofiaWebhookService.name);

    constructor(
        @InjectQueue('sofia-webhooks') private sofiaQueue: Queue,
        private prisma: PrismaService,
    ) { }

    async sendFaqsToSofia(
        organisationId: string,
        faqIds: string[],
        updateType: 'create' | 'update' | 'delete' | 'sync',
    ): Promise<{ queued: boolean; reason?: string }> {
        // Fetch organisation with FAQs
        const organisation = await this.prisma.organisation.findUnique({
            where: { id: organisationId },
            include: {
                faqEntries: updateType === 'sync'
                    ? true
                    : { where: { id: { in: faqIds } } },
            },
        });

        if (!organisation) {
            this.logger.error(`Organisation ${organisationId} not found`);
            return { queued: false, reason: 'Organisation not found' };
        }

        // Check if webhook is enabled
        if (!organisation.sofiaWebhookEnabled || !organisation.sofiaWebhookUrl) {
            this.logger.log(`Sofia webhook disabled for ${organisation.name}`);
            return { queued: false, reason: 'Webhook disabled or URL not configured' };
        }

        // Build payload
        const payload: SofiaFaqPayload = {
            organisationId: organisation.id,
            organisationName: organisation.name,
            timestamp: new Date().toISOString(),
            faqs: organisation.faqEntries.map((faq) => ({
                id: faq.id,
                question: faq.question,
                answer: faq.answer,
                category: undefined, // Category name not directly available
                sourceId: faq.sourceIds?.[0] || undefined,
                status: faq.status,
                createdAt: faq.createdAt.toISOString(),
                updatedAt: faq.updatedAt.toISOString(),
            })),
            summary: {
                totalFaqs: organisation.faqEntries.length,
                updateType,
                affectedIds: faqIds,
            },
        };

        // Queue the job
        const job: SofiaWebhookJob = {
            organisationId: organisation.id,
            url: organisation.sofiaWebhookUrl,
            method: organisation.sofiaWebhookMethod || 'POST',
            payload,
            headers: (organisation.sofiaWebhookHeaders as Record<string, string>) || {},
            secret: organisation.sofiaWebhookSecret || undefined,
        };

        await this.sofiaQueue.add('send-faqs', job, {
            attempts: 5,
            backoff: {
                type: 'exponential',
                delay: 3000, // 3s, 6s, 12s, 24s, 48s
            },
            removeOnComplete: 100,
            removeOnFail: 500,
        });

        this.logger.log(`Sofia webhook queued for ${organisation.name} (${payload.faqs.length} FAQs)`);
        return { queued: true };
    }

    async testWebhook(organisationId: string): Promise<{
        success: boolean;
        status?: number;
        duration?: number;
        error?: string;
        response?: any;
    }> {
        const organisation = await this.prisma.organisation.findUnique({
            where: { id: organisationId },
        });

        if (!organisation?.sofiaWebhookUrl) {
            return { success: false, error: 'Sofia webhook URL not configured' };
        }

        const testPayload: SofiaFaqPayload = {
            organisationId: organisation.id,
            organisationName: organisation.name,
            timestamp: new Date().toISOString(),
            faqs: [],
            summary: {
                totalFaqs: 0,
                updateType: 'sync',
                affectedIds: [],
            },
        };

        const startTime = Date.now();

        try {
            const headers: Record<string, string> = {
                'Content-Type': 'application/json',
                'X-Test-Webhook': 'true',
                ...(organisation.sofiaWebhookHeaders as Record<string, string> || {}),
            };

            if (organisation.sofiaWebhookSecret) {
                headers['Authorization'] = `Bearer ${organisation.sofiaWebhookSecret}`;
            }

            const response = await fetch(organisation.sofiaWebhookUrl, {
                method: organisation.sofiaWebhookMethod || 'POST',
                headers,
                body: JSON.stringify(testPayload),
                signal: AbortSignal.timeout(10000),
            });

            const duration = Date.now() - startTime;
            let responseData: any;

            try {
                responseData = await response.json();
            } catch {
                responseData = await response.text();
            }

            // Log the test
            await this.prisma.sofiaWebhookLog.create({
                data: {
                    organisationId,
                    method: organisation.sofiaWebhookMethod || 'POST',
                    url: organisation.sofiaWebhookUrl,
                    payload: testPayload as any,
                    status: response.status,
                    response: responseData as any,
                    duration,
                    attempt: 1,
                },
            });

            return {
                success: response.ok,
                status: response.status,
                duration,
                response: responseData,
            };
        } catch (err) {
            const duration = Date.now() - startTime;
            const error = err instanceof Error ? err.message : 'Unknown error';

            // Log the error
            await this.prisma.sofiaWebhookLog.create({
                data: {
                    organisationId,
                    method: organisation.sofiaWebhookMethod || 'POST',
                    url: organisation.sofiaWebhookUrl,
                    payload: testPayload as any,
                    status: 0,
                    error,
                    duration,
                    attempt: 1,
                },
            });

            return {
                success: false,
                duration,
                error,
            };
        }
    }
}
