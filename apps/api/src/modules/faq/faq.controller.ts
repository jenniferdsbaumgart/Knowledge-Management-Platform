import {
    Controller,
    Get,
    Post,
    Put,
    Delete,
    Body,
    Param,
    Query,
    UseGuards,
    Request,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { FaqService } from './faq.service';
import { FaqGeneratorService } from './faq-generator.service';
import { Roles } from '../../common/decorators';
import { RolesGuard, OrganisationGuard } from '../../common/guards';
import { UserRole } from '@prisma/client';
import {
    CreateFaqEntryDto,
    UpdateFaqEntryDto,
    CreateFaqCategoryDto,
    FaqQueryDto,
    GenerateFaqDto,
    FaqSearchDto,
} from './dto/faq.dto';

@ApiTags('FAQ')
@Controller('faq')
@UseGuards(AuthGuard('jwt'), RolesGuard, OrganisationGuard)
export class FaqController {
    constructor(
        private faqService: FaqService,
        private faqGeneratorService: FaqGeneratorService,
    ) { }

    // ==================== ADMIN ENDPOINTS ====================

    @Get()
    @UseGuards(AuthGuard('jwt'), RolesGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get all FAQ entries (admin)' })
    async findAll(@Query() query: FaqQueryDto, @Request() req: any) {
        return this.faqService.findAll(query, req.organisationId);
    }

    @Get('categories')
    @UseGuards(AuthGuard('jwt'), RolesGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get all categories' })
    async findAllCategories() {
        return this.faqService.findAllCategories();
    }

    @Get(':id')
    @UseGuards(AuthGuard('jwt'), RolesGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get FAQ entry by ID' })
    async findOne(@Param('id') id: string) {
        return this.faqService.findOne(id);
    }

    @Post()
    @UseGuards(AuthGuard('jwt'), RolesGuard)
    @Roles(UserRole.ADMIN, UserRole.CLIENT)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Create FAQ entry manually' })
    async create(@Body() dto: CreateFaqEntryDto, @Request() req: any) {
        return this.faqService.create(dto, req.organisationId);
    }

    @Put(':id')
    @UseGuards(AuthGuard('jwt'), RolesGuard)
    @Roles(UserRole.ADMIN, UserRole.CLIENT)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Update FAQ entry' })
    async update(@Param('id') id: string, @Body() dto: UpdateFaqEntryDto) {
        return this.faqService.update(id, dto);
    }

    @Delete(':id')
    @UseGuards(AuthGuard('jwt'), RolesGuard)
    @Roles(UserRole.ADMIN)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Delete FAQ entry' })
    async remove(@Param('id') id: string) {
        return this.faqService.remove(id);
    }

    @Post(':id/approve')
    @UseGuards(AuthGuard('jwt'), RolesGuard)
    @Roles(UserRole.ADMIN, UserRole.CLIENT)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Approve draft FAQ entry' })
    async approve(@Param('id') id: string) {
        return this.faqService.approve(id);
    }

    @Post(':id/archive')
    @UseGuards(AuthGuard('jwt'), RolesGuard)
    @Roles(UserRole.ADMIN)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Archive FAQ entry' })
    async archive(@Param('id') id: string) {
        return this.faqService.archive(id);
    }

    @Post('categories')
    @UseGuards(AuthGuard('jwt'), RolesGuard)
    @Roles(UserRole.ADMIN)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Create category' })
    async createCategory(@Body() dto: CreateFaqCategoryDto) {
        return this.faqService.createCategory(dto);
    }

    @Delete('categories/:id')
    @UseGuards(AuthGuard('jwt'), RolesGuard)
    @Roles(UserRole.ADMIN)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Delete category' })
    async deleteCategory(@Param('id') id: string) {
        return this.faqService.deleteCategory(id);
    }

    @Post('generate')
    @UseGuards(AuthGuard('jwt'), RolesGuard)
    @Roles(UserRole.ADMIN, UserRole.CLIENT)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Generate FAQs from a source using AI' })
    async generate(@Body() dto: GenerateFaqDto, @Request() req: any) {
        const count = await this.faqGeneratorService.generateFromSource(
            dto.sourceId,
            req.organisationId,
            dto.maxPerDocument,
        );
        return { generated: count, message: `Generated ${count} FAQ entries` };
    }

    @Post('generate-all')
    @UseGuards(AuthGuard('jwt'), RolesGuard)
    @Roles(UserRole.ADMIN, UserRole.CLIENT)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Generate FAQs from all sources using AI' })
    async generateAll(@Body() body: { maxPerSource?: number }, @Request() req: any) {
        const count = await this.faqGeneratorService.generateFromAllSources(
            req.organisationId,
            body.maxPerSource || 5,
        );
        return { generated: count, message: `Generated ${count} FAQ entries from all sources` };
    }

    @Get('export/json')
    @UseGuards(AuthGuard('jwt'), RolesGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Export all FAQs as JSON' })
    async exportJson(@Query() query: { status?: string }, @Request() req: any) {
        const result = await this.faqService.findAll({
            limit: 1000,
            status: query.status as any,
        }, req.organisationId);

        return {
            faqs: result.items.map((faq) => ({
                id: faq.id,
                question: faq.question,
                answer: faq.answer,
                status: faq.status,
                category: faq.category?.name || null,
                createdAt: faq.createdAt,
            })),
            total: result.total,
            exportedAt: new Date().toISOString(),
        };
    }

    // ==================== PUBLIC ENDPOINTS ====================

    @Get('public/list')
    @ApiOperation({ summary: 'Get all approved FAQs (public)' })
    async getPublicFaqs() {
        return this.faqService.getPublicFaqs();
    }

    @Post('public/search')
    @ApiOperation({ summary: 'Search FAQs (public)' })
    async searchFaqs(@Body() dto: FaqSearchDto) {
        // For now, simple keyword search. Can be enhanced with embeddings later
        const result = await this.faqService.findAll({
            status: 'APPROVED' as any,
            limit: dto.limit,
        });

        // Simple filtering by query
        const query = dto.query.toLowerCase();
        const filtered = result.items.filter(
            (faq) =>
                faq.question.toLowerCase().includes(query) ||
                faq.answer.toLowerCase().includes(query),
        );

        return {
            results: filtered.map((faq) => ({
                id: faq.id,
                question: faq.question,
                answer: faq.answer,
                category: faq.category?.name || null,
                score: 1.0, // Placeholder score
            })),
        };
    }
}
