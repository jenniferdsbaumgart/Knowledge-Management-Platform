import { IsString, IsOptional, IsArray, IsInt, Min, Max, IsEnum, IsNumber } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export enum SearchMode {
    SEMANTIC = 'semantic',
    KEYWORD = 'keyword',
    HYBRID = 'hybrid',
}

export class SearchQueryDto {
    @ApiProperty({ description: 'Search query string' })
    @IsString()
    query: string;

    @ApiPropertyOptional({ default: 10 })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(100)
    limit?: number = 10;

    @ApiPropertyOptional({ default: 0 })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(0)
    offset?: number = 0;

    @ApiPropertyOptional({ enum: SearchMode, default: 'hybrid' })
    @IsOptional()
    @IsEnum(SearchMode)
    mode?: SearchMode = SearchMode.HYBRID;

    @ApiPropertyOptional({ description: 'Filter by source IDs' })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    sourceIds?: string[];
}

export class ConversationMessageDto {
    @ApiProperty({ enum: ['user', 'assistant'] })
    @IsString()
    role: 'user' | 'assistant';

    @ApiProperty()
    @IsString()
    content: string;
}

export class RagQueryDto {
    @ApiProperty({ description: 'Question or query' })
    @IsString()
    query: string;

    @ApiPropertyOptional({ type: [ConversationMessageDto] })
    @IsOptional()
    @IsArray()
    conversationHistory?: ConversationMessageDto[];

    @ApiPropertyOptional({ default: 1024 })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(4096)
    maxTokens?: number = 1024;

    @ApiPropertyOptional({ default: 0.7 })
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    @Min(0)
    @Max(2)
    temperature?: number = 0.7;
}
