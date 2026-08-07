import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { IntegrationController } from './integration.controller';
import { SaveConnectionHandler } from './commands/handlers/save-connection.handler';
import { DeleteIntegrationHandler } from './commands/handlers/delete-integration.handler';
import { GetIntegrationsHandler } from './queries/handlers/get-integrations.handler';
import { IntegrationService } from './integration.service';
import { PrismaService } from '../../infrastructure/database/prisma.service';

@Module({
  imports: [CqrsModule],
  controllers: [IntegrationController],
  providers: [
    SaveConnectionHandler,
    DeleteIntegrationHandler,
    GetIntegrationsHandler,
    IntegrationService,
    PrismaService,
  ],
  exports: [IntegrationService],
})
export class IntegrationModule {}
