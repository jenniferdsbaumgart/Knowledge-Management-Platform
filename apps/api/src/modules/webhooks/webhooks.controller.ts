import { Controller, Post, Body, Headers, UnauthorizedException } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { WebhooksService } from './webhooks.service';
import { ConfigService } from '@nestjs/config';

@ApiTags('Webhooks')
@Controller('webhooks')
export class WebhooksController {
    constructor(
        private webhooksService: WebhooksService,
        private configService: ConfigService,
    ) { }

    @Post('source')
    @ApiOperation({ summary: 'Receive source update webhook' })
    async handleSourceUpdate(
        @Headers('x-webhook-secret') secret: string,
        @Body() payload: { sourceId: string; action: 'created' | 'updated' | 'deleted'; data?: Record<string, unknown> },
    ) {
        this.validateWebhookSecret(secret);
        return this.webhooksService.handleSourceUpdate(payload);
    }

    @Post('document')
    @ApiOperation({ summary: 'Receive document update webhook' })
    async handleDocumentUpdate(
        @Headers('x-webhook-secret') secret: string,
        @Body() payload: { documentId: string; action: 'created' | 'updated' | 'deleted'; data?: Record<string, unknown> },
    ) {
        this.validateWebhookSecret(secret);
        return this.webhooksService.handleDocumentUpdate(payload);
    }

    @Post('feedback')
    @ApiOperation({ summary: 'Receive user feedback' })
    async handleFeedback(
        @Body() payload: { queryId?: string; rating: 'positive' | 'negative'; comment?: string; userId?: string },
    ) {
        // Feedback webhook doesn't require secret (public endpoint for widget)
        return this.webhooksService.handleFeedback(payload);
    }

    private validateWebhookSecret(secret: string) {
        const expectedSecret = this.configService.get<string>('WEBHOOK_SECRET');
        if (expectedSecret && secret !== expectedSecret) {
            throw new UnauthorizedException('Invalid webhook secret');
        }
    }
}
