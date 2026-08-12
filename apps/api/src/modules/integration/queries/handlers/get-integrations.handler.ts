import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetIntegrationsQuery } from '../get-integrations.query';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';

@QueryHandler(GetIntegrationsQuery)
export class GetIntegrationsHandler implements IQueryHandler<GetIntegrationsQuery> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(query: GetIntegrationsQuery): Promise<any[]> {
    try {
      // 3-second strict timeout to prevent DB connection hangs
      const dbConnections = await Promise.race([
        this.prisma.integrationConnection.findMany({
          orderBy: { createdAt: 'desc' },
        }),
        new Promise<any[]>((_, reject) =>
          setTimeout(() => reject(new Error('DB Timeout')), 3000)
        ),
      ]);

      return dbConnections.map((conn) => ({
        id: conn.id,
        provider: conn.provider,
        name: conn.name,
        maskedKey: conn.maskedKey,
        encryption: 'AES-256-GCM',
        status: conn.isActive ? 'CONNECTED' : 'DISABLED',
        isActive: conn.isActive,
        date: conn.createdAt ? new Date(conn.createdAt).toLocaleDateString('ru-RU') : new Date().toLocaleDateString('ru-RU'),
        config: conn.config,
      }));
    } catch (e) {
      return [];
    }
  }
}
