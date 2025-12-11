import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SearchService } from './search.service';
import { RagService } from './rag.service';
import { SearchQueryDto, RagQueryDto } from './dto/search.dto';

@ApiTags('Search')
@Controller('search')
export class SearchController {
    constructor(
        private searchService: SearchService,
        private ragService: RagService,
    ) { }

    @Post()
    @UseGuards(AuthGuard('jwt'))
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Search knowledge base' })
    async search(@Body() dto: SearchQueryDto) {
        return this.searchService.search(dto);
    }

    @Post('rag')
    @UseGuards(AuthGuard('jwt'))
    @ApiBearerAuth()
    @ApiOperation({ summary: 'RAG query - search with AI-generated response' })
    async ragQuery(@Body() dto: RagQueryDto) {
        return this.ragService.generateResponse(dto);
    }
}
