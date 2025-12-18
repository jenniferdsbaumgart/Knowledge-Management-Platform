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
import { KnowledgeService } from './knowledge.service';
import { CreateDocumentDto, UpdateDocumentDto, DocumentQueryDto } from './dto/knowledge.dto';
import { Roles } from '../../common/decorators';
import { RolesGuard, OrganisationGuard } from '../../common/guards';
import { UserRole } from '@prisma/client';

@ApiTags('Knowledge')
@Controller('knowledge')
@UseGuards(AuthGuard('jwt'), RolesGuard, OrganisationGuard)
@ApiBearerAuth()
export class KnowledgeController {
    constructor(private knowledgeService: KnowledgeService) { }

    @Get()
    @ApiOperation({ summary: 'Get all documents with pagination and filters' })
    async findAll(@Query() query: DocumentQueryDto, @Request() req: any) {
        return this.knowledgeService.findAll(query, req.organisationId);
    }

    @Get('stats')
    @ApiOperation({ summary: 'Get knowledge base statistics' })
    async getStats(@Request() req: any) {
        return this.knowledgeService.getStats(req.organisationId);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get a single document by ID' })
    async findOne(@Param('id') id: string, @Request() req: any) {
        return this.knowledgeService.findOne(id, req.organisationId);
    }

    @Post()
    @Roles(UserRole.ADMIN, UserRole.CLIENT)
    @ApiOperation({ summary: 'Create a new document' })
    async create(@Body() dto: CreateDocumentDto, @Request() req: any) {
        return this.knowledgeService.create(dto, req.organisationId);
    }

    @Put(':id')
    @Roles(UserRole.ADMIN, UserRole.CLIENT)
    @ApiOperation({ summary: 'Update a document' })
    async update(@Param('id') id: string, @Body() dto: UpdateDocumentDto, @Request() req: any) {
        return this.knowledgeService.update(id, dto, req.organisationId);
    }

    @Delete(':id')
    @Roles(UserRole.ADMIN)
    @ApiOperation({ summary: 'Delete a document' })
    async remove(@Param('id') id: string, @Request() req: any) {
        return this.knowledgeService.remove(id, req.organisationId);
    }
}
