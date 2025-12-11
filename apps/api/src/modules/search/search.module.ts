import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SearchController } from './search.controller';
import { SearchService } from './search.service';
import { RagService } from './rag.service';

@Module({
    imports: [ConfigModule],
    controllers: [SearchController],
    providers: [SearchService, RagService],
    exports: [SearchService, RagService],
})
export class SearchModule { }
