import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { IntegrationController } from './integration.controller';
import { SaveConnectionHandler } from './commands/handlers/save-connection.handler';
import { DeleteIntegrationHandler } from './commands/handlers/delete-integration.handler';
import { GetIntegrationsHandler } from './queries/handlers/get-integrations.handler';
import { IntegrationService } from './integration.service';
import { WebhookConfigParserService } from './services/webhook-config-parser.service';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { EncryptionService } from '../../infrastructure/security/encryption.service';

@Module({
  imports: [CqrsModule],
  controllers: [IntegrationController],
  providers: [
    SaveConnectionHandler,
    DeleteIntegrationHandler,
    GetIntegrationsHandler,
    IntegrationService,
    WebhookConfigParserService,
    PrismaService,
    EncryptionService,
  ],
  exports: [IntegrationService, WebhookConfigParserService],
})
export class IntegrationModule {}
