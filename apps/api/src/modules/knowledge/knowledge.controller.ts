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
import { KnowledgeService } from './knowledge.service';
import { CreateDocumentDto, UpdateDocumentDto, DocumentQueryDto } from './dto/knowledge.dto';
import { Roles } from '../../common/decorators';
import { RolesGuard } from '../../common/guards';
import { UserRole } from '@prisma/client';

@ApiTags('Knowledge')
@Controller('knowledge')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@ApiBearerAuth()
export class KnowledgeController {
    constructor(private knowledgeService: KnowledgeService) { }

    @Get()
    @ApiOperation({ summary: 'Get all documents with pagination and filters' })
    async findAll(@Query() query: DocumentQueryDto) {
        return this.knowledgeService.findAll(query);
    }

    @Get('stats')
    @ApiOperation({ summary: 'Get knowledge base statistics' })
    async getStats() {
        return this.knowledgeService.getStats();
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get a single document by ID' })
    async findOne(@Param('id') id: string) {
        return this.knowledgeService.findOne(id);
    }

    @Post()
    @Roles(UserRole.ADMIN, UserRole.EDITOR)
    @ApiOperation({ summary: 'Create a new document' })
    async create(@Body() dto: CreateDocumentDto) {
        return this.knowledgeService.create(dto);
    }

    @Put(':id')
    @Roles(UserRole.ADMIN, UserRole.EDITOR)
    @ApiOperation({ summary: 'Update a document' })
    async update(@Param('id') id: string, @Body() dto: UpdateDocumentDto) {
        return this.knowledgeService.update(id, dto);
    }

    @Delete(':id')
    @Roles(UserRole.ADMIN)
    @ApiOperation({ summary: 'Delete a document' })
    async remove(@Param('id') id: string) {
        return this.knowledgeService.remove(id);
    }
}
