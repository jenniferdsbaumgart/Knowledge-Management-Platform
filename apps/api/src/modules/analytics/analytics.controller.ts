import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { Roles } from '../../common/decorators';
import { RolesGuard } from '../../common/guards';
import { UserRole, AnalyticsEventType } from '@prisma/client';

@ApiTags('Analytics')
@Controller('analytics')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@ApiBearerAuth()
export class AnalyticsController {
    constructor(private analyticsService: AnalyticsService) { }

    @Get('dashboard')
    @Roles(UserRole.ADMIN, UserRole.EDITOR)
    @ApiOperation({ summary: 'Get dashboard statistics' })
    async getDashboardStats(@Query('days') days?: number) {
        return this.analyticsService.getDashboardStats(days || 30);
    }

    @Get('events')
    @Roles(UserRole.ADMIN)
    @ApiOperation({ summary: 'Get analytics events' })
    async getEvents(
        @Query('page') page?: number,
        @Query('limit') limit?: number,
        @Query('type') type?: AnalyticsEventType,
    ) {
        return this.analyticsService.getEvents({ page, limit, type });
    }
}
