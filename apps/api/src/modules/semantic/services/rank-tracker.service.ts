import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { YandexSearchProvider } from '../providers/yandex-search.provider';

@Injectable()
export class RankTrackerService {
  private readonly logger = new Logger(RankTrackerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly yandexSearch: YandexSearchProvider,
  ) {}

  /**
   * Daily / Manual Rank Tracking Execution for Project Keywords.
   */
  async trackProjectPositions(projectId: string): Promise<any[]> {
    this.logger.log(`[RankTrackerService] Running rank tracking for project ${projectId}...`);

    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: { keywords: true },
    });

    if (!project) {
      this.logger.warn(`[RankTrackerService] Project ${projectId} not found.`);
      return [];
    }

    const projectDomain = project.domain.toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '');
    const keywordsToTrack = project.keywords.slice(0, 10);

    const trackedResults = [];

    for (const kw of keywordsToTrack) {
      const serp = await this.yandexSearch.getSerp(kw.term, project.targetRegion || '225');

      // Search for project domain inside TOP-50 results
      const match = serp.find(item => item.domain.toLowerCase().includes(projectDomain));

      const position = match ? match.position : 0;
      const matchedUrl = match ? match.url : null;

      const record = await this.prisma.rankHistory.create({
        data: {
          projectId,
          keywordId: kw.id,
          position,
          url: matchedUrl,
          date: new Date(),
        },
      });

      trackedResults.push({
        keywordId: kw.id,
        term: kw.term,
        position,
        url: matchedUrl,
        date: record.date,
      });

      this.logger.log(`[RankTracker] Keyword "${kw.term}" -> Position: ${position > 0 ? `#${position}` : 'Out of TOP-50'}`);
    }

    return trackedResults;
  }

  /**
   * Retrieves historical rank records for project keywords.
   */
  async getProjectRankHistory(projectId: string) {
    return this.prisma.rankHistory.findMany({
      where: { projectId },
      include: { keyword: true },
      orderBy: { date: 'desc' },
      take: 50,
    });
  }
}
