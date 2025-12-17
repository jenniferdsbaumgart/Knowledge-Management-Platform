import { Controller, Get, Query, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { Roles } from '../../common/decorators';
import { RolesGuard, OrganisationGuard } from '../../common/guards';
import { UserRole, AnalyticsEventType } from '@prisma/client';

@ApiTags('Analytics')
@Controller('analytics')
@UseGuards(AuthGuard('jwt'), RolesGuard, OrganisationGuard)
@ApiBearerAuth()
export class AnalyticsController {
    constructor(private analyticsService: AnalyticsService) { }

    @Get('dashboard')
    @Roles(UserRole.ADMIN, UserRole.EDITOR)
    @ApiOperation({ summary: 'Get dashboard statistics' })
    async getDashboardStats(@Query('days') days?: number, @Request() req?: any) {
        return this.analyticsService.getDashboardStats(days || 30, req.organisationId);
    }

    @Get('events')
    @Roles(UserRole.ADMIN)
    @ApiOperation({ summary: 'Get analytics events' })
    async getEvents(
        @Query('page') page?: number,
        @Query('limit') limit?: number,
        @Query('type') type?: AnalyticsEventType,
        @Request() req?: any,
    ) {
        return this.analyticsService.getEvents({ page, limit, type }, req.organisationId);
    }
}
