import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { BullModule } from '@nestjs/bullmq';

// Config
import { databaseConfig } from './config/database.config';
import { redisConfig } from './config/redis.config';
import { jwtConfig } from './config/jwt.config';
import { openaiConfig } from './config/openai.config';
import { minioConfig } from './config/minio.config';

// Modules
import { PrismaModule } from './common/prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { KnowledgeModule } from './modules/knowledge/knowledge.module';
import { SearchModule } from './modules/search/search.module';
import { SourcesModule } from './modules/sources/sources.module';
import { SyncModule } from './modules/sync/sync.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { CmsModule } from './modules/cms/cms.module';
import { WebhooksModule } from './modules/webhooks/webhooks.module';
import { SofiaWebhookModule } from './modules/sofia-webhook/sofia-webhook.module';
import { UploadModule } from './modules/upload/upload.module';
import { FaqModule } from './modules/faq/faq.module';
import { OrganisationsModule } from './modules/organisations/organisations.module';
import { UsersModule } from './modules/users/users.module';

@Module({
    imports: [
        // Configuration
        ConfigModule.forRoot({
            isGlobal: true,
            load: [databaseConfig, redisConfig, jwtConfig, openaiConfig, minioConfig],
        }),

        // Rate limiting
        ThrottlerModule.forRoot([{
            ttl: 60000,
            limit: 100,
        }]),

        // BullMQ for job queues
        BullModule.forRoot({
            connection: {
                host: process.env.REDIS_HOST || 'localhost',
                port: parseInt(process.env.REDIS_PORT || '6379'),
            },
        }),

        // Database
        PrismaModule,

        // Feature modules
        AuthModule,
        KnowledgeModule,
        SearchModule,
        SourcesModule,
        SyncModule,
        AnalyticsModule,
        CmsModule,
        WebhooksModule,
        SofiaWebhookModule,
        UploadModule,
        FaqModule,
        OrganisationsModule,
        UsersModule,
    ],
})
export class AppModule { }

