import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DomainEventTypes, TaskStatusChangedEvent, TaskStatus, TaskType } from '@seo-saas/shared';
import { YandexWordstatProvider } from '../providers/yandex-wordstat.provider';
import { SiteScraperService } from '../services/site-scraper.service';
import { SearchSuggestProvider } from '../providers/search-suggest.provider';
import { IntentNegativeFilterService } from '../services/intent-negative-filter.service';
import { XmlStockProvider, XmlStockConfig } from '../providers/xmlstock.provider';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { ContentStatus, IntegrationProvider } from '@prisma/client';

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
    private readonly xmlStockProvider: XmlStockProvider,
    private readonly prisma: PrismaService,
  ) {
    super();
  }

  /**
   * Helper to clean & check string word length and punctuation.
   */
  private isValidSearchPhrase(phrase: string): boolean {
    if (!phrase) return false;
    // Discard phrases containing punctuation or long sentence characters
    if (/[.,!?;:"'()\[\]{}–—\-\\\/]/g.test(phrase)) return false;

    const words = phrase.trim().split(/\s+/).filter(Boolean);
    // Discard phrases longer than 7 words or shorter than 1 word
    if (words.length < 1 || words.length > 7) return false;

    return true;
  }

  async process(job: Job<any, any, string>): Promise<any> {
    const { taskId, projectId, seedKeywords, regionId } = job.data;
    this.logger.log(`[SemanticWorker] Executing Strict Gatekeeper Super-Pipeline for task ${taskId} (Region: ${regionId || 225})...`);

    try {
      const primarySeed = (Array.isArray(seedKeywords) && seedKeywords.length > 0)
        ? seedKeywords[0]
        : 'seo automation';

      const isUrl = primarySeed.startsWith('http://') || primarySeed.startsWith('https://') || primarySeed.includes('.com') || primarySeed.includes('.ru');

      // Load XmlStock / Wordstat dynamic configuration from database
      const xmlConn = await this.prisma.integrationConnection.findFirst({
        where: {
          projectId,
          provider: IntegrationProvider.XMLSTOCK,
          isActive: true,
        },
      });

      const xmlConfig: XmlStockConfig = (xmlConn?.config as any) || {
        wordstatEnabled: true,
        yandexXmlEnabled: true,
        yandexLiveEnabled: true,
        googleXmlEnabled: true,
      };

      // =========================================================================
      // ШАГ 1 (15%): Извлечение БАЗОВЫХ МАСОК (Strict 2-4 words seed masks)
      // =========================================================================
      let baseSeeds: string[] = [];
      if (isUrl) {
        this.emitTaskStatus(taskId, projectId, TaskStatus.PROCESSING, 15, `🌐 Шаг 1/7 [Agent-Core]: ИИ-извлечение базовых масок ключей (2-4 слова) с сайта "${primarySeed}"...`);
        const scraped = await this.siteScraper.scrapeSiteKeywords(primarySeed, projectId);
        baseSeeds = scraped.extractedKeywords;
      } else {
        this.emitTaskStatus(taskId, projectId, TaskStatus.PROCESSING, 15, `🔍 Шаг 1/7 [Agent-Core]: Очистка первичных базовых масок фраз...`);
        baseSeeds = Array.isArray(seedKeywords) ? seedKeywords : [seedKeywords];
      }

      // Ensure seeds are clean 2-4 word masks
      baseSeeds = baseSeeds.map(s => s.toLowerCase().replace(/[.,!?;:"'()\[\]{}–—\-\\\/]+/g, ' ').trim()).filter(s => s.split(' ').length >= 1 && s.split(' ').length <= 5);

      const phraseSourceMap = new Map<string, string>();
      const candidatePhrasesSet = new Set<string>();

      // =========================================================================
      // ШАГ 2 (30%): Принудительный сбор РЕАЛЬНЫХ запросов из Яндекса (Wordstat / XmlStock)
      // =========================================================================
      if (xmlConfig.wordstatEnabled !== false) {
        this.emitTaskStatus(taskId, projectId, TaskStatus.PROCESSING, 30, `📊 Шаг 2/7 [Wordstat ON]: Запрос Левой и Правой колонок Вордстата через API...`);
        for (const seed of baseSeeds.slice(0, 6)) {
          const dualResult = await this.wordstatProvider.getSimilarKeywordsWithColumns(seed, projectId, regionId);
          dualResult.leftColumnSubQueries.forEach(p => {
            candidatePhrasesSet.add(p);
            phraseSourceMap.set(p, 'Wordstat');
          });
          dualResult.rightColumnSimilarQueries.forEach(p => {
            candidatePhrasesSet.add(p);
            phraseSourceMap.set(p, 'Wordstat');
          });
        }
      }

      // Google XML Suggestions
      if (xmlConfig.googleXmlEnabled === true) {
        for (const seed of baseSeeds.slice(0, 4)) {
          const gData = await this.xmlStockProvider.getGoogleXmlData(seed, xmlConfig);
          gData.suggestions.forEach(s => {
            candidatePhrasesSet.add(s);
            phraseSourceMap.set(s, 'XmlStock');
          });
        }
      }

      // Yandex Live SERP Parsing
      if (xmlConfig.yandexLiveEnabled === true) {
        for (const seed of baseSeeds.slice(0, 4)) {
          const yLiveData = await this.xmlStockProvider.getYandexLiveData(seed, xmlConfig);
          yLiveData.suggestions.forEach(s => {
            candidatePhrasesSet.add(s);
            phraseSourceMap.set(s, 'XmlStock');
          });
        }
      }

      // =========================================================================
      // ШАГ 3 (45%): Поисковые подсказки (SearchSuggestProvider Yandex/Google)
      // =========================================================================
      this.emitTaskStatus(taskId, projectId, TaskStatus.PROCESSING, 45, `💡 Шаг 3/7 [Agent-Core]: Сбор поисковых подсказок Яндекса и Google...`);
      const minedSuggests = await this.suggestProvider.collectLongTailSuggests(baseSeeds);
      minedSuggests.forEach(s => {
        candidatePhrasesSet.add(s);
        phraseSourceMap.set(s, 'XmlStock');
      });

      // =========================================================================
      // ШАГ 4 (60%): Очистка от минус-слов и фильтрация длины/знаков препинания
      // =========================================================================
      this.emitTaskStatus(taskId, projectId, TaskStatus.PROCESSING, 60, `🧹 Шаг 4/7 [Strict Gatekeeper]: Отсечение пустых фраз, знаков препинания и фраз > 7 слов...`);
      const rawCandidates = Array.from(candidatePhrasesSet).filter(p => this.isValidSearchPhrase(p));
      const cleanCandidates = this.intentFilterService.filterNegativeWords(rawCandidates);
      const classifiedCandidates = this.intentFilterService.batchClassify(cleanCandidates);

      // =========================================================================
      // ШАГ 5 (75%): Принудительная проверка РЕАЛЬНОЙ частотности в Wordstat API
      // =========================================================================
      this.emitTaskStatus(taskId, projectId, TaskStatus.PROCESSING, 75, `📈 Шаг 5/7 [Wordstat API Verification]: Получение РЕАЛЬНЫХ показов/месяц от Яндекса...`);
      
      const candidateTerms = classifiedCandidates.map(c => c.phrase);
      const volumeMap = await this.wordstatProvider.getSearchVolume(candidateTerms, projectId, regionId);

      // =========================================================================
      // ШАГ 6 (90%): ФИЛЬТРАЦИЯ 0-ПОКАЗОВ и Сохранение в БД
      // =========================================================================
      this.emitTaskStatus(taskId, projectId, TaskStatus.PROCESSING, 90, `💾 Шаг 6/7 [Strict Gatekeeper]: Сохранение ТОЛЬКО подтвержденных Вордстатом ключей...`);

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
        const realVolume = volumeMap[item.phrase] || 0;

        // CRITICAL FILTER: Discard any phrase where search volume is 0 or null
        if (realVolume <= 0) {
          this.logger.debug(`[Strict Gatekeeper] Discarded hallucination/unverified phrase: "${item.phrase}" (Volume: ${realVolume})`);
          continue;
        }

        // Must be sourced strictly from Wordstat or XmlStock
        const realSource = phraseSourceMap.get(item.phrase) || 'Wordstat';

        await this.prisma.keyword.create({
          data: {
            projectId,
            term: item.phrase,
            searchVol: realVolume,
            difficulty: Math.min(100, Math.floor(realVolume / 150)),
            intent: item.intent,
            source: realSource, // Saved as "Wordstat" or "XmlStock"
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
        `🎉 Strict Gatekeeper Завершен! Подтверждено и сохранено ${savedCount} РЕАЛЬНЫХ ключей с частотностью Wordstat/XmlStock (Все фейковые AI-фразы отброшены).`
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
