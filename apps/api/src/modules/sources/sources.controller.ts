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
import { SourcesService } from './sources.service';
import { CreateSourceDto, UpdateSourceDto, SourceQueryDto } from './dto/sources.dto';
import { Roles } from '../../common/decorators';
import { RolesGuard } from '../../common/guards';
import { UserRole } from '@prisma/client';

@ApiTags('Sources')
@Controller('sources')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@ApiBearerAuth()
export class SourcesController {
    constructor(private sourcesService: SourcesService) { }

    @Get()
    @ApiOperation({ summary: 'Get all data sources' })
    async findAll(@Query() query: SourceQueryDto) {
        return this.sourcesService.findAll(query);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get a single source by ID' })
    async findOne(@Param('id') id: string) {
        return this.sourcesService.findOne(id);
    }

    @Post()
    @Roles(UserRole.ADMIN)
    @ApiOperation({ summary: 'Create a new data source' })
    async create(@Body() dto: CreateSourceDto) {
        return this.sourcesService.create(dto);
    }

    @Put(':id')
    @Roles(UserRole.ADMIN)
    @ApiOperation({ summary: 'Update a data source' })
    async update(@Param('id') id: string, @Body() dto: UpdateSourceDto) {
        return this.sourcesService.update(id, dto);
    }

    @Delete(':id')
    @Roles(UserRole.ADMIN)
    @ApiOperation({ summary: 'Delete a data source' })
    async remove(@Param('id') id: string) {
        return this.sourcesService.remove(id);
    }

    @Post(':id/test')
    @Roles(UserRole.ADMIN)
    @ApiOperation({ summary: 'Test connection to a data source' })
    async testConnection(@Param('id') id: string) {
        return this.sourcesService.testConnection(id);
    }
}
