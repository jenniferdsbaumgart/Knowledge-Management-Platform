import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { SofiaWebhookService } from './sofia-webhook.service';
import { SofiaWebhookProcessor } from './sofia-webhook.processor';

@Module({
    imports: [
        PrismaModule,
        BullModule.registerQueue({
            name: 'sofia-webhooks',
        }),
    ],
    providers: [SofiaWebhookService, SofiaWebhookProcessor],
    exports: [SofiaWebhookService],
})
export class SofiaWebhookModule { }
