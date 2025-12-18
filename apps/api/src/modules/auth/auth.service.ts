import {
    Injectable,
    UnauthorizedException,
    ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../common/prisma/prisma.service';
import { RegisterDto, LoginDto, AuthResponseDto } from './dto/auth.dto';

@Injectable()
export class AuthService {
    constructor(
        private prisma: PrismaService,
        private jwtService: JwtService,
    ) { }

    async register(dto: RegisterDto): Promise<AuthResponseDto> {
        // Check if user already exists
        const existingUser = await this.prisma.user.findUnique({
            where: { email: dto.email },
        });

        if (existingUser) {
            throw new ConflictException('User with this email already exists');
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(dto.password, 10);

        // Check if this is the first user (make them admin)
        const userCount = await this.prisma.user.count();
        const role = userCount === 0 ? 'ADMIN' : (dto.role || 'CLIENT');

        // Get or create organisation
        let organisationId = dto.organisationId;
        if (!organisationId) {
            // Default to Jenny org for now
            const defaultOrg = await this.prisma.organisation.findFirst({
                where: { slug: 'jenny' },
            });
            organisationId = defaultOrg?.id || '00000000-0000-0000-0000-000000000001';
        }

        // Create user
        const user = await this.prisma.user.create({
            data: {
                email: dto.email,
                password: hashedPassword,
                name: dto.name,
                role,
                organisationId,
            },
            include: { organisation: true },
        });

        // Generate tokens
        const tokens = await this.generateTokens(user.id, user.email, user.role, user.organisationId);

        return {
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
                organisationId: user.organisationId,
                organisationName: user.organisation.name,
            },
            ...tokens,
        };
    }

    async login(dto: LoginDto): Promise<AuthResponseDto> {
        const user = await this.prisma.user.findUnique({
            where: { email: dto.email },
            include: { organisation: true },
        });

        if (!user) {
            throw new UnauthorizedException('Invalid credentials');
        }

        const isPasswordValid = await bcrypt.compare(dto.password, user.password);

        if (!isPasswordValid) {
            throw new UnauthorizedException('Invalid credentials');
        }

        const tokens = await this.generateTokens(user.id, user.email, user.role, user.organisationId);

        // Store refresh token
        await this.prisma.user.update({
            where: { id: user.id },
            data: { refreshToken: tokens.refreshToken },
        });

        return {
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
                organisationId: user.organisationId,
                organisationName: user.organisation.name,
            },
            ...tokens,
        };
    }

    async logout(userId: string): Promise<void> {
        await this.prisma.user.update({
            where: { id: userId },
            data: { refreshToken: null },
        });
    }

    async refreshTokens(
        userId: string,
        refreshToken: string,
    ): Promise<{ accessToken: string; refreshToken: string }> {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
        });

        if (!user || !user.refreshToken) {
            throw new UnauthorizedException('Access denied');
        }

        if (user.refreshToken !== refreshToken) {
            throw new UnauthorizedException('Access denied');
        }

        const tokens = await this.generateTokens(user.id, user.email, user.role, user.organisationId);

        await this.prisma.user.update({
            where: { id: user.id },
            data: { refreshToken: tokens.refreshToken },
        });

        return tokens;
    }

    async validateUser(userId: string) {
        return this.prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                organisationId: true,
            },
        });
    }

    private async generateTokens(userId: string, email: string, role: string, organisationId: string) {
        const payload = { sub: userId, email, role, organisationId };

        const [accessToken, refreshToken] = await Promise.all([
            this.jwtService.signAsync(payload),
            this.jwtService.signAsync(payload, { expiresIn: '30d' }),
        ]);

        return { accessToken, refreshToken };
    }
}
