import { IsString, IsOptional, IsUUID, IsEnum, IsInt, Min, Max, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { DocumentStatus } from '@prisma/client';

export class CreateDocumentDto {
    @ApiProperty()
    @IsUUID()
    sourceId: string;

    @ApiProperty()
    @IsString()
    title: string;

    @ApiProperty()
    @IsString()
    content: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsObject()
    metadata?: Record<string, unknown>;
}

export class UpdateDocumentDto {
    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    title?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    content?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsObject()
    metadata?: Record<string, unknown>;
}

export class DocumentQueryDto {
    @ApiPropertyOptional({ default: 1 })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    page?: number = 1;

    @ApiPropertyOptional({ default: 20 })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(100)
    limit?: number = 20;

    @ApiPropertyOptional()
    @IsOptional()
    @IsUUID()
    sourceId?: string;

    @ApiPropertyOptional({ enum: DocumentStatus })
    @IsOptional()
    @IsEnum(DocumentStatus)
    status?: DocumentStatus;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    search?: string;
}
