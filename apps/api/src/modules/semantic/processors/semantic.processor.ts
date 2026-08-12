import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DomainEventTypes, TaskStatusChangedEvent, TaskStatus, TaskType } from '@seo-saas/shared';
import { YandexWordstatProvider } from '../providers/yandex-wordstat.provider';
import { IntentNegativeFilterService } from '../services/intent-negative-filter.service';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { ContentStatus, KeywordIntent } from '@prisma/client';

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
    private readonly intentFilterService: IntentNegativeFilterService,
    private readonly prisma: PrismaService,
  ) {
    super();
  }

  /**
   * Helper: Validates search phrase length and cleans string.
   */
  private sanitizePhrase(phrase: string): string | null {
    if (!phrase) return null;
    const clean = phrase.toLowerCase().replace(/[.,!?;:"'()\[\]{}–—\-\\\/]+/g, ' ').replace(/\s+/g, ' ').trim();
    const words = clean.split(' ').filter(Boolean);
    if (words.length >= 1 && words.length <= 10) {
      return words.join(' ');
    }
    return null;
  }

  async process(job: Job<any, any, string>): Promise<any> {
    const { taskId, projectId, seedKeywords, regionId } = job.data;
    this.logger.log(`[SemanticWorker] Processing user-provided keywords for task ${taskId}...`);

    try {
      // 1. Extract user-provided keywords from input string / array
      let rawKeywords: string[] = [];
      if (Array.isArray(seedKeywords)) {
        rawKeywords = seedKeywords.flatMap(s => String(s).split(/\r?\n|,/));
      } else if (typeof seedKeywords === 'string') {
        rawKeywords = seedKeywords.split(/\r?\n|,/);
      }

      const cleanUserKeywords = Array.from(
        new Set(rawKeywords.map(k => this.sanitizePhrase(k)).filter((k): k is string => k !== null))
      );

      if (cleanUserKeywords.length === 0) {
        this.emitTaskStatus(
          taskId,
          projectId,
          TaskStatus.FAILED,
          0,
          'Список ключевых слов пуст. Введите хотя бы одно ключевое слово.'
        );
        return { keywordsSaved: 0 };
      }

      this.emitTaskStatus(
        taskId,
        projectId,
        TaskStatus.PROCESSING,
        25,
        `📊 Обработка ${cleanUserKeywords.length} пользовательских ключей... Запрос частотности к Yandex Wordstat / XmlStock API...`
      );

      // 2. Fetch REAL search volume directly from Wordstat / XmlStock API
      const volumeMap = await this.wordstatProvider.getSearchVolume(cleanUserKeywords, projectId, regionId || 225);

      this.emitTaskStatus(
        taskId,
        projectId,
        TaskStatus.PROCESSING,
        60,
        `🧹 Классификация интента и отсечение фраз с 0 показов...`
      );

      // 3. Filter keywords: DROP ANY KEYWORD WITH 0 SHOWS OR MISSING FROM WORDSTAT
      const verifiedKeywords = cleanUserKeywords.filter(kw => (volumeMap[kw] || 0) > 0);

      if (verifiedKeywords.length === 0) {
        this.emitTaskStatus(
          taskId,
          projectId,
          TaskStatus.COMPLETED,
          100,
          `⚠️ Из ${cleanUserKeywords.length} введенных ключей ни один не показал частотность в Вордстате (все имеют 0 показов).`
        );
        return { keywordsSaved: 0 };
      }

      // 4. Batch intent classification
      const classified = this.intentFilterService.batchClassify(verifiedKeywords);

      // 5. Create or find cluster for user keywords
      const clusterName = `Пользовательские ключи (${new Date().toLocaleDateString('ru-RU')})`;
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

      // 6. Save verified keywords into DB with volume from Wordstat API
      let savedCount = 0;
      for (const item of classified) {
        const realVol = volumeMap[item.phrase] || 0;
        if (realVol <= 0) continue;

        await this.prisma.keyword.create({
          data: {
            projectId,
            term: item.phrase,
            searchVol: realVol,
            difficulty: Math.min(100, Math.floor(realVol / 150)),
            intent: item.intent === 'INFORMATIONAL' ? KeywordIntent.INFORMATIONAL : KeywordIntent.COMMERCIAL,
            source: 'Yandex Wordstat API',
            clusterId: cluster.id,
          },
        });
        savedCount++;
      }

      // 7. Emit success event
      this.emitTaskStatus(
        taskId,
        projectId,
        TaskStatus.COMPLETED,
        100,
        `🎉 Завершено! Успешно проверена частотность и сохранено ${savedCount} пользовательских ключей от Вордстат API (Источник: Yandex Wordstat API).`
      );

      return {
        keywordsSaved: savedCount,
        keywordsEvaluated: cleanUserKeywords.length,
      };
    } catch (error: any) {
      this.logger.error(`[SemanticWorker Error] Task ${taskId} failed: ${error.message}`);
      this.emitTaskStatus(
        taskId,
        projectId,
        TaskStatus.FAILED,
        0,
        `Ошибка сбора частотности: ${error.message}`
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
