import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ContentStatus } from '@prisma/client';
import { CONTENT_STATUS_TRANSITIONS } from '@knowledge-platform/shared';

interface CreateContentDto {
    title: string;
    slug: string;
    body: string;
    status?: ContentStatus;
}

interface UpdateContentDto {
    title?: string;
    body?: string;
    status?: ContentStatus;
}

@Injectable()
export class CmsService {
    constructor(private prisma: PrismaService) { }

    async findAll(query: { page?: number | string; limit?: number | string; status?: ContentStatus }) {
        const page = Number(query.page) || 1;
        const limit = Number(query.limit) || 20;
        const skip = (page - 1) * limit;
        const status = query.status;

        const where = status ? { status } : {};

        const [contents, total] = await Promise.all([
            this.prisma.content.findMany({
                where,
                skip,
                take: limit,
                orderBy: { updatedAt: 'desc' },
                include: {
                    author: { select: { id: true, name: true, email: true } },
                },
            }),
            this.prisma.content.count({ where }),
        ]);

        return {
            items: contents,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }

    async findOne(id: string) {
        const content = await this.prisma.content.findUnique({
            where: { id },
            include: {
                author: { select: { id: true, name: true, email: true } },
                versions: {
                    orderBy: { version: 'desc' },
                    take: 10,
                },
            },
        });

        if (!content) {
            throw new NotFoundException(`Content with ID ${id} not found`);
        }

        return content;
    }

    async findBySlug(slug: string) {
        const content = await this.prisma.content.findUnique({
            where: { slug },
            include: {
                author: { select: { id: true, name: true } },
            },
        });

        if (!content) {
            throw new NotFoundException(`Content with slug ${slug} not found`);
        }

        return content;
    }

    async create(authorId: string, dto: CreateContentDto) {
        // Check for duplicate slug
        const existing = await this.prisma.content.findUnique({
            where: { slug: dto.slug },
        });

        if (existing) {
            throw new BadRequestException(`Content with slug ${dto.slug} already exists`);
        }

        return this.prisma.content.create({
            data: {
                title: dto.title,
                slug: dto.slug,
                body: dto.body,
                status: dto.status || ContentStatus.DRAFT,
                authorId,
            },
        });
    }

    async update(id: string, dto: UpdateContentDto) {
        const content = await this.findOne(id);

        // Validate status transition
        if (dto.status && dto.status !== content.status) {
            const allowedTransitions = CONTENT_STATUS_TRANSITIONS[content.status] as readonly string[];
            if (!allowedTransitions.includes(dto.status)) {
                throw new BadRequestException(
                    `Cannot transition from ${content.status} to ${dto.status}`
                );
            }
        }

        // Create version snapshot before update
        if (dto.title || dto.body) {
            await this.prisma.contentVersion.create({
                data: {
                    contentId: id,
                    title: content.title,
                    body: content.body,
                    version: content.version,
                },
            });
        }

        return this.prisma.content.update({
            where: { id },
            data: {
                ...dto,
                version: { increment: 1 },
                publishedAt: dto.status === ContentStatus.PUBLISHED ? new Date() : undefined,
            },
        });
    }

    async remove(id: string) {
        await this.findOne(id);

        return this.prisma.content.delete({
            where: { id },
        });
    }

    async publish(id: string) {
        return this.update(id, { status: ContentStatus.PUBLISHED });
    }

    async unpublish(id: string) {
        return this.update(id, { status: ContentStatus.DRAFT });
    }
}
