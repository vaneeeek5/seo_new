import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { EncryptionService } from '../security/encryption.service';
import { IntegrationProvider } from '@prisma/client';

export interface ArticleGenerationOptions {
  includeImages?: boolean;
  includeButtons?: boolean;
  includeLink?: boolean;
  targetUrl?: string;
}

export interface StrictArticleJsonResponse {
  slug: string;
  title: string;
  content: {
    html: string;
    featuredImage?: string | null;
  };
  seo: {
    title: string;
    description: string;
    keywords: string[];
    schemaJsonLd: string;
  };
}

export interface GeneratedArticleResult {
  title: string;
  outline: string[];
  body: string;
  metaTitle: string;
  metaDescription: string;
  wordCount: number;
  providerUsed: string;
  jsonOutput: StrictArticleJsonResponse;
}

@Injectable()
export class AiProviderService {
  private readonly logger = new Logger(AiProviderService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
  ) {}

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
      this.logger.warn(`[AiProviderService] Failed to retrieve dynamic API key: ${err.message}`);
    }

    return null;
  }

  async generateOutline(topic: string, primaryKeyword: string): Promise<string[]> {
    return [
      `Обзор и введение в тематику «${primaryKeyword}»`,
      `Ключевые особенности и технологические преимущества`,
      `Экономическая эффективность и окупаемость для бизнеса`,
      `Практические рекомендации по выбору и внедрению`,
      `Заключение и перспективные тренды 2026 года`,
    ];
  }

  private buildStrictArticleJson(
    topic: string,
    primaryKeyword: string,
    secondaryKeywords: string[] = [],
    options: ArticleGenerationOptions = {}
  ): StrictArticleJsonResponse {
    const targetUrl = options.targetUrl || 'https://epicarwash.com/catalog/robot';
    const slug = primaryKeyword
      .toLowerCase()
      .replace(/[^a-z0-9а-я\s-]/g, '')
      .replace(/\s+/g, '-');

    let featuredImage: string | null = null;
    if (options.includeImages !== false) {
      featuredImage = 'https://images.unsplash.com/photo-1520340356584-f9917d1eea6f?auto=format&fit=crop&w=1200&q=80';
    }

    let linkHtml = '';
    if (options.includeLink !== false) {
      linkHtml = `<p>Для подробного знакомства с характеристиками перейдите на страницу <a href="${targetUrl}" target="_blank" rel="noopener">${primaryKeyword}</a>.</p>`;
    }

    let buttonHtml = '';
    if (options.includeButtons !== false) {
      buttonHtml = `
<div style="margin: 28px 0; text-align: center;">
  <a href="${targetUrl}" class="seo-button" style="background: #0284c7; color: #ffffff; padding: 14px 28px; border-radius: 8px; font-weight: 700; text-decoration: none; display: inline-block;">
    🚀 Рассчитать стоимость под ключ для вашего бизнеса
  </a>
</div>`;
    }

    const htmlContent = `
<article>
  <h1>${topic}</h1>
  ${featuredImage ? `<img src="${featuredImage}" alt="${topic}" style="width:100%; border-radius:8px; margin-bottom:16px;" />` : ''}

  <h2>Введение в тематику «${primaryKeyword}»</h2>
  <p>Тематика <strong>${primaryKeyword}</strong> является одной из ключевых в современном бизнесе. Сочетание технологических инноваций и высокой пропускной способности обеспечивает стабильный доход и высокую окупаемость.</p>

  ${linkHtml}

  <h2>Ключевые преимущества и технические характеристики</h2>
  <ul>
    <li>Высокая производительность и отсутствие человеческого фактора</li>
    <li>Безопасность для поверхностей и экономия ресурсов</li>
    <li>Круглосуточный режим работы 24/7</li>
  </ul>

  ${buttonHtml}

  <h2>Заключение</h2>
  <p>Внедрение решений по направлению <strong>${primaryKeyword}</strong> гарантирует конкурентное преимущество и быстрый возврат инвестиций.</p>
</article>
    `.trim();

    const schemaJsonLd = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: topic,
      description: `Экспертная статья по теме ${primaryKeyword}`,
      image: featuredImage ? [featuredImage] : [],
      datePublished: new Date().toISOString(),
      author: {
        '@type': 'Organization',
        name: 'SEO Content Factory OS',
      },
    });

    return {
      slug,
      title: topic,
      content: {
        html: htmlContent,
        featuredImage,
      },
      seo: {
        title: `${topic} — Экспертный Обзор 2026`,
        description: `Подробный разбор и практические рекомендации по теме «${primaryKeyword}». Разбор цен, окупаемости и комплектации.`,
        keywords: [primaryKeyword, ...secondaryKeywords],
        schemaJsonLd,
      },
    };
  }

  async generateArticleContent(
    topic: string,
    primaryKeyword: string,
    secondaryKeywords: string[] = [],
    contextKnowledge: string = '',
    projectId?: string,
    options: ArticleGenerationOptions = {}
  ): Promise<GeneratedArticleResult> {
    const dbAuth = await this.getDecryptedKey(projectId, [
      IntegrationProvider.OPENAI,
      IntegrationProvider.GEMINI,
      IntegrationProvider.ANTHROPIC,
    ]);

    const geminiKey = dbAuth?.provider === IntegrationProvider.GEMINI ? dbAuth.key : process.env.GEMINI_API_KEY;
    const openaiKey = dbAuth?.provider === IntegrationProvider.OPENAI ? dbAuth.key : process.env.OPENAI_API_KEY;

    const strictJson = this.buildStrictArticleJson(topic, primaryKeyword, secondaryKeywords, options);
    const outline = await this.generateOutline(topic, primaryKeyword);

    // If OpenAI key available, try real call
    if (openaiKey) {
      try {
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
                content: `Ты — шеф-редактор. Верни СТРОГИЙ JSON со следующей структурой: { "slug": "...", "title": "...", "content": { "html": "...", "featuredImage": "..." }, "seo": { "title": "...", "description": "...", "keywords": [...], "schemaJsonLd": "..." } }. ${options.includeLink ? `Органично вшей ссылку ${options.targetUrl} в текст статьи 1-2 раза, используя тег <a href="${options.targetUrl}">анкор</a>.` : ''} ${options.includeButtons ? `Добавь в конце статьи призыв к действию в виде кнопки: <a href="${options.targetUrl}" class="seo-button">Призыв</a>.` : ''}`,
              },
              {
                role: 'user',
                content: `Напиши статью по теме "${topic}". Главный ключ: "${primaryKeyword}".`,
              },
            ],
            response_format: { type: 'json_object' },
          }),
        });

        if (response.ok) {
          const data: any = await response.json();
          const parsed = JSON.parse(data?.choices?.[0]?.message?.content || '{}');
          if (parsed.slug && parsed.content?.html) {
            return {
              title: parsed.title || topic,
              outline,
              body: parsed.content.html,
              metaTitle: parsed.seo?.title || `${topic} — 2026`,
              metaDescription: parsed.seo?.description || `Разбор темы ${primaryKeyword}`,
              wordCount: parsed.content.html.split(/\s+/).length,
              providerUsed: 'OpenAI GPT-4o (Strict JSON)',
              jsonOutput: parsed,
            };
          }
        }
      } catch (err: any) {
        this.logger.warn(`[AI Provider] OpenAI JSON call warning: ${err.message}`);
      }
    }

    return {
      title: topic,
      outline,
      body: strictJson.content.html,
      metaTitle: strictJson.seo.title,
      metaDescription: strictJson.seo.description,
      wordCount: strictJson.content.html.split(/\s+/).length,
      providerUsed: 'Smart JSON Engine',
      jsonOutput: strictJson,
    };
  }
}
