import { IsString, IsOptional, IsEnum, IsObject, IsInt, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { SourceType, SyncStatus } from '@prisma/client';

export class CreateSourceDto {
    @ApiProperty()
    @IsString()
    name: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    description?: string;

    @ApiProperty({ enum: ['API', 'DATABASE', 'DOCUMENT', 'WEB'] })
    @IsEnum(['API', 'DATABASE', 'DOCUMENT', 'WEB'])
    type: string;

    @ApiProperty({ description: 'Configuration object specific to source type' })
    @IsObject()
    config: Record<string, unknown>;

    @ApiPropertyOptional({ description: 'Cron schedule for automatic sync' })
    @IsOptional()
    @IsString()
    syncSchedule?: string;
}

export class UpdateSourceDto {
    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    name?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    description?: string;

    @ApiPropertyOptional({ enum: ['API', 'DATABASE', 'DOCUMENT', 'WEB'] })
    @IsOptional()
    @IsEnum(['API', 'DATABASE', 'DOCUMENT', 'WEB'])
    type?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsObject()
    config?: Record<string, unknown>;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    syncSchedule?: string;
}

export class SourceQueryDto {
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

    @ApiPropertyOptional({ enum: SourceType })
    @IsOptional()
    @IsEnum(SourceType)
    type?: SourceType;

    @ApiPropertyOptional({ enum: SyncStatus })
    @IsOptional()
    @IsEnum(SyncStatus)
    status?: SyncStatus;
}
