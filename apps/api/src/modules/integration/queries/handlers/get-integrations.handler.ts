import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetIntegrationsQuery } from '../get-integrations.query';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';

@QueryHandler(GetIntegrationsQuery)
export class GetIntegrationsHandler implements IQueryHandler<GetIntegrationsQuery> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(query: GetIntegrationsQuery): Promise<any[]> {
    const { projectId } = query;
    try {
      const dbConnections = await this.prisma.integrationConnection.findMany({
        where: projectId && projectId !== 'ALL' ? { projectId } : undefined,
        orderBy: { createdAt: 'desc' },
      });

      return dbConnections.map((conn) => ({
        id: conn.id,
        provider: conn.provider,
        name: conn.name,
        maskedKey: conn.maskedKey,
        encryption: 'AES-256-GCM',
        status: conn.isActive ? 'CONNECTED' : 'DISABLED',
        isActive: conn.isActive,
        date: conn.createdAt.toLocaleDateString('ru-RU'),
        config: conn.config,
      }));
    } catch (e) {
      return [];
    }
  }
}
