import { IsString, IsOptional, IsEnum, IsArray, IsUUID, IsNumber, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { FaqStatus } from '@prisma/client';

export class CreateFaqEntryDto {
    @ApiProperty({ description: 'The question' })
    @IsString()
    question: string;

    @ApiProperty({ description: 'The answer' })
    @IsString()
    answer: string;

    @ApiPropertyOptional({ description: 'Category ID' })
    @IsOptional()
    @IsUUID()
    categoryId?: string;

    @ApiPropertyOptional({ description: 'Source IDs this FAQ was generated from' })
    @IsOptional()
    @IsArray()
    @IsUUID('4', { each: true })
    sourceIds?: string[];

    @ApiPropertyOptional({ enum: FaqStatus, default: 'DRAFT' })
    @IsOptional()
    @IsEnum(FaqStatus)
    status?: FaqStatus;
}

export class UpdateFaqEntryDto {
    @ApiPropertyOptional({ description: 'The question' })
    @IsOptional()
    @IsString()
    question?: string;

    @ApiPropertyOptional({ description: 'The answer' })
    @IsOptional()
    @IsString()
    answer?: string;

    @ApiPropertyOptional({ description: 'Category ID' })
    @IsOptional()
    @IsUUID()
    categoryId?: string;

    @ApiPropertyOptional({ enum: FaqStatus })
    @IsOptional()
    @IsEnum(FaqStatus)
    status?: FaqStatus;
}

export class CreateFaqCategoryDto {
    @ApiProperty({ description: 'Category name' })
    @IsString()
    name: string;

    @ApiPropertyOptional({ description: 'Category slug (auto-generated if not provided)' })
    @IsOptional()
    @IsString()
    slug?: string;

    @ApiPropertyOptional({ description: 'Display order', default: 0 })
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    order?: number;
}

export class FaqQueryDto {
    @ApiPropertyOptional({ default: 1 })
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    @Min(1)
    page?: number = 1;

    @ApiPropertyOptional({ default: 20 })
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    @Min(1)
    @Max(100)
    limit?: number = 20;

    @ApiPropertyOptional({ enum: FaqStatus })
    @IsOptional()
    @IsEnum(FaqStatus)
    status?: FaqStatus;

    @ApiPropertyOptional()
    @IsOptional()
    @IsUUID()
    categoryId?: string;
}

export class GenerateFaqDto {
    @ApiProperty({ description: 'Source ID to generate FAQs from' })
    @IsUUID()
    sourceId: string;

    @ApiPropertyOptional({ description: 'Maximum FAQs to generate per document', default: 5 })
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    @Min(1)
    @Max(10)
    maxPerDocument?: number = 5;
}

export class FaqSearchDto {
    @ApiProperty({ description: 'Search query' })
    @IsString()
    query: string;

    @ApiPropertyOptional({ default: 5 })
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    @Min(1)
    @Max(20)
    limit?: number = 5;
}

export class SyncFaqDto {
    @ApiProperty({
        description: 'Filter for FAQs to sync',
        enum: ['approved', 'draft', 'all'],
        example: 'approved'
    })
    @IsString()
    @IsEnum(['approved', 'draft', 'all'])
    filter: 'approved' | 'draft' | 'all';
}
