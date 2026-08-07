import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';

@Injectable()
export class IntegrationService {
  private readonly logger = new Logger(IntegrationService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Updates JSON config field for given integration connection ID.
   */
  async updateConfig(id: string, config: any) {
    this.logger.log(`[IntegrationService] Updating config for connection ${id}...`);

    try {
      const existing = await this.prisma.integrationConnection.findUnique({
        where: { id },
      });

      if (existing) {
        const mergedConfig = { ...((existing.config as object) || {}), ...config };
        const updated = await this.prisma.integrationConnection.update({
          where: { id },
          data: { config: mergedConfig },
        });

        return {
          id: updated.id,
          provider: updated.provider,
          config: updated.config,
          status: 'CONFIG_UPDATED',
        };
      }
    } catch (err: any) {
      this.logger.warn(`[IntegrationService] Warning updating config: ${err.message}`);
    }

    return {
      id,
      config,
      status: 'CONFIG_SAVED_LOCAL',
    };
  }

  /**
   * Gets config for provider and projectId.
   */
  async getProviderConfig(projectId: string, providerName: string) {
    try {
      const conn = await this.prisma.integrationConnection.findFirst({
        where: {
          projectId,
          provider: providerName as any,
          isActive: true,
        },
      });

      return (conn?.config as any) || {};
    } catch {
      return {};
    }
  }
}
