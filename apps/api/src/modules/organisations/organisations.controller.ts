import {
    Controller,
    Get,
    Post,
    Put,
    Delete,
    Body,
    Param,
    UseGuards,
    Request,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PrismaService } from '../../common/prisma/prisma.service';
import { Roles } from '../../common/decorators';
import { RolesGuard } from '../../common/guards';
import { UserRole } from '@prisma/client';
import { SofiaWebhookService } from '../sofia-webhook/sofia-webhook.service';
import { UpdateSofiaWebhookDto } from './dto/update-sofia-webhook.dto';

@ApiTags('Organisations')
@Controller('organisations')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@ApiBearerAuth()
export class OrganisationsController {
    constructor(
        private prisma: PrismaService,
        private sofiaWebhookService: SofiaWebhookService,
    ) { }

    @Get('current')
    @ApiOperation({ summary: 'Get current user organisation' })
    async getCurrentOrg(@Request() req: any) {
        const user = req.user;
        return this.prisma.organisation.findUnique({
            where: { id: user.organisationId },
            include: {
                _count: {
                    select: {
                        users: true,
                        sources: true,
                        faqEntries: true,
                    },
                },
            },
        });
    }

    @Get()
    @Roles(UserRole.SUPER_ADMIN)
    @ApiOperation({ summary: 'List all organisations (super admin only)' })
    async findAll() {
        return this.prisma.organisation.findMany({
            orderBy: { name: 'asc' },
            include: {
                _count: {
                    select: {
                        users: true,
                        sources: true,
                        faqEntries: true,
                    },
                },
            },
        });
    }

    @Get(':id')
    @Roles(UserRole.SUPER_ADMIN)
    @ApiOperation({ summary: 'Get organisation by ID' })
    async findOne(@Param('id') id: string) {
        return this.prisma.organisation.findUnique({
            where: { id },
            include: {
                _count: {
                    select: {
                        users: true,
                        sources: true,
                        faqEntries: true,
                    },
                },
            },
        });
    }

    @Post()
    @Roles(UserRole.SUPER_ADMIN)
    @ApiOperation({ summary: 'Create new organisation' })
    async create(@Body() dto: { name: string; slug?: string }) {
        const slug = dto.slug || this.slugify(dto.name);
        return this.prisma.organisation.create({
            data: {
                name: dto.name,
                slug,
            },
        });
    }

    @Put(':id')
    @Roles(UserRole.SUPER_ADMIN)
    @ApiOperation({ summary: 'Update organisation' })
    async update(@Param('id') id: string, @Body() dto: { name?: string; slug?: string }) {
        return this.prisma.organisation.update({
            where: { id },
            data: dto,
        });
    }

    @Delete(':id')
    @Roles(UserRole.SUPER_ADMIN)
    @ApiOperation({ summary: 'Delete organisation' })
    async remove(@Param('id') id: string) {
        // This will cascade delete all related data
        return this.prisma.organisation.delete({
            where: { id },
        });
    }

    @Post('switch')
    @Roles(UserRole.SUPER_ADMIN)
    @ApiOperation({ summary: 'Switch to another organisation context' })
    async switchOrg(@Body() dto: { organisationId: string }, @Request() req: any) {
        // Verify org exists
        const org = await this.prisma.organisation.findUnique({
            where: { id: dto.organisationId },
        });

        if (!org) {
            throw new Error('Organisation not found');
        }

        // Update current user's organisation (for super admin context switching)
        await this.prisma.user.update({
            where: { id: req.user.id },
            data: { organisationId: dto.organisationId },
        });

        return { success: true, organisation: org };
    }

    // ==================== SOFIA WEBHOOK ENDPOINTS ====================

    @Get('current/sofia-webhook')
    @Roles(UserRole.ADMIN)
    @ApiOperation({ summary: 'Get Sofia webhook configuration for current org' })
    async getSofiaWebhookConfig(@Request() req: any) {
        const org = await this.prisma.organisation.findUnique({
            where: { id: req.user.organisationId },
            select: {
                sofiaWebhookUrl: true,
                sofiaWebhookEnabled: true,
                sofiaWebhookMethod: true,
                sofiaWebhookHeaders: true,
                // Don't return secret for security
            },
        });
        return org;
    }

    @Put('current/sofia-webhook')
    @Roles(UserRole.ADMIN)
    @ApiOperation({ summary: 'Update Sofia webhook configuration for current org' })
    async updateSofiaWebhook(@Body() dto: UpdateSofiaWebhookDto, @Request() req: any) {
        return this.prisma.organisation.update({
            where: { id: req.user.organisationId },
            data: {
                sofiaWebhookUrl: dto.sofiaWebhookUrl,
                sofiaWebhookEnabled: dto.sofiaWebhookEnabled,
                sofiaWebhookMethod: dto.sofiaWebhookMethod || 'POST',
                sofiaWebhookSecret: dto.sofiaWebhookSecret,
                sofiaWebhookHeaders: dto.sofiaWebhookHeaders as any,
            },
            select: {
                sofiaWebhookUrl: true,
                sofiaWebhookEnabled: true,
                sofiaWebhookMethod: true,
                sofiaWebhookHeaders: true,
            },
        });
    }

    @Post('current/sofia-webhook/test')
    @Roles(UserRole.ADMIN)
    @ApiOperation({ summary: 'Test Sofia webhook connection' })
    async testSofiaWebhook(@Request() req: any) {
        return this.sofiaWebhookService.testWebhook(req.user.organisationId);
    }

    @Get('current/sofia-webhook/logs')
    @Roles(UserRole.ADMIN)
    @ApiOperation({ summary: 'Get Sofia webhook delivery logs' })
    async getSofiaWebhookLogs(@Request() req: any) {
        return this.prisma.sofiaWebhookLog.findMany({
            where: { organisationId: req.user.organisationId },
            orderBy: { sentAt: 'desc' },
            take: 50,
        });
    }

    private slugify(text: string): string {
        return text
            .toLowerCase()
            .replace(/[^\w\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .trim();
    }
}

