import { Controller, Post, Body, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard, OrganisationGuard } from '../../common/guards';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SearchService } from './search.service';
import { RagService } from './rag.service';
import { SearchQueryDto, RagQueryDto } from './dto/search.dto';

@ApiTags('Search')
@Controller('search')
@UseGuards(AuthGuard('jwt'), RolesGuard, OrganisationGuard)
@ApiBearerAuth()
export class SearchController {
    constructor(
        private searchService: SearchService,
        private ragService: RagService,
    ) { }

    @Post()
    @ApiOperation({ summary: 'Search knowledge base' })
    async search(@Body() dto: SearchQueryDto, @Request() req: any) {
        return this.searchService.search(dto, req.organisationId);
    }

    @Post('rag')
    @ApiOperation({ summary: 'RAG query - search with AI-generated response' })
    async ragQuery(@Body() dto: RagQueryDto, @Request() req: any) {
        return this.ragService.generateResponse(dto, req.organisationId);
    }
}
