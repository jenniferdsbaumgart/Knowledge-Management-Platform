import { Module } from '@nestjs/common';
import { OrganisationsController } from './organisations.controller';
import { SofiaWebhookModule } from '../sofia-webhook/sofia-webhook.module';

@Module({
    imports: [SofiaWebhookModule],
    controllers: [OrganisationsController],
})
export class OrganisationsModule { }
