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
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CmsService } from './cms.service';
import { Roles, CurrentUser } from '../../common/decorators';
import { RolesGuard } from '../../common/guards';
import { UserRole, ContentStatus } from '@prisma/client';

@ApiTags('CMS')
@Controller('cms')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@ApiBearerAuth()
export class CmsController {
    constructor(private cmsService: CmsService) { }

    @Get()
    @ApiOperation({ summary: 'Get all content' })
    async findAll(
        @Query('page') page?: number,
        @Query('limit') limit?: number,
        @Query('status') status?: ContentStatus,
    ) {
        return this.cmsService.findAll({ page, limit, status });
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get content by ID' })
    async findOne(@Param('id') id: string) {
        return this.cmsService.findOne(id);
    }

    @Get('slug/:slug')
    @ApiOperation({ summary: 'Get content by slug' })
    async findBySlug(@Param('slug') slug: string) {
        return this.cmsService.findBySlug(slug);
    }

    @Post()
    @Roles(UserRole.ADMIN, UserRole.EDITOR)
    @ApiOperation({ summary: 'Create new content' })
    async create(
        @CurrentUser('id') userId: string,
        @Body() dto: { title: string; slug: string; body: string; status?: ContentStatus },
    ) {
        return this.cmsService.create(userId, dto);
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
