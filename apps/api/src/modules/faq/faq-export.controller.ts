import {
    Controller,
    Get,
    Query,
    Param,
    UseGuards,
    Res,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { FaqExportService } from './faq-export.service';
import { OrganisationGuard } from '../../common/guards/organisation.guard';

@ApiTags('FAQ Export')
@Controller('organisations/:organisationId/faq/export')
@UseGuards(AuthGuard('jwt'), OrganisationGuard)
@ApiBearerAuth()
export class FaqExportController {
    constructor(private readonly exportService: FaqExportService) { }

    @Get('summary')
    @ApiOperation({ summary: 'Get export summary and available formats' })
    async getSummary(@Param('organisationId') organisationId: string) {
        return this.exportService.getExportSummary(organisationId);
    }

    @Get('rag-bundle')
    @ApiOperation({ summary: 'Export as RAG Bundle (JSON with embeddings)' })
    @ApiQuery({ name: 'status', required: false, enum: ['APPROVED', 'DRAFT', 'all'] })
    @ApiQuery({ name: 'categoryId', required: false })
    async exportRagBundle(
        @Param('organisationId') organisationId: string,
        @Query('status') status?: 'APPROVED' | 'DRAFT' | 'all',
        @Query('categoryId') categoryId?: string,
        @Res() res?: Response,
    ) {
        const data = await this.exportService.exportRagBundle(organisationId, {
            status: status || 'APPROVED',
            categoryId,
        });

        if (res) {
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Content-Disposition', `attachment; filename="faq-rag-bundle-${Date.now()}.json"`);
            res.send(JSON.stringify(data, null, 2));
        }

        return data;
    }

    @Get('openai-jsonl')
    @ApiOperation({ summary: 'Export as OpenAI JSONL for fine-tuning' })
    @ApiQuery({ name: 'status', required: false, enum: ['APPROVED', 'DRAFT', 'all'] })
    @ApiQuery({ name: 'categoryId', required: false })
    async exportOpenAI(
        @Param('organisationId') organisationId: string,
        @Query('status') status?: 'APPROVED' | 'DRAFT' | 'all',
        @Query('categoryId') categoryId?: string,
        @Res() res?: Response,
    ) {
        const data = await this.exportService.exportOpenAIFormat(organisationId, {
            status: status || 'APPROVED',
            categoryId,
        });

        if (res) {
            res.setHeader('Content-Type', 'application/jsonl');
            res.setHeader('Content-Disposition', `attachment; filename="faq-openai-${Date.now()}.jsonl"`);
            res.send(data);
        }

        return { content: data, format: 'jsonl' };
    }

    @Get('langchain')
    @ApiOperation({ summary: 'Export as LangChain-compatible documents' })
    @ApiQuery({ name: 'status', required: false, enum: ['APPROVED', 'DRAFT', 'all'] })
    @ApiQuery({ name: 'categoryId', required: false })
    @ApiQuery({ name: 'includeEmbeddings', required: false, type: Boolean })
    async exportLangChain(
        @Param('organisationId') organisationId: string,
        @Query('status') status?: 'APPROVED' | 'DRAFT' | 'all',
        @Query('categoryId') categoryId?: string,
        @Query('includeEmbeddings') includeEmbeddings?: string,
        @Res() res?: Response,
    ) {
        const data = await this.exportService.exportLangChainFormat(organisationId, {
            status: status || 'APPROVED',
            categoryId,
            includeEmbeddings: includeEmbeddings !== 'false',
        });

        if (res) {
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Content-Disposition', `attachment; filename="faq-langchain-${Date.now()}.json"`);
            res.send(JSON.stringify(data, null, 2));
        }

        return data;
    }

    @Get('system-prompt')
    @ApiOperation({ summary: 'Export as System Prompt (Markdown)' })
    @ApiQuery({ name: 'status', required: false, enum: ['APPROVED', 'DRAFT', 'all'] })
    @ApiQuery({ name: 'categoryId', required: false })
    async exportSystemPrompt(
        @Param('organisationId') organisationId: string,
        @Query('status') status?: 'APPROVED' | 'DRAFT' | 'all',
        @Query('categoryId') categoryId?: string,
        @Res() res?: Response,
    ) {
        const data = await this.exportService.exportSystemPrompt(organisationId, {
            status: status || 'APPROVED',
            categoryId,
        });

        if (res) {
            res.setHeader('Content-Type', 'text/markdown');
            res.setHeader('Content-Disposition', `attachment; filename="faq-system-prompt-${Date.now()}.md"`);
            res.send(data);
        }

        return { content: data, format: 'markdown' };
    }

    @Get('csv')
    @ApiOperation({ summary: 'Export as CSV for vector database import' })
    @ApiQuery({ name: 'status', required: false, enum: ['APPROVED', 'DRAFT', 'all'] })
    @ApiQuery({ name: 'categoryId', required: false })
    @ApiQuery({ name: 'includeEmbeddings', required: false, type: Boolean })
    async exportCsv(
        @Param('organisationId') organisationId: string,
        @Query('status') status?: 'APPROVED' | 'DRAFT' | 'all',
        @Query('categoryId') categoryId?: string,
        @Query('includeEmbeddings') includeEmbeddings?: string,
        @Res() res?: Response,
    ) {
        const data = await this.exportService.exportCsv(organisationId, {
            status: status || 'APPROVED',
            categoryId,
            includeEmbeddings: includeEmbeddings !== 'false',
        });

        if (res) {
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename="faq-export-${Date.now()}.csv"`);
            res.send(data);
        }

        return { content: data, format: 'csv' };
    }
}
