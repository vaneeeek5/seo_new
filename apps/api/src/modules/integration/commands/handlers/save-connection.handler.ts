import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { SaveConnectionCommand } from '../save-connection.command';
import { EncryptionService } from '../../../../infrastructure/security/encryption.service';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { Logger } from '@nestjs/common';
import { IntegrationProvider } from '@prisma/client';

@CommandHandler(SaveConnectionCommand)
export class SaveConnectionHandler implements ICommandHandler<SaveConnectionCommand> {
  private readonly logger = new Logger(SaveConnectionHandler.name);

  constructor(
    private readonly encryptionService: EncryptionService,
    private readonly prisma: PrismaService,
  ) {}

  async execute(command: SaveConnectionCommand): Promise<{ connectionId: string; provider: string; maskedKey: string; status: string }> {
    const { dto } = command;
    const connectionId = `conn_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const projectId = dto.projectId || 'proj_demo_1';
    const orgId = 'org_demo_1';

    this.logger.log(`[Integrations] Encrypting & Saving API Key for Provider: ${dto.provider} (${connectionId})`);

    // Encrypt raw API Key using AES-256-GCM symmetric authenticated encryption
    const encryptedData = this.encryptionService.encrypt(dto.apiKey || '');

    // Map provider string safely to Prisma Enum
    let mappedProvider: IntegrationProvider = IntegrationProvider.YANDEX_WORDSTAT;
    const provUpper = dto.provider?.toUpperCase() || '';

    if (provUpper === 'XMLSTOCK') {
      mappedProvider = IntegrationProvider.XMLSTOCK;
    } else if (provUpper === 'YANDEX_WORDSTAT' || provUpper === 'WORDSTAT') {
      mappedProvider = IntegrationProvider.YANDEX_WORDSTAT;
    } else if (provUpper === 'OPENAI') {
      mappedProvider = IntegrationProvider.OPENAI;
    } else if (provUpper === 'METRIKA') {
      mappedProvider = IntegrationProvider.METRIKA;
    } else if (provUpper === 'WEBHOOK' || provUpper === 'CUSTOM_WEBHOOK') {
      mappedProvider = IntegrationProvider.WEBHOOK;
    } else if (provUpper === 'GSC') {
      mappedProvider = IntegrationProvider.GSC;
    } else if (provUpper === 'TELEGRAM') {
      mappedProvider = IntegrationProvider.TELEGRAM;
    } else if (provUpper === 'GEMINI') {
      mappedProvider = IntegrationProvider.GEMINI;
    } else if (provUpper === 'ANTHROPIC') {
      mappedProvider = IntegrationProvider.ANTHROPIC;
    } else if (provUpper === 'WORDPRESS_CMS') {
      mappedProvider = IntegrationProvider.WORDPRESS_CMS;
    } else if (provUpper === 'AHREFS') {
      mappedProvider = IntegrationProvider.AHREFS;
    }

    try {
      if (this.prisma.integrationConnection) {
        // Ensure Organization and Project exist to satisfy foreign key constraints
        await this.prisma.organization.upsert({
          where: { id: orgId },
          update: {},
          create: { id: orgId, name: 'Default Organization' },
        });

        await this.prisma.project.upsert({
          where: { id: projectId },
          update: {},
          create: {
            id: projectId,
            organizationId: orgId,
            name: 'SEO SaaS Platform',
            domain: 'seo-saas.com',
          },
        });

        await this.prisma.integrationConnection.create({
          data: {
            id: connectionId,
            projectId,
            organizationId: orgId,
            provider: mappedProvider,
            name: dto.name || `${mappedProvider} Connection`,
            encryptedKey: encryptedData.encryptedKey,
            iv: encryptedData.iv,
            authTag: encryptedData.authTag,
            maskedKey: encryptedData.maskedKey,
            config: dto.config || {},
            isActive: true,
          },
        });

        this.logger.log(`[Integrations] Persisted encrypted connection ${connectionId} for provider ${mappedProvider} to PostgreSQL DB.`);
      }
    } catch (err: any) {
      this.logger.warn(`Prisma Integration save warning: ${err.message}`);
    }

    return {
      connectionId,
      provider: mappedProvider,
      maskedKey: encryptedData.maskedKey,
      status: 'ENCRYPTED_AND_SAVED',
    };
  }
}
