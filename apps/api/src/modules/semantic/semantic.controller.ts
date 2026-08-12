import { Controller, Post, Get, Delete, Body, Param, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { CollectSemanticDto } from '@seo-saas/shared';
import { CollectSemanticCommand } from './commands/collect-semantic.command';
import { RankTrackerService } from './services/rank-tracker.service';
import { CompetitorAnalysisProcessor } from './services/competitor-analysis.processor';
import { PrismaService } from '../../infrastructure/database/prisma.service';

@Controller('semantics')
export class SemanticController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly rankTracker: RankTrackerService,
    private readonly competitorProcessor: CompetitorAnalysisProcessor,
    private readonly prisma: PrismaService,
  ) {}

  @Post('collect')
  @HttpCode(HttpStatus.ACCEPTED)
  async collectSemantics(@Body() dto: CollectSemanticDto) {
    return await this.commandBus.execute(new CollectSemanticCommand(dto));
  }

  @Delete('clear')
  @HttpCode(HttpStatus.OK)
  async clearSemantics(
    @Query('projectId') queryProjectId?: string,
    @Query('domain') queryDomain?: string,
    @Body() body?: { projectId?: string; domain?: string },
  ) {
    const projectId = queryProjectId || body?.projectId || 'proj_demo_1';
    const domain = queryDomain || body?.domain;

    try {
      if (domain && domain !== 'ALL') {
        const result = await this.prisma.keyword.deleteMany({
          where: {
            projectId,
          },
        });
        return { count: result.count, domain, message: `Очищены ключевые фразы для домена ${domain}` };
      }

      const result = await this.prisma.keyword.deleteMany({
        where: { projectId },
      });
      return { count: result.count, message: `Семантическое ядро проекта ${projectId} полностью очищено` };
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
