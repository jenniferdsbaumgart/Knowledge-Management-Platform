import {
    Injectable,
    NotFoundException,
    ConflictException,
    ForbiddenException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateUserDto, UpdateUserDto } from './dto/users.dto';
import { UserRole } from '@prisma/client';

@Injectable()
export class UsersService {
    constructor(private prisma: PrismaService) { }

    async findAll(organisationId: string) {
        return this.prisma.user.findMany({
            where: { organisationId },
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                organisationId: true,
                createdAt: true,
            },
            orderBy: { createdAt: 'desc' },
        });
    }

    async findOne(id: string, organisationId: string) {
        const user = await this.prisma.user.findFirst({
            where: { id, organisationId },
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                organisationId: true,
                createdAt: true,
            },
        });

        if (!user) {
            throw new NotFoundException('User not found');
        }

        return user;
    }

    async create(
        dto: CreateUserDto,
        requestingUser: { id: string; role: UserRole; organisationId: string },
        targetOrganisationId: string,
    ) {
        // Check if email already exists
        const existing = await this.prisma.user.findUnique({
            where: { email: dto.email },
        });

        if (existing) {
            throw new ConflictException('Email already in use');
        }

        // Prevent creating SUPER_ADMIN via API
        if (dto.role === UserRole.SUPER_ADMIN) {
            throw new ForbiddenException('Cannot create SUPER_ADMIN users via API');
        }

        // ADMIN can only create users in their own organisation
        if (requestingUser.role === UserRole.ADMIN) {
            if (dto.organisationId && dto.organisationId !== requestingUser.organisationId) {
                throw new ForbiddenException('Cannot create users in other organisations');
            }
        }

        const hashedPassword = await bcrypt.hash(dto.password, 10);

        // Use specified org for SUPER_ADMIN, or requesting user's org for ADMIN
        const organisationId = dto.organisationId || targetOrganisationId;

        const user = await this.prisma.user.create({
            data: {
                email: dto.email,
                password: hashedPassword,
                name: dto.name,
                role: dto.role,
                organisationId,
            },
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                organisationId: true,
                createdAt: true,
            },
        });

        return user;
    }

    async update(
        id: string,
        dto: UpdateUserDto,
        requestingUser: { id: string; role: UserRole },
        organisationId: string,
    ) {
        // Find the user first
        const user = await this.prisma.user.findFirst({
            where: { id, organisationId },
        });

        if (!user) {
            throw new NotFoundException('User not found');
        }

        // Prevent self role change to SUPER_ADMIN
        if (dto.role === UserRole.SUPER_ADMIN) {
            throw new ForbiddenException('Cannot promote to SUPER_ADMIN');
        }

        // ADMIN cannot modify SUPER_ADMIN users
        if (user.role === UserRole.SUPER_ADMIN && requestingUser.role !== UserRole.SUPER_ADMIN) {
            throw new ForbiddenException('Cannot modify SUPER_ADMIN users');
        }

        const updateData: any = {};
        if (dto.name) updateData.name = dto.name;
        if (dto.role) updateData.role = dto.role;
        if (dto.password) {
            updateData.password = await bcrypt.hash(dto.password, 10);
        }

        return this.prisma.user.update({
            where: { id },
            data: updateData,
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                organisationId: true,
                createdAt: true,
            },
        });
    }

    async remove(
        id: string,
        requestingUser: { id: string; role: UserRole },
        organisationId: string,
    ) {
        const user = await this.prisma.user.findFirst({
            where: { id, organisationId },
        });

        if (!user) {
            throw new NotFoundException('User not found');
        }

        // Cannot delete yourself
        if (user.id === requestingUser.id) {
            throw new ForbiddenException('Cannot delete yourself');
        }

        // Cannot delete SUPER_ADMIN
        if (user.role === UserRole.SUPER_ADMIN) {
            throw new ForbiddenException('Cannot delete SUPER_ADMIN users');
        }

        await this.prisma.user.delete({ where: { id } });

        return { success: true };
    }
}
