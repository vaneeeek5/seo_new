import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DomainEventTypes, TaskStatusChangedEvent, TaskStatus, TaskType } from '@seo-saas/shared';
import { YandexWordstatProvider } from '../providers/yandex-wordstat.provider';
import { SiteScraperService } from '../services/site-scraper.service';
import { SearchSuggestProvider } from '../providers/search-suggest.provider';
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
    private readonly siteScraper: SiteScraperService,
    private readonly suggestProvider: SearchSuggestProvider,
    private readonly intentFilterService: IntentNegativeFilterService,
    private readonly prisma: PrismaService,
  ) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    const { taskId, projectId, seedKeywords, regionId } = job.data;
    this.logger.log(`[SemanticWorker] Executing 7-step Enterprise Super-Pipeline for task ${taskId} (Region: ${regionId || 225})...`);

    try {
      const primarySeed = (Array.isArray(seedKeywords) && seedKeywords.length > 0)
        ? seedKeywords[0]
        : 'seo automation';

      const isUrl = primarySeed.startsWith('http://') || primarySeed.startsWith('https://') || primarySeed.includes('.com') || primarySeed.includes('.ru');

      // =========================================================================
      // ШАГ 1 (15%): Сканирование сайта / Определение базовых интентов
      // =========================================================================
      let baseSeeds: string[] = [];
      if (isUrl) {
        this.emitTaskStatus(taskId, projectId, TaskStatus.PROCESSING, 15, `🌐 Шаг 1/7 [Agent-Core]: Сканирование страниц сайта "${primarySeed}", H1-H3 и структуры услуг...`);
        const scraped = await this.siteScraper.scrapeSiteKeywords(primarySeed, projectId);
        baseSeeds = scraped.extractedKeywords;
      } else {
        this.emitTaskStatus(taskId, projectId, TaskStatus.PROCESSING, 15, `🔍 Шаг 1/7 [Agent-Core]: Формирование первичного семантического инвентаря для "${primarySeed}"...`);
        baseSeeds = seedKeywords;
      }

      // =========================================================================
      // ШАГ 2 (30%): Двухколоночный парсинг Яндекс Wordstat (Левая + Правая колонка)
      // =========================================================================
      this.emitTaskStatus(taskId, projectId, TaskStatus.PROCESSING, 30, `📊 Шаг 2/7 [Wordstat]: Сбор Левой колонки ("Запросы со словами") и Правой колонки ("Похожие запросы")...`);
      const wordstatPool: Array<{ phrase: string; source: string }> = [];

      for (const seed of baseSeeds.slice(0, 5)) {
        const dualResult = await this.wordstatProvider.getSimilarKeywordsWithColumns(seed, projectId, regionId);
        dualResult.leftColumnSubQueries.forEach(p => wordstatPool.push({ phrase: p, source: 'WORDSTAT' }));
        dualResult.rightColumnSimilarQueries.forEach(p => wordstatPool.push({ phrase: p, source: 'WORDSTAT' }));
      }

      // =========================================================================
      // ШАГ 3 (45%): Модуль поисковых подсказок (Suggest Provider Yandex & Google)
      // =========================================================================
      this.emitTaskStatus(taskId, projectId, TaskStatus.PROCESSING, 45, `💡 Шаг 3/7 [Agent-Core]: Сбор поисковых подсказок Yandex & Google (буквенный перебор A-Z, А-Я)...`);
      const minedSuggests = await this.suggestProvider.collectLongTailSuggests(baseSeeds);
      const suggestPool = minedSuggests.map(p => ({ phrase: p, source: 'SUGGEST' }));

      // =========================================================================
      // ШАГ 4 (60%): AI LSI & Niche Expansion
      // =========================================================================
      this.emitTaskStatus(taskId, projectId, TaskStatus.PROCESSING, 60, `🤖 Шаг 4/7 [Agent-AI]: Глубокое AI-расширение смежных LSI фраз и коммерческих вариантов...`);
      const rawCandidates = Array.from(new Set([
        ...baseSeeds,
        ...wordstatPool.map(w => w.phrase),
        ...suggestPool.map(s => s.phrase),
      ]));

      const expandedPhrases = await this.siteScraper.expandKeywordsDeepAI(rawCandidates, projectId);
      const aiPool = expandedPhrases.map(p => ({ phrase: p, source: 'AI' }));

      // Map phrases to their source
      const phraseSourceMap = new Map<string, string>();
      baseSeeds.forEach(p => phraseSourceMap.set(p, 'COMPETITOR'));
      wordstatPool.forEach(w => phraseSourceMap.set(w.phrase, 'WORDSTAT'));
      suggestPool.forEach(s => phraseSourceMap.set(s.phrase, 'SUGGEST'));
      aiPool.forEach(a => {
        if (!phraseSourceMap.has(a.phrase)) {
          phraseSourceMap.set(a.phrase, 'AI');
        }
      });

      const uniquePhrases = Array.from(phraseSourceMap.keys());

      // =========================================================================
      // ШАГ 5 (75%): Фильтр Минус-слов и Классификатор Интентов (Intent & Negative Filter)
      // =========================================================================
      this.emitTaskStatus(taskId, projectId, TaskStatus.PROCESSING, 75, `🧹 Шаг 5/7 [Agent-AI]: Очистка от минус-слов (мусора) и классификация интента (Commercial/Info/Nav)...`);
      const cleanPhrases = this.intentFilterService.filterNegativeWords(uniquePhrases);
      const classifiedCandidates = this.intentFilterService.batchClassify(cleanPhrases);

      // =========================================================================
      // ШАГ 6 (90%): Проверка частотности всех кандидатов по Wordstat GetDynamics
      // =========================================================================
      this.emitTaskStatus(taskId, projectId, TaskStatus.PROCESSING, 90, `📈 Шаг 6/7 [Wordstat]: Проверка точной ежемесячной частотности в Яндексе для ${classifiedCandidates.length} фраз...`);
      const volumeMap = await this.wordstatProvider.getSearchVolume(classifiedCandidates.map(c => c.phrase), projectId, regionId);

      // =========================================================================
      // ШАГ 7 (100%): Отсечение 0-показов, Кластеризация и Сохранение в БД с разметкой
      // =========================================================================
      this.emitTaskStatus(taskId, projectId, TaskStatus.PROCESSING, 98, `💾 Шаг 7/7 [Agent-Core]: Сохранение семантического ядра с разметкой Интентов и Источников...`);

      const clusterName = isUrl ? `Семантическое ядро: ${primarySeed}` : `Кластер: ${primarySeed}`;
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
      for (const item of classifiedCandidates) {
        const searchVol = volumeMap[item.phrase] || 0;

        // Auto-drop 0 volume keywords
        if (searchVol <= 0) continue;

        const source = phraseSourceMap.get(item.phrase) || 'WORDSTAT';

        await this.prisma.keyword.create({
          data: {
            projectId,
            term: item.phrase,
            searchVol,
            difficulty: Math.min(100, Math.floor(searchVol / 150)),
            intent: item.intent,
            source,
            clusterId: cluster.id,
          },
        });
        savedCount++;
      }

      // Final Completion Event
      this.emitTaskStatus(
        taskId,
        projectId,
        TaskStatus.COMPLETED,
        100,
        `🎉 7-Step Super-Pipeline Завершен! Собрано ${savedCount} целевых ключей с разметкой Интента (Коммерческий/Инфо/Нав) и Источника.`
      );

      return {
        clusterId: cluster.id,
        clusterName: cluster.name,
        keywordsSaved: savedCount,
        candidatesEvaluated: classifiedCandidates.length,
      };
    } catch (error: any) {
      this.logger.error(`[SemanticWorker Error] Task ${taskId} failed: ${error.message}`);
      this.emitTaskStatus(
        taskId,
        projectId,
        TaskStatus.FAILED,
        0,
        `Super-Pipeline Semantic Collection Failed: ${error.message}`
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
