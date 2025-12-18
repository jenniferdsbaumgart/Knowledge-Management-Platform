import { IsString, IsUrl, IsBoolean, IsOptional, IsIn, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateSofiaWebhookDto {
    @ApiProperty({ description: 'Sofia webhook URL (N8N)', example: 'https://n8n.example.com/webhook/sofia-faq' })
    @IsUrl({}, { message: 'Invalid Sofia URL' })
    sofiaWebhookUrl: string;

    @ApiProperty({ description: 'Enable or disable the webhook' })
    @IsBoolean()
    sofiaWebhookEnabled: boolean;

    @ApiPropertyOptional({ description: 'HTTP method', enum: ['POST', 'PUT'], default: 'POST' })
    @IsIn(['POST', 'PUT'])
    @IsOptional()
    sofiaWebhookMethod?: string;

    @ApiPropertyOptional({ description: 'Secret/Token for authentication' })
    @IsString()
    @IsOptional()
    sofiaWebhookSecret?: string;

    @ApiPropertyOptional({ description: 'Custom headers', example: { 'X-API-Key': 'abc123' } })
    @IsObject()
    @IsOptional()
    sofiaWebhookHeaders?: Record<string, string>;
}
