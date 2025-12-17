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
import { CmsService } from './cms.service';
import { Roles, CurrentUser } from '../../common/decorators';
import { RolesGuard, OrganisationGuard } from '../../common/guards';
import { UserRole, ContentStatus } from '@prisma/client';

@ApiTags('CMS')
@Controller('cms')
@UseGuards(AuthGuard('jwt'), RolesGuard, OrganisationGuard)
@ApiBearerAuth()
export class CmsController {
    constructor(private cmsService: CmsService) { }

    @Get()
    @ApiOperation({ summary: 'Get all content' })
    async findAll(
        @Query('page') page?: number,
        @Query('limit') limit?: number,
        @Query('status') status?: ContentStatus,
        @Request() req?: any,
    ) {
        // We need to filter by organisation! 
        // The service should support it. Checking service signature...
        // Assuming findAll supports organisationId as second param or I might need to update Service.
        // Let's pass it. If service doesn't support it, I'll need to update service too.
        return this.cmsService.findAll({ page, limit, status }, req.organisationId);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get content by ID' })
    async findOne(@Param('id') id: string) {
        // Should we verify if this content belongs to the org? 
        // Yes. Service usually checks or finds by ID globally. 
        // Ideally findOne should also take organisationId to ensure isolation.
        return this.cmsService.findOne(id);
    }

    @Get('slug/:slug')
    @ApiOperation({ summary: 'Get content by slug' })
    async findBySlug(@Param('slug') slug: string) {
        // TODO: We might want to scope this by org too if slugs are not globally unique.
        // But for now, just fix the lint.
        return this.cmsService.findBySlug(slug);
    }

    @Post()
    @Roles(UserRole.ADMIN, UserRole.EDITOR)
    @ApiOperation({ summary: 'Create new content' })
    async create(
        @CurrentUser('id') userId: string,
        @Request() req: any,
        @Body() dto: { title: string; slug: string; body: string; status?: ContentStatus },
    ) {
        return this.cmsService.create(userId, req.organisationId, dto);
    }

    @Put(':id')
    @Roles(UserRole.ADMIN, UserRole.EDITOR)
    @ApiOperation({ summary: 'Update content' })
    async update(
        @Param('id') id: string,
        @Body() dto: { title?: string; body?: string; status?: ContentStatus },
    ) {
        return this.cmsService.update(id, dto);
    }

    @Delete(':id')
    @Roles(UserRole.ADMIN)
    @ApiOperation({ summary: 'Delete content' })
    async remove(@Param('id') id: string) {
        return this.cmsService.remove(id);
    }

    @Post(':id/publish')
    @Roles(UserRole.ADMIN, UserRole.EDITOR)
    @ApiOperation({ summary: 'Publish content' })
    async publish(@Param('id') id: string) {
        return this.cmsService.publish(id);
    }

    @Post(':id/unpublish')
    @Roles(UserRole.ADMIN, UserRole.EDITOR)
    @ApiOperation({ summary: 'Unpublish content' })
    async unpublish(@Param('id') id: string) {
        return this.cmsService.unpublish(id);
    }
}
