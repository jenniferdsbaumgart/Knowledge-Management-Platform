import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { FaqController } from './faq.controller';
import { FaqRagController } from './faq-rag.controller';
import { FaqExportController } from './faq-export.controller';
import { FaqService } from './faq.service';
import { FaqGeneratorService } from './faq-generator.service';
import { FaqRagService } from './faq-rag.service';
import { FaqExportService } from './faq-export.service';
import { SofiaWebhookModule } from '../sofia-webhook/sofia-webhook.module';

@Module({
    imports: [ConfigModule, SofiaWebhookModule],
    controllers: [FaqController, FaqRagController, FaqExportController],
    providers: [FaqService, FaqGeneratorService, FaqRagService, FaqExportService],
    exports: [FaqService, FaqRagService, FaqExportService],
})
export class FaqModule { }
