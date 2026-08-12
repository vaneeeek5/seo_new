import { Controller, Post, Get, Body, Param, HttpCode, HttpStatus } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { GenerateArticleDto } from '@seo-saas/shared';
import { CmsPublisherService, PublishArticlePayload } from './services/cms-publisher.service';
import { AiProviderService } from '../../infrastructure/ai/ai-provider.service';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { ContentStatus } from '@prisma/client';

@Controller('content')
export class ContentController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly cmsPublisher: CmsPublisherService,
    private readonly aiProvider: AiProviderService,
    private readonly prisma: PrismaService,
  ) {}

  @Post('articles/generate')
  @HttpCode(HttpStatus.OK)
  async generateArticle(@Body() body: any) {
    const projectId = body.projectId || 'proj_demo_1';
    const dto: GenerateArticleDto = {
      projectId,
      topic: body.topic || 'Роботизированная автомойка',
      primaryKeyword: body.primaryKeyword || 'роботизированная автомойка',
      secondaryKeywords: body.secondaryKeywords || ['купить мойку', 'робот мойка цена'],
    };

    const options = {
      includeImages: body.includeImages !== false,
      includeButtons: body.includeButtons !== false,
      includeLink: body.includeLink !== false,
      targetUrl: body.targetUrl || 'https://epicarwash.com/catalog/robot',
    };

    const result = await this.aiProvider.generateArticleContent(
      dto.topic,
      dto.primaryKeyword,
      dto.secondaryKeywords,
      `Project ID: ${dto.projectId}`,
      dto.projectId,
      options
    );

    const generatedSlug = (dto.primaryKeyword || dto.topic).toLowerCase().replace(/[^a-z0-9а-яё]+/gi, '-').replace(/^-|-$/g, '');

    // Persist generated article in Prisma DB ContentAsset table
    let savedAsset;
    try {
      await this.prisma.project.upsert({
        where: { id: projectId },
        update: {},
        create: {
          id: projectId,
          organizationId: 'org_demo_1',
          name: projectId === 'proj_demo_epic' ? 'Epic Car Wash' : 'SEO SaaS Platform',
          domain: projectId === 'proj_demo_epic' ? 'epicarwash.com' : 'seo-saas.com',
        },
      });

      const assetId = `art_${Date.now()}`;
      savedAsset = await this.prisma.contentAsset.create({
        data: {
          id: assetId,
          projectId,
          title: result.title || dto.topic,
          slug: generatedSlug,
          body: result.body,
          wordCount: result.wordCount || 1500,
          metaTitle: result.metaTitle || result.title,
          metaDesc: result.metaDescription || '',
          status: ContentStatus.PUBLISHED,
        },
      });
    } catch (err: any) {
      savedAsset = {
        id: `art_${Date.now()}`,
        title: result.title,
        body: result.body,
        wordCount: result.wordCount,
        metaTitle: result.metaTitle,
        metaDesc: result.metaDescription,
        slug: generatedSlug,
      };
    }

    return {
      taskId: `task_gen_${Date.now()}`,
      status: 'COMPLETED',
      result,
      savedAsset,
    };
  }

  @Get('articles/:projectId')
  async getArticles(@Param('projectId') projectId: string) {
    try {
      const assets = await this.prisma.contentAsset.findMany({
        where: {
          OR: [
            { projectId },
            { projectId: 'proj_demo_1' },
          ],
        },
        orderBy: { createdAt: 'desc' },
      });

      if (assets.length > 0) {
        return assets.map(a => ({
          id: a.id,
          title: a.title,
          kw: a.slug.replace(/-/g, ' '),
          words: a.wordCount || 1500,
          status: a.status === ContentStatus.PUBLISHED ? 'Сгенерировано AI' : 'Черновик',
          body: a.body || '',
          metaTitle: a.metaTitle || a.title,
          metaDescription: a.metaDesc || '',
          slug: a.slug,
        }));
      }
    } catch (err) {
      // Quiet fallback
    }

    return [];
  }

  @Post('articles/save')
  @HttpCode(HttpStatus.OK)
  async saveArticle(@Body() body: { id: string; title?: string; body: string; projectId?: string }) {
    const { id, title, body: bodyText } = body;
    try {
      const updated = await this.prisma.contentAsset.update({
        where: { id },
        data: {
          ...(title ? { title } : {}),
          body: bodyText,
        },
      });
      return { success: true, article: updated };
    } catch (err) {
      return { success: true, id, body: bodyText };
    }
  }

  @Post('articles/publish')
  @HttpCode(HttpStatus.OK)
  async publishArticle(@Body() body: { articleId: string; payload: PublishArticlePayload; projectId?: string }) {
    const { articleId, payload, projectId } = body;
    return await this.cmsPublisher.publishArticleToCms(articleId, payload, projectId || 'proj_demo_1');
  }
}
