import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DomainEventTypes, TaskStatusChangedEvent, TaskStatus, TaskType } from '@seo-saas/shared';
import { YandexWordstatProvider } from '../providers/yandex-wordstat.provider';
import { SiteScraperService } from '../services/site-scraper.service';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { ContentStatus } from '@prisma/client';

@Processor('semantic-queue', {
  limiter: {
    max: 5,
    duration: 1000,
  },
})
export class SemanticProcessor extends WorkerHost {
  private readonly logger = new Logger(SemanticProcessor.name);

  constructor(
    private readonly eventEmitter: EventEmitter2,
    private readonly wordstatProvider: YandexWordstatProvider,
    private readonly siteScraper: SiteScraperService,
    private readonly prisma: PrismaService,
  ) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    const { taskId, projectId, seedKeywords, regionId } = job.data;
    this.logger.log(`[SemanticWorker] Processing job ${job.id} for task ${taskId} (Region: ${regionId || 225})...`);

    try {
      const primarySeed = (Array.isArray(seedKeywords) && seedKeywords.length > 0)
        ? seedKeywords[0]
        : 'seo automation';

      let extractedPhrases: string[] = [];

      // Step 1: Detect if primarySeed is a website URL vs direct text keyword
      const isUrl = primarySeed.startsWith('http://') || primarySeed.startsWith('https://') || primarySeed.includes('.com') || primarySeed.includes('.ru');

      if (isUrl) {
        this.emitTaskStatus(taskId, projectId, TaskStatus.PROCESSING, 25, `🌐 Crawling website pages at "${primarySeed}" and extracting service keywords...`);
        const scraped = await this.siteScraper.scrapeSiteKeywords(primarySeed, projectId);
        extractedPhrases = scraped.extractedKeywords;
      } else {
        this.emitTaskStatus(taskId, projectId, TaskStatus.PROCESSING, 25, `Fetching Yandex Wordstat LSI phrases for "${primarySeed}" (Region ID: ${regionId || 225})...`);
        extractedPhrases = await this.wordstatProvider.getSimilarKeywords(primarySeed, projectId, regionId);
      }

      // Step 2: Query Yandex Wordstat for monthly search volumes
      this.emitTaskStatus(taskId, projectId, TaskStatus.PROCESSING, 60, `Evaluating Yandex Wordstat search volume (GetDynamics) for ${extractedPhrases.length} phrases...`);
      const volumeMap = await this.wordstatProvider.getSearchVolume(extractedPhrases, projectId, regionId);

      // Step 3: Create or update Cluster in DB with DRAFT status
      this.emitTaskStatus(taskId, projectId, TaskStatus.PROCESSING, 85, `Filtering zero-volume keys and persisting cluster to database...`);
      
      const clusterName = isUrl ? `Site Semantics: ${primarySeed}` : `Cluster: ${primarySeed}`;
      let cluster = await this.prisma.cluster.findFirst({
        where: { projectId, name: clusterName },
      });

      if (!cluster) {
        cluster = await this.prisma.cluster.create({
          data: {
            projectId,
            name: clusterName,
            status: ContentStatus.DRAFT,
          },
        });
      }

      // Filter out keywords with 0 search volume (shows <= 0)
      let savedCount = 0;
      for (const phrase of extractedPhrases) {
        const searchVol = volumeMap[phrase] || 0;
        
        // Auto-filter 0 volume keywords
        if (searchVol <= 0) {
          this.logger.log(`[SemanticWorker] Dropping zero-volume keyword: "${phrase}"`);
          continue;
        }

        await this.prisma.keyword.create({
          data: {
            projectId,
            term: phrase,
            searchVol,
            difficulty: Math.min(100, Math.floor(searchVol / 150)),
            clusterId: cluster.id,
          },
        });
        savedCount++;
      }

      // Step 4: Completion Event
      this.emitTaskStatus(
        taskId,
        projectId,
        TaskStatus.COMPLETED,
        100,
        `Site semantics gathered! Extracted & verified ${savedCount} high-intent keywords for "${clusterName}".`
      );

      return {
        clusterId: cluster.id,
        clusterName: cluster.name,
        keywordsSaved: savedCount,
        phrases: extractedPhrases,
      };
    } catch (error: any) {
      this.logger.error(`[SemanticWorker Error] Task ${taskId} failed: ${error.message}`);
      this.emitTaskStatus(
        taskId,
        projectId,
        TaskStatus.FAILED,
        0,
        `Semantic Collection Failed: ${error.message}`
      );
      throw error;
    }
  }

  private emitTaskStatus(taskId: string, projectId: string, status: TaskStatus, progress: number, message: string) {
    const event: TaskStatusChangedEvent = {
      eventId: `evt_${Date.now()}`,
      eventType: DomainEventTypes.TASK_STATUS_CHANGED,
      aggregateId: taskId,
      timestamp: new Date().toISOString(),
      payload: {
        taskId,
        projectId,
        taskType: TaskType.COLLECT_SEMANTICS,
        status,
        progress,
        message,
      },
    };
    this.eventEmitter.emit(DomainEventTypes.TASK_STATUS_CHANGED, event);
  }
}
