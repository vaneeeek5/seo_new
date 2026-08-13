import { Controller, Post, Get, Delete, Body, Param, Query, HttpCode, HttpStatus, HttpException } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { CollectSemanticDto } from '@seo-saas/shared';
import { CollectSemanticCommand } from './commands/collect-semantic.command';
import { RankTrackerService } from './services/rank-tracker.service';
import { CompetitorAnalysisProcessor } from './services/competitor-analysis.processor';
import { YandexWordstatProvider } from './providers/yandex-wordstat.provider';
import { IntentNegativeFilterService } from './services/intent-negative-filter.service';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { ContentStatus, KeywordIntent } from '@prisma/client';

@Controller('semantics')
export class SemanticController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly rankTracker: RankTrackerService,
    private readonly competitorProcessor: CompetitorAnalysisProcessor,
    private readonly wordstatProvider: YandexWordstatProvider,
    private readonly intentFilterService: IntentNegativeFilterService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('wordstat-status')
  async getWordstatStatus(@Query('projectId') projectId?: string) {
    try {
      const activeConnection = await this.prisma.integrationConnection.findFirst({
        where: { isActive: true },
        orderBy: { createdAt: 'desc' },
      });

      if (!activeConnection) {
        return {
          connected: false,
          statusMessage: '❌ Активные API-ключи в базе данных не найдены. Добавьте ключ в Центр Интеграций.',
        };
      }

      // Пробуем быстрый живой запрос с явным таймаутом
      const testVolume = await Promise.race([
        this.wordstatProvider.getSearchVolume(['автомойка'], projectId || 'proj_demo_1', 225),
        new Promise<Record<string, number>>((_, reject) =>
          setTimeout(() => reject(new Error('Yandex API: таймаут 12 секунд — ключ может быть неверен или нет folderId')), 12000)
        ),
      ]) as Record<string, number>;

      const vol = testVolume['автомойка'] || 0;

      return {
        connected: vol > 0,
        provider: activeConnection.provider,
        maskedKey: activeConnection.maskedKey,
        testKeyword: 'автомойка',
        volume: vol,
        statusMessage: vol > 0
          ? `✅ Yandex Wordstat работает! Частотность «автомойка»: ${vol} показов/мес.`
          : `⚠️ Ключ найден (${activeConnection.maskedKey}), но API вернуло 0. Проверьте логи NestJS — там будет HTTP-код ошибки от Yandex.`,
      };
    } catch (err: any) {
      console.error('[WORDSTAT STATUS ERROR]', err.message);
      return {
        connected: false,
        statusMessage: `❌ Ошибка: ${err.message}`,
      };
    }
  }

  @Post('collect')
  @HttpCode(HttpStatus.OK)
  async collectSemantics(@Body() dto: CollectSemanticDto) {
    try {
      const { projectId, seedKeywords, regionId } = dto;
      const projId = projectId || 'proj_demo_1';

      // 1. Ensure project exists in DB to prevent Foreign Key constraint failure
      await this.prisma.project.upsert({
        where: { id: projId },
        update: {},
        create: {
          id: projId,
          name: projId === 'proj_demo_epic' ? 'Epic Car Wash' : 'SEO SaaS Platform',
          domain: projId === 'proj_demo_epic' ? 'epicarwash.com' : 'seo-saas.com',
          organizationId: 'org_demo_1',
        },
      });

      // 2. Extract & Parse User-Provided Keywords
      let lines: string[] = [];
      if (Array.isArray(seedKeywords)) {
        lines = seedKeywords.flatMap(s => String(s).split(/\r?\n/));
      } else if (typeof seedKeywords === 'string') {
        lines = (seedKeywords as string).split(/\r?\n/);
      }

      const rawKeywords: string[] = [];
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        if (trimmed.includes(',') || trimmed.includes(';')) {
          const parts = trimmed.split(/[,;]/).map(p => p.trim()).filter(Boolean);
          rawKeywords.push(...parts);
        } else {
          rawKeywords.push(trimmed);
        }
      }

      const cleanUserKeywords = Array.from(
        new Set(
          rawKeywords
            .map(k => k.toLowerCase().replace(/\s+/g, ' ').trim())
            .filter(Boolean)
        )
      );

      if (cleanUserKeywords.length === 0) {
        return { success: false, message: 'Список ключевых слов пуст', keywords: [] };
      }

      // 3. Query Yandex Wordstat API for exact live volume
      let volumeMap: Record<string, number> = {};
      try {
        volumeMap = await this.wordstatProvider.getSearchVolume(cleanUserKeywords, projId, regionId || 225);
      } catch (wordstatErr: any) {
        const rawDetail = wordstatErr?.response?.data
          ? JSON.stringify(wordstatErr.response.data)
          : wordstatErr?.message || String(wordstatErr);
        console.error('[WORDSTAT COLLECT ERROR]', rawDetail);
        throw new HttpException(
          JSON.stringify({ yandexError: rawDetail, message: 'Ошибка при запросе к Yandex Wordstat API' }),
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      // 4. Batch intent classification
      const classified = this.intentFilterService.batchClassify(cleanUserKeywords);

      // 5. Find or create cluster
      const clusterName = `Пользовательские ключи (${new Date().toLocaleDateString('ru-RU')})`;
      let cluster = await this.prisma.cluster.findFirst({
        where: { projectId: projId, name: clusterName },
      });

      if (!cluster) {
        cluster = await this.prisma.cluster.create({
          data: {
            projectId: projId,
            name: clusterName,
            status: ContentStatus.DRAFT,
          },
        });
      }

      // 6. Save verified keywords into DB
      const savedItems = [];
      for (const item of classified) {
        const realVol = volumeMap[item.phrase] || 0;

        let created;
        try {
          created = await this.prisma.keyword.create({
            data: {
              projectId: projId,
              term: item.phrase,
              searchVol: realVol,
              difficulty: Math.min(100, Math.floor(realVol / 150)),
              intent: item.intent === 'INFORMATIONAL' ? KeywordIntent.INFORMATIONAL : KeywordIntent.COMMERCIAL,
              source: 'Yandex Wordstat API',
              clusterId: cluster.id,
            },
          });
        } catch (dbErr) {
          created = {
            id: `kw_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
            term: item.phrase,
            searchVol: realVol,
            difficulty: Math.min(100, Math.floor(realVol / 150)),
            intent: item.intent === 'INFORMATIONAL' ? KeywordIntent.INFORMATIONAL : KeywordIntent.COMMERCIAL,
          };
        }

        savedItems.push({
          id: created.id,
          term: created.term,
          vol: created.searchVol || realVol,
          diff: created.difficulty || 0,
          cluster: cluster.name,
          domain: projId === 'proj_demo_epic' ? 'epicarwash.com' : 'seo-saas.com',
          intent: created.intent || 'COMMERCIAL',
          source: 'WORDSTAT',
          priority: realVol > 2000 ? 'HIGH' : realVol > 500 ? 'MEDIUM' : 'LOW',
        });
      }

      // Trigger CQRS Command for background tracking
      this.commandBus.execute(new CollectSemanticCommand(dto)).catch(() => {});

      return {
        success: true,
        count: savedItems.length,
        keywords: savedItems,
      };
    } catch (err: any) {
      // Re-throw HttpException as-is (e.g. from Wordstat block)
      if (err instanceof HttpException) throw err;
      const errMsg = err?.message || String(err);
      console.error('[SEMANTIC COLLECT ERROR]', errMsg);
      throw new HttpException(
        JSON.stringify({ message: errMsg }),
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('keywords/:projectId')
  async getKeywords(@Param('projectId') projectId: string) {
    const keywords = await this.prisma.keyword.findMany({
      where: {
        OR: [
          { projectId },
          { projectId: 'proj_demo_1' },
        ],
      },
      include: {
        cluster: true,
      },
      orderBy: { searchVol: 'desc' },
    });

    return keywords.map(kw => ({
      id: kw.id,
      term: kw.term,
      vol: kw.searchVol || 0,
      diff: kw.difficulty || 0,
      cluster: kw.cluster?.name || 'Пользовательские ключи',
      domain: 'epicarwash.com',
      intent: kw.intent || 'COMMERCIAL',
      source: kw.source || 'WORDSTAT',
      priority: (kw.searchVol || 0) > 2000 ? 'HIGH' : (kw.searchVol || 0) > 500 ? 'MEDIUM' : 'LOW',
    }));
  }

  @Delete('clear')
  @Post('clear')
  @Post('clear-all')
  @HttpCode(HttpStatus.OK)
  async clearSemantics(
    @Query('projectId') queryProjectId?: string,
    @Query('domain') queryDomain?: string,
    @Body() body?: { projectId?: string; domain?: string },
  ) {
    const projectId = queryProjectId || body?.projectId || 'proj_demo_1';

    try {
      const deletedKeywords = await this.prisma.keyword.deleteMany({
        where: {
          OR: [
            { projectId },
            { projectId: 'proj_demo_1' },
            { projectId: 'proj_demo_epic' },
          ],
        },
      });

      await this.prisma.cluster.deleteMany({
        where: {
          OR: [
            { projectId },
            { projectId: 'proj_demo_1' },
            { projectId: 'proj_demo_epic' },
          ],
        },
      });

      return { count: deletedKeywords.count, message: `Семантическое ядро проекта успешно очищено (удалено ${deletedKeywords.count} фраз).` };
    } catch (err: any) {
      return { count: 0, message: err.message };
    }
  }

  @Post('rank-track')
  @HttpCode(HttpStatus.OK)
  async trackPositions(@Body() body: { projectId: string }) {
    const projectId = body.projectId || 'proj_demo_1';
    const { results, errorMessage } = await this.rankTracker.trackProjectPositions(projectId);
    return {
      success: !errorMessage,
      count: results.length,
      results,
      errorMessage: errorMessage || null,
    };
  }

  @Get('rank-history/:projectId')
  async getRankHistory(@Param('projectId') projectId: string) {
    return await this.rankTracker.getProjectRankHistory(projectId);
  }

  @Post('competitor-analysis')
  @HttpCode(HttpStatus.OK)
  async analyzeCompetitors(@Body() body: { primaryKeyword: string; clusterId?: string; projectId?: string }) {
    const { primaryKeyword, clusterId, projectId } = body;
    return await this.competitorProcessor.analyzeCompetitors(primaryKeyword || 'роботизированная автомойка', clusterId, projectId || 'proj_demo_1');
  }
}
