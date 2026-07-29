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
    this.logger.log(`[SemanticWorker] Executing 5-iteration Deep Semantic Pipeline for task ${taskId} (Region: ${regionId || 225})...`);

    try {
      const primarySeed = (Array.isArray(seedKeywords) && seedKeywords.length > 0)
        ? seedKeywords[0]
        : 'seo automation';

      const isUrl = primarySeed.startsWith('http://') || primarySeed.startsWith('https://') || primarySeed.includes('.com') || primarySeed.includes('.ru');

      // =========================================================================
      // ИТЕРАЦИЯ 1: Извлечение базовых фраз (10-15 штук) с сайта / темы
      // =========================================================================
      let baseSeeds: string[] = [];
      if (isUrl) {
        this.emitTaskStatus(taskId, projectId, TaskStatus.PROCESSING, 20, `🌐 Итерация 1/5: Сканирование страниц сайта "${primarySeed}", заголовков H1-H3 и услуг...`);
        const scraped = await this.siteScraper.scrapeSiteKeywords(primarySeed, projectId);
        baseSeeds = scraped.extractedKeywords;
      } else {
        this.emitTaskStatus(taskId, projectId, TaskStatus.PROCESSING, 20, `🔍 Итерация 1/5: Формирование базового поискового интента для темы "${primarySeed}"...`);
        baseSeeds = seedKeywords;
      }

      // =========================================================================
      // ИТЕРАЦИЯ 2: Пробивка базовых фраз через Yandex Wordstat GetTop (LSI)
      // =========================================================================
      this.emitTaskStatus(taskId, projectId, TaskStatus.PROCESSING, 40, `📊 Итерация 2/5: Запрос Yandex Wordstat API (GetTop) по ${baseSeeds.length} базовым фразам...`);
      const wordstatLsiPool: string[] = [];

      for (const seed of baseSeeds.slice(0, 5)) {
        const lsi = await this.wordstatProvider.getSimilarKeywords(seed, projectId, regionId);
        wordstatLsiPool.push(...lsi);
      }

      // =========================================================================
      // ИТЕРАЦИЯ 3: Глубокая генерация смежных и ассоциированных фраз AI (LSI Expansion)
      // =========================================================================
      this.emitTaskStatus(taskId, projectId, TaskStatus.PROCESSING, 60, `🤖 Итерация 3/5: Глубокая AI-генерация смежных LSI фраз и коммерческих интентов...`);
      const combinedInitialSeeds = Array.from(new Set([...baseSeeds, ...wordstatLsiPool]));
      const deepExpandedCandidates = await this.siteScraper.expandKeywordsDeepAI(combinedInitialSeeds, projectId);

      // =========================================================================
      // ИТЕРАЦИЯ 4: Массовая проверка частотности 150-250+ фраз в Wordstat GetDynamics
      // =========================================================================
      this.emitTaskStatus(taskId, projectId, TaskStatus.PROCESSING, 80, `📈 Итерация 4/5: Проверка ежемесячной частотности в Яндексе для ${deepExpandedCandidates.length} фраз...`);
      const volumeMap = await this.wordstatProvider.getSearchVolume(deepExpandedCandidates, projectId, regionId);

      // =========================================================================
      // ИТЕРАЦИЯ 5: Жесткая фильтрация (отсечение 0 показов), Кластеризация и Сохранение в БД
      // =========================================================================
      this.emitTaskStatus(taskId, projectId, TaskStatus.PROCESSING, 95, `🧹 Итерация 5/5: Авто-удаление нулевых фраз, кластеризация и сохранение семантического ядра...`);
      
      const clusterName = isUrl ? `Глубокая семантика: ${primarySeed}` : `Кластер: ${primarySeed}`;
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

      let savedCount = 0;
      for (const phrase of deepExpandedCandidates) {
        const searchVol = volumeMap[phrase] || 0;
        
        // Strictly filter out 0 volume keywords
        if (searchVol <= 0) {
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

      // Step 6: Final Completion Event
      this.emitTaskStatus(
        taskId,
        projectId,
        TaskStatus.COMPLETED,
        100,
        `🎉 Сбор завершен (5 итераций)! Сформировано объёмное ядро из ${savedCount} релевантных фраз с точной частотностью Wordstat.`
      );

      return {
        clusterId: cluster.id,
        clusterName: cluster.name,
        keywordsSaved: savedCount,
        candidatesEvaluated: deepExpandedCandidates.length,
      };
    } catch (error: any) {
      this.logger.error(`[SemanticWorker Error] Task ${taskId} failed: ${error.message}`);
      this.emitTaskStatus(
        taskId,
        projectId,
        TaskStatus.FAILED,
        0,
        `Deep Semantic Collection Failed: ${error.message}`
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
