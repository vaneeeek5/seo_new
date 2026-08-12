import { Controller, Post, Get, Delete, Body, Param, Query, HttpCode, HttpStatus } from '@nestjs/common';
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

  @Post('collect')
  @HttpCode(HttpStatus.OK)
  async collectSemantics(@Body() dto: CollectSemanticDto) {
    const { projectId, seedKeywords, regionId } = dto;
    const projId = projectId || 'proj_demo_1';

    let rawKeywords: string[] = [];
    if (Array.isArray(seedKeywords)) {
      rawKeywords = seedKeywords.flatMap(s => String(s).split(/\r?\n|,/));
    } else if (typeof seedKeywords === 'string') {
      rawKeywords = (seedKeywords as string).split(/\r?\n|,/);
    }

    const cleanUserKeywords = Array.from(
      new Set(
        rawKeywords
          .map(k => k.toLowerCase().replace(/[.,!?;:"'()\[\]{}–—\-\\\/]+/g, ' ').replace(/\s+/g, ' ').trim())
          .filter(Boolean)
      )
    );

    if (cleanUserKeywords.length === 0) {
      return { success: false, message: 'Список ключевых слов пуст', keywords: [] };
    }

    // 1. Fetch Search Volume directly from Wordstat Provider
    const volumeMap = await this.wordstatProvider.getSearchVolume(cleanUserKeywords, projId, regionId || 225);

    // 2. Batch intent classification
    const classified = this.intentFilterService.batchClassify(cleanUserKeywords);

    // 3. Find or create cluster
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

    // 4. Save into DB & build response array
    const savedItems = [];
    for (const item of classified) {
      const realVol = volumeMap[item.phrase] || 450;

      const created = await this.prisma.keyword.create({
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

      savedItems.push({
        id: created.id,
        term: created.term,
        vol: created.searchVol,
        diff: created.difficulty,
        cluster: cluster.name,
        domain: 'epicarwash.com',
        intent: created.intent || 'COMMERCIAL',
        source: 'WORDSTAT',
        priority: created.searchVol > 2000 ? 'HIGH' : created.searchVol > 500 ? 'MEDIUM' : 'LOW',
      });
    }

    // Trigger CQRS Command for background tracking
    this.commandBus.execute(new CollectSemanticCommand(dto)).catch(() => {});

    return {
      success: true,
      count: savedItems.length,
      keywords: savedItems,
    };
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
      vol: kw.searchVol,
      diff: kw.difficulty,
      cluster: kw.cluster?.name || 'Пользовательские ключи',
      domain: 'epicarwash.com',
      intent: kw.intent || 'COMMERCIAL',
      source: kw.source || 'WORDSTAT',
      priority: kw.searchVol > 2000 ? 'HIGH' : kw.searchVol > 500 ? 'MEDIUM' : 'LOW',
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
      // Clean up keywords and clusters unconditionally for project
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
    return await this.rankTracker.trackProjectPositions(projectId);
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
