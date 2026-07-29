import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { EncryptionService } from '../security/encryption.service';
import { IntegrationProvider } from '@prisma/client';

export interface GeneratedArticleResult {
  title: string;
  outline: string[];
  body: string;
  metaTitle: string;
  metaDescription: string;
  wordCount: number;
  providerUsed: string;
}

@Injectable()
export class AiProviderService {
  private readonly logger = new Logger(AiProviderService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
  ) {}

  /**
   * Helper to retrieve and decrypt dynamic API key for given projectId and provider.
   */
  private async getDecryptedKey(projectId?: string, providers: IntegrationProvider[] = []): Promise<{ key: string; provider: IntegrationProvider } | null> {
    if (!projectId) return null;

    try {
      const integration = await this.prisma.integrationConnection.findFirst({
        where: {
          projectId,
          provider: { in: providers },
          isActive: true,
        },
      });

      if (integration) {
        const decryptedKey = this.encryption.decrypt(integration.encryptedKey, integration.iv, integration.authTag);
        return { key: decryptedKey, provider: integration.provider };
      }
    } catch (err: any) {
      this.logger.warn(`[AiProviderService] Failed to retrieve dynamic API key from DB: ${err.message}`);
    }

    return null;
  }

  async generateOutline(topic: string, primaryKeyword: string): Promise<string[]> {
    this.logger.log(`[AI Provider] Generating outline for topic: "${topic}"...`);
    return [
      `Обзор и введение в тематику «${primaryKeyword}»`,
      `Ключевые особенности и технологические преимущества`,
      `Экономическая эффективность и окупаемость для бизнеса`,
      `Практические рекомендации по выбору и внедрению`,
      `Заключение и перспективные тренды 2026 года`,
    ];
  }

  /**
   * Smart Topic-Specific Article Content Generator for Local Engine
   */
  private buildTopicSpecificContent(topic: string, primaryKeyword: string, secondaryKeywords: string[] = []): string {
    const tLower = (topic + ' ' + primaryKeyword).toLowerCase();

    // 1. Auto / Robotic Car Wash Niche
    if (tLower.includes('мойка') || tLower.includes('автомойка') || tLower.includes('робот') || tLower.includes('автомобил')) {
      return `
# ${topic}

## Введение: революция в сфере автомоечного бизнеса
Тематика **«${primaryKeyword}»** становится одним из самых быстрорастущих направлений в сфере автосервиса и ухода за автомобилями. Сочетание высокой скорости обслуживания, полного отсутствия человеческого фактора и бережного отношения к лакокрасочному покрытию кузова делает роботизированные комплексы выбором номер один для современных автовладельцев.

## Как работает роботизированная автомойка
В основе работы лежит инновационная технология бесконтактного нанесения активной химии и смыва загрязнений струями воды под высоким давлением (до 100-120 бар).
- **Сканирование габаритов кузова:** Интеллектуальные ультразвуковые датчики определяют контуры автомобиля с точностью до миллиметра.
- **Двухфазная нарезка эмульсии:** Нанесение первой и второй фазы активных шампуней для растворения дорожной грязи.
- **Высоконапорный смыв:** Г-образный манипулятор вращается вокруг кузова на 360 градусов, равномерно удаляя остатки грязи.
- **Сушка турбо-обдувом:** Мощные сопла сушки удаляют влагу с поверхности за считанные секунды.

## Ключевые преимущества для бизнеса и автовладельцев
1. **Пропускная способность:** Один бокс способен обслуживать от 10 до 15 автомобилей в час без задержек.
2. **Экономия на трудозатратах:** Полная автоматизация позволяет работать в режиме 24/7 без постоянного штата операторов и мойщиков.
3. **Безопасность для ЛКП:** Отсутствие механических щеток полностью исключает появление микроцарапин на кузове.
4. **Контроль расхода химии:** Автоматические дозаторы снижают себестоимость одной мойки до минимума.

${secondaryKeywords.length > 0 ? `## Смежные аспекты и важные детали\n` + secondaryKeywords.map(kw => `- **${kw}:** Настройка оптимальных параметров и выбор сертифицированного оборудования.`).join('\n') : ''}

## Окупаемость и финансовая модель
При средней стоимости услуги 350–500 рублей и постоянном потоке автомобилей в спальном районе или на оживленной трассе, окупаемость роботизированного бокса составляет от 12 до 18 месяцев.

## Заключение
Выбор в пользу **«${primaryKeyword}»** — это стратегическое решение, обеспечивающее высокую рентабельность бизнеса и безупречное качество услуги для клиентов.
      `.trim();
    }

    // 2. Construction / Renovation Niche
    if (tLower.includes('ремонт') || tLower.includes('строительст') || tLower.includes('дизайн') || tLower.includes('квартир') || tLower.includes('дом')) {
      return `
# ${topic}

## Введение в концепцию «${primaryKeyword}»
Качественный и продуманный подход к тематике **«${primaryKeyword}»** позволяет создать комфортное, функциональное и эстетичное пространство. В 2026 году ключевым трендом является сочетание экологичных материалов, умных технологий и индивидуального стиля.

## Главные этапы и особенности процесса
- **Планирование и проект:** Разработка детального эскиза с учетом инженерных сетей и эргономики.
- **Подбор материалов:** Использование сертифицированных и долговечных покрытий.
- **Технический контроль:** Строгое соблюдение строительных норм и стандартов безопасности.

## Практические советы экспертов
1. Всегда закладывайте 10-15% запаса бюджета на непредвиденные инженерные работы.
2. Уделяйте особое внимание качеству черновой отделки и электромонтажа.
3. Выбирайте износостойкие покрытия для зон с высокой проходимостью.

## Заключение
Грамотное выполнение работ по направлению **«${primaryKeyword}»** гарантирует долговечный результат и высокий уровень уюта.
      `.trim();
    }

    // 3. Universal Expert Article Template (Focusing strictly on Topic & Keyword)
    return `
# ${topic}

## Введение в тему «${primaryKeyword}»
Тематика **«${primaryKeyword}»** играет важную роль в современном бизнесе и решении повседневных задач. Понимание ключевых механизмов и правильный подход к организации процессов позволяют достигать максимальных результатов при минимальных издержках.

## Основные аспекты и преимущества «${primaryKeyword}»
- **Высокая эффективность:** Оптимизация процессов и использование проверенных методик.
- **Безопасность и надежность:** Соответствие актуальным стандартам и требованиям отрасли.
- **Масштабируемость:** Возможность адаптировать решения под любые задачи.

## Пошаговое руководство по внедрению
1. **Анализ исходной ситуации:** Оценка требований и постановка четких целей.
2. **Выбор оптимального решения:** Сравнение доступных вариантов на рынке.
3. **Реализация и контроль:** Последовательное выполнение этапов и отслеживание ключевых показателей.

${secondaryKeywords.length > 0 ? `## Дополнительные ключевые направления\n` + secondaryKeywords.map(kw => `- **${kw}:** Детальный разбор и интеграция в общую стратегию.`).join('\n') : ''}

## Заключение и выводы
Комплексный подход к **«${primaryKeyword}»** открывает новые возможности для развития и обеспечивает стабильное преимущество.
    `.trim();
  }

  async generateArticleContent(
    topic: string,
    primaryKeyword: string,
    secondaryKeywords: string[] = [],
    contextKnowledge: string = '',
    projectId?: string
  ): Promise<GeneratedArticleResult> {
    // 1. Try to load dynamic encrypted credentials from Database
    const dbAuth = await this.getDecryptedKey(projectId, [
      IntegrationProvider.OPENAI,
      IntegrationProvider.GEMINI,
      IntegrationProvider.ANTHROPIC,
    ]);

    const geminiKey = dbAuth?.provider === IntegrationProvider.GEMINI ? dbAuth.key : process.env.GEMINI_API_KEY;
    const openaiKey = dbAuth?.provider === IntegrationProvider.OPENAI ? dbAuth.key : process.env.OPENAI_API_KEY;
    const claudeKey = dbAuth?.provider === IntegrationProvider.ANTHROPIC ? dbAuth.key : process.env.ANTHROPIC_API_KEY;

    // 2. OpenAI API Call (GPT-4o)
    if (openaiKey) {
      try {
        this.logger.log(`[AI Provider] Executing real OpenAI GPT-4o API call for topic: "${topic}"...`);
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${openaiKey}`,
          },
          body: JSON.stringify({
            model: 'gpt-4o',
            messages: [
              {
                role: 'system',
                content: 'Ты — главный редактор и отраслевой эксперт. Пиши исчерпывающие, экспертные статьи в формате Markdown, строго сфокусированные на заданной теме. Не используй отвлеченных штампов про SEO и мета-теги.',
              },
              {
                role: 'user',
                content: `Напиши экспертную статью на тему "${topic}". Главный ключевой запрос: "${primaryKeyword}". Доп. ключи: ${secondaryKeywords.join(', ')}. Контекст бизнеса: ${contextKnowledge}`,
              },
            ],
            temperature: 0.7,
          }),
        });

        if (response.ok) {
          const data: any = await response.json();
          const text = data?.choices?.[0]?.message?.content;
          if (text) {
            const outline = await this.generateOutline(topic, primaryKeyword);
            return {
              title: topic,
              outline,
              body: text,
              metaTitle: `${topic} — Полный обзор 2026`,
              metaDescription: `Подробный экспертный разбор темы «${primaryKeyword}». Практические рекомендации и советы.`,
              wordCount: text.split(/\s+/).length,
              providerUsed: 'OpenAI GPT-4o (Live)',
            };
          }
        }
      } catch (err: any) {
        this.logger.warn(`[AI Provider] OpenAI API call failed: ${err.message}`);
      }
    }

    // 3. Google Gemini API Call
    if (geminiKey) {
      try {
        this.logger.log(`[AI Provider] Executing real Google Gemini 1.5 Flash API call for topic: "${topic}"...`);
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [
                {
                  parts: [
                    {
                      text: `Ты — отраслевой эксперт. Напиши полноценную подробную статью в формате Markdown строго по теме: "${topic}". Главный ключевой запрос: "${primaryKeyword}". Дополнительные ключи: ${secondaryKeywords.join(', ')}. Контекст: ${contextKnowledge}`,
                    },
                  ],
                },
              ],
            }),
          }
        );

        if (response.ok) {
          const data: any = await response.json();
          const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) {
            const outline = await this.generateOutline(topic, primaryKeyword);
            return {
              title: topic,
              outline,
              body: text,
              metaTitle: `${topic} — Экспертный разбор 2026`,
              metaDescription: `Экспертная статья на тему «${primaryKeyword}». Разбор особенностей, плюсов и практических шагов.`,
              wordCount: text.split(/\s+/).length,
              providerUsed: 'Google Gemini 1.5 Flash (Live)',
            };
          }
        }
      } catch (err: any) {
        this.logger.warn(`[AI Provider] Live Gemini API call failed: ${err.message}`);
      }
    }

    // 4. Anthropic Claude API Call
    if (claudeKey) {
      try {
        this.logger.log(`[AI Provider] Executing real Anthropic Claude API call for topic: "${topic}"...`);
        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': claudeKey,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model: 'claude-3-5-sonnet-20241022',
            max_tokens: 4096,
            messages: [
              {
                role: 'user',
                content: `Напиши полноценную отраслевую статью на тему "${topic}". Ключевые слова: "${primaryKeyword}", ${secondaryKeywords.join(', ')}.`,
              },
            ],
          }),
        });

        if (response.ok) {
          const data: any = await response.json();
          const text = data?.content?.[0]?.text;
          if (text) {
            const outline = await this.generateOutline(topic, primaryKeyword);
            return {
              title: topic,
              outline,
              body: text,
              metaTitle: `${topic} — Полное руководство 2026`,
              metaDescription: `Экспертная статья на тему «${primaryKeyword}».`,
              wordCount: text.split(/\s+/).length,
              providerUsed: 'Anthropic Claude 3.5 Sonnet (Live)',
            };
          }
        }
      } catch (err: any) {
        this.logger.warn(`[AI Provider] Anthropic API call failed: ${err.message}`);
      }
    }

    // 5. Smart Topic-Specific Local Generator
    this.logger.log(`[AI Provider] Generating topic-specific article via smart engine for: "${topic}"...`);
    const outline = await this.generateOutline(topic, primaryKeyword);
    const body = this.buildTopicSpecificContent(topic, primaryKeyword, secondaryKeywords);

    return {
      title: topic,
      outline,
      body,
      metaTitle: `${topic} — Экспертный разбор 2026`,
      metaDescription: `Подробный экспертный разбор темы «${primaryKeyword}». Практические рекомендации и советы.`,
      wordCount: body.split(/\s+/).length,
      providerUsed: 'Smart Local Engine',
    };
  }
}
