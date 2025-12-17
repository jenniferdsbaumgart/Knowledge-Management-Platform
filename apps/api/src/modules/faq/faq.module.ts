import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { FaqController } from './faq.controller';
import { FaqRagController } from './faq-rag.controller';
import { FaqService } from './faq.service';
import { FaqGeneratorService } from './faq-generator.service';
import { FaqRagService } from './faq-rag.service';

@Module({
    imports: [ConfigModule],
    controllers: [FaqController, FaqRagController],
    providers: [FaqService, FaqGeneratorService, FaqRagService],
    exports: [FaqService, FaqRagService],
})
export class FaqModule { }
