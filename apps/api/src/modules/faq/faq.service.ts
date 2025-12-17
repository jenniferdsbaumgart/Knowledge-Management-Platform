import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { FaqStatus } from '@prisma/client';
import {
    CreateFaqEntryDto,
    UpdateFaqEntryDto,
    CreateFaqCategoryDto,
    FaqQueryDto,
} from './dto/faq.dto';

@Injectable()
export class FaqService {
    constructor(private prisma: PrismaService) { }

    // ==================== FAQ ENTRIES ====================

    async findAll(query: FaqQueryDto, organisationId?: string) {
        const { page = 1, limit = 20, status, categoryId } = query;
        const skip = (page - 1) * limit;

        const where: any = {};
        if (organisationId) where.organisationId = organisationId;
        if (status) where.status = status;
        if (categoryId) where.categoryId = categoryId;

        const [entries, total] = await Promise.all([
            this.prisma.faqEntry.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: { category: true },
            }),
            this.prisma.faqEntry.count({ where }),
        ]);

        return {
            items: entries,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }

    async findOne(id: string) {
        const entry = await this.prisma.faqEntry.findUnique({
            where: { id },
            include: { category: true },
        });

        if (!entry) {
            throw new NotFoundException(`FAQ entry with ID ${id} not found`);
        }

        return entry;
    }

    async create(dto: CreateFaqEntryDto, organisationId: string) {
        return this.prisma.faqEntry.create({
            data: {
                question: dto.question,
                answer: dto.answer,
                categoryId: dto.categoryId,
                sourceIds: dto.sourceIds || [],
                status: dto.status || FaqStatus.DRAFT,
                organisationId,
            },
            include: { category: true },
        });
    }

    async update(id: string, dto: UpdateFaqEntryDto) {
        await this.findOne(id);

        return this.prisma.faqEntry.update({
            where: { id },
            data: dto,
            include: { category: true },
        });
    }

    async remove(id: string) {
        await this.findOne(id);
        return this.prisma.faqEntry.delete({ where: { id } });
    }

    async approve(id: string) {
        return this.update(id, { status: FaqStatus.APPROVED });
    }

    async archive(id: string) {
        return this.update(id, { status: FaqStatus.ARCHIVED });
    }

    async incrementViewCount(id: string) {
        return this.prisma.faqEntry.update({
            where: { id },
            data: { viewCount: { increment: 1 } },
        });
    }

    // ==================== CATEGORIES ====================

    async findAllCategories() {
        return this.prisma.faqCategory.findMany({
            orderBy: { order: 'asc' },
            include: {
                _count: { select: { entries: true } },
            },
        });
    }

    async createCategory(dto: CreateFaqCategoryDto) {
        const slug = dto.slug || this.slugify(dto.name);

        return this.prisma.faqCategory.create({
            data: {
                name: dto.name,
                slug,
                order: dto.order || 0,
            },
        });
    }

    async deleteCategory(id: string) {
        // Update entries to remove category reference first
        await this.prisma.faqEntry.updateMany({
            where: { categoryId: id },
            data: { categoryId: null },
        });

        return this.prisma.faqCategory.delete({ where: { id } });
    }

    // ==================== PUBLIC API ====================

    async getPublicFaqs() {
        const [entries, categories] = await Promise.all([
            this.prisma.faqEntry.findMany({
                where: { status: FaqStatus.APPROVED },
                orderBy: { viewCount: 'desc' },
                include: { category: true },
            }),
            this.prisma.faqCategory.findMany({
                orderBy: { order: 'asc' },
            }),
        ]);

        return {
            faqs: entries.map((e) => ({
                id: e.id,
                question: e.question,
                answer: e.answer,
                category: e.category?.name || null,
            })),
            categories: categories.map((c) => c.name),
            lastUpdated: entries.length > 0
                ? entries.reduce((max, e) => (e.updatedAt > max ? e.updatedAt : max), entries[0].updatedAt)
                : new Date(),
        };
    }

    // ==================== HELPERS ====================

    private slugify(text: string): string {
        return text
            .toLowerCase()
            .replace(/[^\w\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .trim();
    }
}
