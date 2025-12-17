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
import { SourcesService } from './sources.service';
import { CreateSourceDto, UpdateSourceDto, SourceQueryDto } from './dto/sources.dto';
import { Roles } from '../../common/decorators';
import { RolesGuard, OrganisationGuard } from '../../common/guards';
import { UserRole } from '@prisma/client';

@ApiTags('Sources')
@Controller('sources')
@UseGuards(AuthGuard('jwt'), RolesGuard, OrganisationGuard)
@ApiBearerAuth()
export class SourcesController {
    constructor(private sourcesService: SourcesService) { }

    @Get()
    @ApiOperation({ summary: 'Get all data sources' })
    async findAll(@Query() query: SourceQueryDto, @Request() req: any) {
        return this.sourcesService.findAll(query, req.organisationId);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get a single source by ID' })
    async findOne(@Param('id') id: string, @Request() req: any) {
        return this.sourcesService.findOne(id, req.organisationId);
    }

    @Post()
    @Roles(UserRole.ADMIN)
    @ApiOperation({ summary: 'Create a new data source' })
    async create(@Body() dto: CreateSourceDto, @Request() req: any) {
        return this.sourcesService.create(dto, req.organisationId);
    }

    @Put(':id')
    @Roles(UserRole.ADMIN)
    @ApiOperation({ summary: 'Update a data source' })
    async update(@Param('id') id: string, @Body() dto: UpdateSourceDto, @Request() req: any) {
        return this.sourcesService.update(id, dto, req.organisationId);
    }

    @Delete(':id')
    @Roles(UserRole.ADMIN)
    @ApiOperation({ summary: 'Delete a data source' })
    async remove(@Param('id') id: string, @Request() req: any) {
        return this.sourcesService.remove(id, req.organisationId);
    }

    @Post(':id/test')
    @Roles(UserRole.ADMIN)
    @ApiOperation({ summary: 'Test connection to a data source' })
    async testConnection(@Param('id') id: string, @Request() req: any) {
        return this.sourcesService.testConnection(id, req.organisationId);
    }
}
