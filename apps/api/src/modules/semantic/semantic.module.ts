import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { BullModule } from '@nestjs/bullmq';
import { SemanticController } from './semantic.controller';
import { CollectSemanticHandler } from './commands/handlers/collect-semantic.handler';
import { SemanticProcessor } from './processors/semantic.processor';
import { YandexWordstatProvider } from './providers/yandex-wordstat.provider';
import { SiteScraperService } from './services/site-scraper.service';
import { SearchSuggestProvider } from './providers/search-suggest.provider';
import { IntentNegativeFilterService } from './services/intent-negative-filter.service';
import { XmlStockProvider } from './providers/xmlstock.provider';
import { YandexSearchProvider } from './providers/yandex-search.provider';
import { RankTrackerService } from './services/rank-tracker.service';
import { CompetitorAnalysisProcessor } from './services/competitor-analysis.processor';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { EncryptionService } from '../../infrastructure/security/encryption.service';

@Module({
  imports: [
    CqrsModule,
  ],
  controllers: [SemanticController],
  providers: [
    CollectSemanticHandler,
    SemanticProcessor,
    YandexWordstatProvider,
    SiteScraperService,
    SearchSuggestProvider,
    IntentNegativeFilterService,
    XmlStockProvider,
    YandexSearchProvider,
    RankTrackerService,
    CompetitorAnalysisProcessor,
    PrismaService,
    EncryptionService,
  ],
  exports: [
    YandexWordstatProvider,
    SiteScraperService,
    SearchSuggestProvider,
    IntentNegativeFilterService,
    XmlStockProvider,
    YandexSearchProvider,
    RankTrackerService,
    CompetitorAnalysisProcessor,
  ],
})
export class SemanticModule {}
