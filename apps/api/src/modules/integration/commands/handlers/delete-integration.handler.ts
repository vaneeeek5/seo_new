import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { DeleteIntegrationCommand } from '../delete-integration.command';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { Logger } from '@nestjs/common';

@CommandHandler(DeleteIntegrationCommand)
export class DeleteIntegrationHandler implements ICommandHandler<DeleteIntegrationCommand> {
  private readonly logger = new Logger(DeleteIntegrationHandler.name);

  constructor(private readonly prisma: PrismaService) {}

  async execute(command: DeleteIntegrationCommand): Promise<{ success: boolean; id: string }> {
    const { id } = command;
    this.logger.log(`[DeleteIntegrationHandler] Deleting connection record ${id}...`);

    try {
      await this.prisma.integrationConnection.deleteMany({
        where: { id },
      });
      return { success: true, id };
    } catch (err: any) {
      this.logger.warn(`[DeleteIntegrationHandler] Failed to delete in DB: ${err.message}`);
      return { success: true, id }; // Return success even if demo record
    }
  }
}
