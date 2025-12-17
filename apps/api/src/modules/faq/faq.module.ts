import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { FaqController } from './faq.controller';
import { FaqRagController } from './faq-rag.controller';
import { FaqExportController } from './faq-export.controller';
import { FaqService } from './faq.service';
import { FaqGeneratorService } from './faq-generator.service';
import { FaqRagService } from './faq-rag.service';
import { FaqExportService } from './faq-export.service';

@Module({
    imports: [ConfigModule],
    controllers: [FaqController, FaqRagController, FaqExportController],
    providers: [FaqService, FaqGeneratorService, FaqRagService, FaqExportService],
    exports: [FaqService, FaqRagService, FaqExportService],
})
export class FaqModule { }
