import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DomainEventTypes, TaskStatusChangedEvent, TaskStatus, TaskType } from '@seo-saas/shared';
import { YandexWordstatProvider } from '../providers/yandex-wordstat.provider';
import { IntentNegativeFilterService } from '../services/intent-negative-filter.service';
import { XmlStockProvider, XmlStockConfig } from '../providers/xmlstock.provider';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { ContentStatus, IntegrationProvider, KeywordIntent } from '@prisma/client';

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
    private readonly xmlStockProvider: XmlStockProvider,
    private readonly prisma: PrismaService,
  ) {
    super();
  }

  /**
   * Helper: Validates search phrase length and removes invalid punctuation.
   */
  private sanitizePhrase(phrase: string): string | null {
    if (!phrase) return null;
    const clean = phrase.toLowerCase().replace(/[.,!?;:"'()\[\]{}–—\-\\\/]+/g, ' ').replace(/\s+/g, ' ').trim();
    const words = clean.split(' ').filter(Boolean);
    if (words.length >= 1 && words.length <= 7) {
      return words.join(' ');
    }
    return null;
  }

  /**
   * ШАГ 1: Физический парсинг сайта (ТОЛЬКО КОД - без ИИ)
   */
  private async scrapeRawWebsiteText(url: string): Promise<string> {
    const cleanUrl = url.startsWith('http') ? url : `https://${url}`;
    this.logger.log(`[Step 1/6 CODE] Physical HTML scraping at ${cleanUrl}...`);

    try {
      const response = await fetch(cleanUrl, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
        signal: AbortSignal.timeout(8000),
      });

      if (response.ok) {
        const html = await response.text();
        return html
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ')
          .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ')
          .replace(/<[^>]+>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
      }
    } catch (err: any) {
      this.logger.warn(`[Step 1/6 CODE] Fetch warning for ${cleanUrl}: ${err.message}`);
    }

    return url;
  }

  /**
   * ШАГ 2: Выделение базисов (ИИ - без частотности)
   */
  private async extractBaseDirectionsAI(rawText: string): Promise<string[]> {
    this.logger.log(`[Step 2/6 AI] Extracting base 2-3 word directions/services from site text via LLM...`);
    const promptText = `Выдели из этого текста 5-10 базовых направлений/услуг в 2-3 слова. Верни только плоский массив строк в JSON формате без выдуманных цифр частотности.\n\nТекст страницы:\n${rawText.slice(0, 3000)}`;

    const geminiKey = process.env.GEMINI_API_KEY;
    if (geminiKey) {
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: promptText }] }],
            }),
          }
        );

        if (response.ok) {
          const data: any = await response.json();
          const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
          const parsed = JSON.parse(text.replace(/```json|```/g, '').trim());
          if (Array.isArray(parsed) && parsed.length > 0) {
            const sanitized = parsed.map(p => this.sanitizePhrase(String(p))).filter((p): p is string => p !== null);
            if (sanitized.length > 0) {
              return Array.from(new Set(sanitized)).slice(0, 10);
            }
          }
        }
      } catch (err: any) {
        this.logger.warn(`[Step 2/6 AI Warning] ${err.message}`);
      }
    }

    // Heuristic Fallback
    const words = rawText.toLowerCase().replace(/[^a-z0-9а-яё\s]/gi, ' ').split(/\s+/).filter(w => w.length > 4);
    const bases: string[] = [];
    for (let i = 0; i < words.length - 1 && bases.length < 8; i += 3) {
      bases.push(`${words[i]} ${words[i + 1]}`);
    }
    return Array.from(new Set(bases)).slice(0, 8);
  }

  /**
   * ШАГ 4: Расширение семантики (ИИ - группировка и синонимы без цифр)
   */
  private async expandSemanticPhrasesAI(wordstatPhrases: string[]): Promise<string[]> {
    this.logger.log(`[Step 4/6 AI] Generating 20-30 synonyms and customer pain-point variations...`);
    const sample = wordstatPhrases.slice(0, 25).join(', ');
    const promptText = `Вот список поисковых запросов из Яндекса. Сгруппируй их по смыслу и придумай еще 20-30 логичных синонимов, сленговых выражений или болей клиентов, которые люди могут искать по этой теме. Верни массив строк в JSON формате.\n\nЗапросы из Яндекса:\n${sample}`;

    const geminiKey = process.env.GEMINI_API_KEY;
    if (geminiKey) {
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: promptText }] }],
            }),
          }
        );

        if (response.ok) {
          const data: any = await response.json();
          const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
          const parsed = JSON.parse(text.replace(/```json|```/g, '').trim());
          if (Array.isArray(parsed) && parsed.length > 0) {
            const sanitized = parsed.map(p => this.sanitizePhrase(String(p))).filter((p): p is string => p !== null);
            if (sanitized.length > 0) {
              return Array.from(new Set(sanitized));
            }
          }
        }
      } catch (err: any) {
        this.logger.warn(`[Step 4/6 AI Warning] ${err.message}`);
      }
    }

    // Heuristic Fallback
    return wordstatPhrases.flatMap(p => [`купить ${p}`, `цена ${p}`, `${p} под ключ`]);
  }

  /**
   * ШАГ 6: Кластеризация и Интент (ИИ + КОД)
   */
  private async clusterAndClassifyIntentAI(cleanPhrases: string[]): Promise<Array<{ phrase: string; clusterName: string; intent: KeywordIntent }>> {
    this.logger.log(`[Step 6/6 AI] Clustering and classifying intent for ${cleanPhrases.length} verified Yandex phrases...`);
    const promptText = `Разбей этот список поисковых запросов на смысловые кластеры и определи интент для каждого фраз (COMMERCIAL, INFORMATIONAL, NAVIGATIONAL).\nВерни JSON массив объектов: [{"phrase": "...", "clusterName": "...", "intent": "COMMERCIAL"}]\n\nФразы:\n${JSON.stringify(cleanPhrases.slice(0, 60))}`;

    const geminiKey = process.env.GEMINI_API_KEY;
    if (geminiKey) {
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: promptText }] }],
            }),
          }
        );

        if (response.ok) {
          const data: any = await response.json();
          const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
          const parsed = JSON.parse(text.replace(/```json|```/g, '').trim());
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed.map(item => ({
              phrase: item.phrase || cleanPhrases[0],
              clusterName: item.clusterName || 'Основное направление',
              intent: (item.intent === 'INFORMATIONAL' || item.intent === 'NAVIGATIONAL') ? item.intent : 'COMMERCIAL',
            }));
          }
        }
      } catch (err: any) {
        this.logger.warn(`[Step 6/6 AI Clustering Warning] ${err.message}`);
      }
    }

    // Heuristic Classification Fallback
    const classified = this.intentFilterService.batchClassify(cleanPhrases);
    return classified.map(c => ({
      phrase: c.phrase,
      clusterName: 'Кластер: Семантическое ядро',
      intent: c.intent === 'INFORMATIONAL' ? KeywordIntent.INFORMATIONAL : KeywordIntent.COMMERCIAL,
    }));
  }

  async process(job: Job<any, any, string>): Promise<any> {
    const { taskId, projectId, seedKeywords, regionId } = job.data;
    this.logger.log(`[SemanticWorker] Executing 6-Step Strict Code-Driven Pipeline for task ${taskId}...`);

    try {
      const primarySeed = (Array.isArray(seedKeywords) && seedKeywords.length > 0)
        ? seedKeywords[0]
        : 'seo automation';

      const isUrl = primarySeed.startsWith('http://') || primarySeed.startsWith('https://') || primarySeed.includes('.com') || primarySeed.includes('.ru');

      // =========================================================================
      // ШАГ 1: Физический парсинг сайта (ТОЛЬКО КОД - без ИИ)
      // =========================================================================
      this.emitTaskStatus(taskId, projectId, TaskStatus.PROCESSING, 15, `🌐 Шаг 1/6 [КОД]: Скачивание HTML и вырезание тегов с сайта "${primarySeed}"...`);
      let rawSiteText = '';
      if (isUrl) {
        rawSiteText = await this.scrapeRawWebsiteText(primarySeed);
      } else {
        rawSiteText = Array.isArray(seedKeywords) ? seedKeywords.join(' ') : primarySeed;
      }

      // =========================================================================
      // ШАГ 2: Выделение базисов (ИИ - только базисы в 2-3 слова, без частотности)
      // =========================================================================
      this.emitTaskStatus(taskId, projectId, TaskStatus.PROCESSING, 30, `🤖 Шаг 2/6 [ИИ]: Выделение 5-10 базовых направлений/услуг в 2-3 слова...`);
      let baseBases = await this.extractBaseDirectionsAI(rawSiteText);
      if (baseBases.length === 0) {
        baseBases = [isUrl ? primarySeed.replace(/https?:\/\//, '').split('.')[0] : primarySeed];
      }

      // =========================================================================
      // ШАГ 3: Первый прогон через Yandex Wordstat API (ТОЛЬКО КОД)
      // =========================================================================
      this.emitTaskStatus(taskId, projectId, TaskStatus.PROCESSING, 45, `📊 Шаг 3/6 [КОД - Wordstat API #1]: Сбор Левой и Правой колонок Вордстата по базисам...`);
      const step3PhrasesSet = new Set<string>();
      const volumeMap: Record<string, number> = {};

      for (const base of baseBases) {
        const dualResult = await this.wordstatProvider.getSimilarKeywordsWithColumns(base, projectId, regionId);
        dualResult.leftColumnSubQueries.forEach(p => {
          const clean = this.sanitizePhrase(p);
          if (clean) step3PhrasesSet.add(clean);
        });
        dualResult.rightColumnSimilarQueries.forEach(p => {
          const clean = this.sanitizePhrase(p);
          if (clean) step3PhrasesSet.add(clean);
        });
      }

      const step3Candidates = Array.from(step3PhrasesSet);
      const step3Volumes = await this.wordstatProvider.getSearchVolume(step3Candidates, projectId, regionId);
      Object.assign(volumeMap, step3Volumes);

      // =========================================================================
      // ШАГ 4: Расширение семантики (ИИ - синонимы и боли клиентов, без цифр)
      // =========================================================================
      this.emitTaskStatus(taskId, projectId, TaskStatus.PROCESSING, 60, `💡 Шаг 4/6 [ИИ]: Группировка и генерация 20-30 синонимов, сленга и болей клиентов...`);
      const aiExpandedCandidates = await this.expandSemanticPhrasesAI(step3Candidates);

      // =========================================================================
      // ШАГ 5: Второй прогон через Yandex Wordstat API (ТОЛЬКО КОД) + ЖЕСТКОЕ УДАЛЕНИЕ 0 ПОКАЗОВ
      // =========================================================================
      this.emitTaskStatus(taskId, projectId, TaskStatus.PROCESSING, 75, `📈 Шаг 5/6 [КОД - Wordstat API #2]: Проверка частотности новых AI-фраз и ЖЕСТКОЕ отсечение 0 показов...`);
      const cleanAiCandidates = aiExpandedCandidates
        .map(p => this.sanitizePhrase(p))
        .filter((p): p is string => p !== null && !step3PhrasesSet.has(p));

      const step5Volumes = await this.wordstatProvider.getSearchVolume(cleanAiCandidates, projectId, regionId);
      Object.assign(volumeMap, step5Volumes);

      // Объединяем результаты Шага 3 и Шага 5 и ЖЕСТКО УДАЛЯЕМ 0 ПОКАЗОВ
      const allVerifiedPhrases = Array.from(new Set([...step3Candidates, ...cleanAiCandidates]))
        .filter(phrase => {
          const vol = volumeMap[phrase] || 0;
          return vol > 0; // STERN GATEKEEPER: ONLY KEEP REAL WORDSTAT VOLUMES > 0
        });

      // =========================================================================
      // ШАГ 6: Кластеризация и Интент (ИИ + КОД) & Запись в БД с РЕАЛЬНОЙ частотностью
      // =========================================================================
      this.emitTaskStatus(taskId, projectId, TaskStatus.PROCESSING, 90, `💾 Шаг 6/6 [ИИ + КОД]: Кластеризация, определение интентов и запись в БД с частотностью Yandex API...`);
      
      const clusteredItems = await this.clusterAndClassifyIntentAI(allVerifiedPhrases);

      let savedCount = 0;
      for (const item of clusteredItems) {
        const realVol = volumeMap[item.phrase] || 0;
        if (realVol <= 0) continue; // Safety check

        // Find or create cluster
        let cluster = await this.prisma.cluster.findFirst({
          where: { projectId, name: item.clusterName },
        });

        if (!cluster) {
          cluster = await this.prisma.cluster.create({
            data: {
              projectId,
              name: item.clusterName,
              status: ContentStatus.DRAFT,
            },
          });
        }

        await this.prisma.keyword.create({
          data: {
            projectId,
            term: item.phrase,
            searchVol: realVol, // DIRECTLY FROM YANDEX WORDSTAT API
            difficulty: Math.min(100, Math.floor(realVol / 150)),
            intent: item.intent,
            source: 'Yandex Wordstat API', // STRICT SOURCE TAGGING
            clusterId: cluster.id,
          },
        });
        savedCount++;
      }

      // Completion Notification
      this.emitTaskStatus(
        taskId,
        projectId,
        TaskStatus.COMPLETED,
        100,
        `🎉 6-Шаговый Пайплайн Завершен! Сохранено ${savedCount} целевых ключей с подтвержденной частотностью Yandex Wordstat API (Источник: Yandex Wordstat API).`
      );

      return {
        keywordsSaved: savedCount,
        candidatesEvaluated: allVerifiedPhrases.length,
      };
    } catch (error: any) {
      this.logger.error(`[SemanticWorker Error] Task ${taskId} failed: ${error.message}`);
      this.emitTaskStatus(
        taskId,
        projectId,
        TaskStatus.FAILED,
        0,
        `Code-Driven Semantic Pipeline Failed: ${error.message}`
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
