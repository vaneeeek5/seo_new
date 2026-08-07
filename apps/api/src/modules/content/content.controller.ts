import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { GenerateArticleDto } from '@seo-saas/shared';
import { GenerateArticleCommand } from './commands/generate-article.command';
import { CmsPublisherService, PublishArticlePayload } from './services/cms-publisher.service';
import { AiProviderService } from '../../infrastructure/ai/ai-provider.service';

@Controller('content')
export class ContentController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly cmsPublisher: CmsPublisherService,
    private readonly aiProvider: AiProviderService,
  ) {}

  @Post('articles/generate')
  @HttpCode(HttpStatus.ACCEPTED)
  async generateArticle(@Body() body: any) {
    const dto: GenerateArticleDto = {
      projectId: body.projectId || 'proj_demo_1',
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

    return {
      taskId: `task_gen_${Date.now()}`,
      status: 'COMPLETED',
      result,
    };
  }

  @Post('articles/publish')
  @HttpCode(HttpStatus.OK)
  async publishArticle(@Body() body: { articleId: string; payload: PublishArticlePayload; projectId?: string }) {
    const { articleId, payload, projectId } = body;
    return await this.cmsPublisher.publishArticleToCms(articleId, payload, projectId || 'proj_demo_1');
  }
}
