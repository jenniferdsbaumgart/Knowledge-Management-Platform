import { IsEmail, IsString, MinLength, IsEnum, IsOptional, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';

export class CreateUserDto {
    @ApiProperty({ example: 'user@example.com' })
    @IsEmail()
    email: string;

    @ApiProperty({ example: 'SecurePass123' })
    @IsString()
    @MinLength(8)
    password: string;

    @ApiProperty({ example: 'John Doe' })
    @IsString()
    name: string;

    @ApiProperty({ enum: ['ADMIN', 'CLIENT'], example: 'CLIENT' })
    @IsEnum(UserRole)
    role: UserRole;

    @ApiPropertyOptional({ description: 'Only SUPER_ADMIN can specify this' })
    @IsOptional()
    @IsUUID()
    organisationId?: string;
}

export class UpdateUserDto {
    @ApiPropertyOptional({ example: 'Jane Doe' })
    @IsOptional()
    @IsString()
    name?: string;

    @ApiPropertyOptional({ enum: ['ADMIN', 'CLIENT'] })
    @IsOptional()
    @IsEnum(UserRole)
    role?: UserRole;

    @ApiPropertyOptional({ example: 'NewPass123' })
    @IsOptional()
    @IsString()
    @MinLength(8)
    password?: string;
}

export class UserResponseDto {
    id: string;
    email: string;
    name: string;
    role: UserRole;
    organisationId: string;
    createdAt: Date;
}
