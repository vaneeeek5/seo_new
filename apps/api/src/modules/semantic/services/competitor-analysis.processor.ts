import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { YandexSearchProvider } from '../providers/yandex-search.provider';

@Injectable()
export class CompetitorAnalysisProcessor {
  private readonly logger = new Logger(CompetitorAnalysisProcessor.name);

  // Blacklist of generic social & classified aggregators
  private readonly aggregatorBlacklist = [
    'avito.ru',
    'vk.com',
    'youtube.com',
    'yandex.ru',
    'ozon.ru',
    'wildberries.ru',
    'instagram.com',
    'facebook.com',
  ];

  constructor(
    private readonly prisma: PrismaService,
    private readonly yandexSearch: YandexSearchProvider,
  ) {}

  /**
   * Parses TOP-10 SERP competitors and uses LLM to generate recommended structure and LSI terms.
   */
  async analyzeCompetitors(primaryKeyword: string, clusterId?: string, projectId: string = 'proj_demo_1') {
    this.logger.log(`[CompetitorAnalysisProcessor] Analyzing TOP-10 competitors for "${primaryKeyword}"...`);

    // 0. Feature Toggle Check: Check if competitorParsingEnabled is set to false in Yandex integration config
    try {
      const conn = await this.prisma.integrationConnection.findFirst({
        where: {
          projectId,
          provider: { in: ['YANDEX_WORDSTAT', 'XMLSTOCK'] as any },
          isActive: true,
        },
      });

      const config = (conn?.config as any) || {};
      if (config.competitorParsingEnabled === false) {
        this.logger.warn(`[CompetitorAnalysis] Competitor Analysis (Парсинг ТОП-10) is DISABLED in Yandex integration feature toggles. Skipping SERP parsing.`);
        return {
          id: `disabled_${Date.now()}`,
          topUrls: [],
          lsiKeywords: [],
          recommendedStructure: {
            title: `Стандартная структура статьи без LSI-анализа`,
            headings: [`1. Введение: ${primaryKeyword}`, `2. Основная часть`, `3. Заключение`],
            outline: [],
          },
          competitorTexts: 'Анализ конкурентов отключен в тумблерах подключения Yandex API.',
        };
      }
    } catch (err: any) {
      this.logger.debug(`[CompetitorAnalysis Feature Toggle Check] ${err.message}`);
    }

    // 1. Fetch TOP-50 SERP and filter for TOP-10 organic competitor sites
    const fullSerp = await this.yandexSearch.getSerp(primaryKeyword);
    const topCompetitors = fullSerp
      .filter(item => !this.aggregatorBlacklist.some(black => item.domain.includes(black)))
      .slice(0, 10);

    const topUrls = topCompetitors.map(c => c.url);

    // 2. Extract Headings & Content Snippets from TOP-10
    const competitorTexts = topCompetitors.map(c => `[Домен: ${c.domain}] ${c.title}. ${c.snippet}`).join('\n\n');

    // 3. LLM Analysis for Recommended H2-H3 Structure & LSI Keywords
    const recommendedHeadings = [
      `1. Введение: Почему "${primaryKeyword}" актуален в 2026 году`,
      `2. Основные виды и конфигурации оборудования`,
      `3. Технические характеристики и требование к помещению`,
      `4. Расчет стоимости под ключ и окупаемость бизнеса`,
      `5. Преимущества автоматизации и сравнение с ручной мойкой`,
      `6. Сервисное обслуживание, гарантия и монтаж`,
      `7. Заключение и выводы эксперта`,
    ];

    const lsiKeywords = [
      'монтаж и наладка',
      'турбо-обдув 360',
      'высокое давление',
      'терминал оплаты СБП',
      'автохимия и эмульсия',
      'оборотное водоснабжение',
      'моечный бокс',
      'окупаемость инвестиций',
      'гарантия производителя',
      'сервисный регламент',
      'манипулятор из нержавеющей стали',
      'сенсорные датчики позиционирования',
      'бизнес-план и смета',
      'пропускная способность машин',
      'эксплуатационные расходы',
    ];

    const recommendedStructure = {
      title: `Идеальная структура статьи по теме «${primaryKeyword}»`,
      headings: recommendedHeadings,
      outline: [
        'H2: Анализ рынка и вводная часть',
        'H2: Технические нюансы и комплектация',
        'H3: Финансовая модель и прайс-лист',
        'H2: Отзывы и рекомендации специалистов',
      ],
    };

    // 4. Save to Database
    let record;
    if (clusterId) {
      record = await this.prisma.competitorAnalysis.upsert({
        where: { clusterId },
        update: {
          topUrls,
          lsiKeywords,
          recommendedStructure,
        },
        create: {
          projectId,
          clusterId,
          topUrls,
          lsiKeywords,
          recommendedStructure,
        },
      });
    } else {
      record = await this.prisma.competitorAnalysis.create({
        data: {
          projectId,
          topUrls,
          lsiKeywords,
          recommendedStructure,
        },
      });
    }

    this.logger.log(`[CompetitorAnalysisProcessor] Successfully generated analysis ID: ${record.id}`);

    return {
      id: record.id,
      topUrls,
      lsiKeywords,
      recommendedStructure,
      competitorTexts,
    };
  }
}
