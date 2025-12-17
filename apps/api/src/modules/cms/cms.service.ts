import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ContentStatus } from '@prisma/client';
import { CONTENT_STATUS_TRANSITIONS } from '@knowledge-platform/shared';

interface UpdateContentDto {
    title?: string;
    body?: string;
    status?: ContentStatus;
}

@Injectable()
export class CmsService {
    constructor(private prisma: PrismaService) { }

    async findAll(query: { page?: number; limit?: number; status?: ContentStatus }, organisationId?: string) {
        const page = Number(query.page) || 1;
        const limit = Number(query.limit) || 10;
        const skip = (page - 1) * limit;

        const where: any = {};
        if (organisationId) where.organisationId = organisationId;
        if (query.status) where.status = query.status;

        const [items, total] = await Promise.all([
            this.prisma.content.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: { author: { select: { id: true, name: true } } },
            }),
            this.prisma.content.count({ where }),
        ]);

        return {
            items: items,
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

    async create(
        authorId: string,
        organisationId: string,
        dto: { title: string; slug: string; body: string; status?: ContentStatus },
    ) {
        return this.prisma.content.create({
            data: {
                title: dto.title,
                slug: dto.slug,
                body: dto.body,
                status: dto.status || ContentStatus.DRAFT,
                authorId,
                organisationId,
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
