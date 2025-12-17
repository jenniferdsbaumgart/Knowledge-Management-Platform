import { Controller, Post, Body, Param, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FaqRagService } from './faq-rag.service';
import { OrganisationGuard } from '../../common/guards/organisation.guard';

@Controller('organisations/:organisationId/faq-rag')
@UseGuards(AuthGuard('jwt'), OrganisationGuard)
export class FaqRagController {
    constructor(private readonly faqRagService: FaqRagService) { }

    @Post('query')
    async query(
        @Param('organisationId') organisationId: string,
        @Body() body: { question: string; topK?: number }
    ) {
        return this.faqRagService.searchFaqs(organisationId, body.question, body.topK);
    }

    @Post('chat')
    async chat(
        @Param('organisationId') organisationId: string,
        @Body() body: { question: string }
    ) {
        return this.faqRagService.answerQuestion(organisationId, body.question);
    }
}
