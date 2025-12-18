import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { SofiaWebhookJob } from './interfaces/sofia-payload.interface';

@Processor('sofia-webhooks')
export class SofiaWebhookProcessor extends WorkerHost {
    private readonly logger = new Logger(SofiaWebhookProcessor.name);

    constructor(private prisma: PrismaService) {
        super();
    }

    async process(job: Job<SofiaWebhookJob>): Promise<void> {
        const { organisationId, url, method, payload, headers, secret } = job.data;
        const startTime = Date.now();

        this.logger.log(
            `Processing Sofia webhook for org ${organisationId} (attempt ${job.attemptsMade + 1})`,
        );

        try {
            // Prepare headers
            const requestHeaders: Record<string, string> = {
                'Content-Type': 'application/json',
                'X-Organisation-Id': organisationId,
                'X-Timestamp': new Date().toISOString(),
                ...headers,
            };

            // Add auth if configured
            if (secret) {
                requestHeaders['Authorization'] = `Bearer ${secret}`;
            }

            // Send to Sofia
            const response = await fetch(url, {
                method,
                headers: requestHeaders,
                body: JSON.stringify(payload),
                signal: AbortSignal.timeout(30000), // 30 seconds
            });

            const duration = Date.now() - startTime;
            let responseData: any;

            try {
                responseData = await response.json();
            } catch {
                responseData = await response.text();
            }

            // Log success
            await this.prisma.sofiaWebhookLog.create({
                data: {
                    organisationId,
                    method,
                    url,
                    payload: payload as any,
                    status: response.status,
                    response: responseData as any,
                    duration,
                    attempt: job.attemptsMade + 1,
                },
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            this.logger.log(`Sofia webhook sent successfully to ${url} (${duration}ms)`);
        } catch (err) {
            const duration = Date.now() - startTime;
            const error = err instanceof Error ? err.message : 'Unknown error';

            // Log error
            await this.prisma.sofiaWebhookLog.create({
                data: {
                    organisationId,
                    method,
                    url,
                    payload: payload as any,
                    status: 0,
                    error,
                    duration,
                    attempt: job.attemptsMade + 1,
                },
            });

            this.logger.error(
                `Sofia webhook failed: ${error} (attempt ${job.attemptsMade + 1}/5)`,
            );

            // Re-throw for BullMQ retry
            throw err;
        }
    }
}
