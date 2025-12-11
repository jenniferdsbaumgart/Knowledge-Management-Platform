import { Controller, Post, Get, Param, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SyncService } from './sync.service';
import { Roles } from '../../common/decorators';
import { RolesGuard } from '../../common/guards';
import { UserRole } from '@prisma/client';

@ApiTags('Sync')
@Controller('sync')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@ApiBearerAuth()
export class SyncController {
    constructor(private syncService: SyncService) { }

    @Post(':sourceId')
    @Roles(UserRole.ADMIN, UserRole.EDITOR)
    @ApiOperation({ summary: 'Trigger sync for a source' })
    async triggerSync(@Param('sourceId') sourceId: string) {
        return this.syncService.triggerSync(sourceId);
    }

    @Get(':sourceId/status')
    @ApiOperation({ summary: 'Get sync status for a source' })
    async getSyncStatus(@Param('sourceId') sourceId: string) {
        return this.syncService.getSyncStatus(sourceId);
    }

    @Get('logs')
    @ApiOperation({ summary: 'Get sync logs' })
    async getSyncLogs(
        @Query('page') page?: number,
        @Query('limit') limit?: number,
        @Query('sourceId') sourceId?: string,
    ) {
        return this.syncService.getSyncLogs({ page, limit, sourceId });
    }

    @Post(':sourceId/cancel')
    @Roles(UserRole.ADMIN)
    @ApiOperation({ summary: 'Cancel running sync' })
    async cancelSync(@Param('sourceId') sourceId: string) {
        return this.syncService.cancelSync(sourceId);
    }
}
