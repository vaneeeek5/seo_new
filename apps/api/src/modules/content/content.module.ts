import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { ContentController } from './content.controller';
import { GenerateArticleHandler } from './commands/handlers/generate-article.handler';
import { ContentProcessor } from './processors/content.processor';
import { CmsPublisherService } from './services/cms-publisher.service';
import { AiProviderService } from '../../infrastructure/ai/ai-provider.service';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { EncryptionService } from '../../infrastructure/security/encryption.service';

@Module({
  imports: [
    CqrsModule,
  ],
  controllers: [ContentController],
  providers: [
    GenerateArticleHandler,
    ContentProcessor,
    CmsPublisherService,
    AiProviderService,
    PrismaService,
    EncryptionService,
  ],
  exports: [CmsPublisherService, AiProviderService],
})
export class ContentModule {}
