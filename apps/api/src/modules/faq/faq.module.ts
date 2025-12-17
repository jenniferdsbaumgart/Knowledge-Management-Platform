import { Module } from '@nestjs/common';
import { FaqController } from './faq.controller';
import { FaqService } from './faq.service';
import { FaqGeneratorService } from './faq-generator.service';

@Module({
    controllers: [FaqController],
    providers: [FaqService, FaqGeneratorService],
    exports: [FaqService],
})
export class FaqModule { }
