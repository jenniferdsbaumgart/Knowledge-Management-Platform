import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule } from '@nestjs/config';
import { SyncController } from './sync.controller';
import { SyncService } from './sync.service';
import { SyncProcessor } from './sync.processor';
import { QUEUE_NAMES } from '@knowledge-platform/shared';

@Module({
    imports: [
        ConfigModule,
        BullModule.registerQueue(
            { name: QUEUE_NAMES.SYNC },
            { name: QUEUE_NAMES.EMBEDDING },
        ),
    ],
    controllers: [SyncController],
    providers: [SyncService, SyncProcessor],
    exports: [SyncService],
})
export class SyncModule { }
