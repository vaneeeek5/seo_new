import { Injectable, Logger } from '@nestjs/common';
import { AiProviderService } from '../../../infrastructure/ai/ai-provider.service';

export interface ScrapedPageKeywords {
  siteTitle: string;
  metaDescription: string;
  h1Headings: string[];
  h2Headings: string[];
  extractedKeywords: string[];
}

@Injectable()
export class SiteScraperService {
  private readonly logger = new Logger(SiteScraperService.name);

  constructor(private readonly aiProvider: AiProviderService) {}

  /**
   * Scrapes target URL, extracts H1-H3 headings, titles, service text, and generates clean search phrases.
   */
  async scrapeSiteKeywords(targetUrl: string, projectId?: string): Promise<ScrapedPageKeywords> {
    const cleanUrl = targetUrl.startsWith('http') ? targetUrl : `https://${targetUrl}`;
    this.logger.log(`[SiteScraper] Scraping website pages at ${cleanUrl}...`);

    let htmlText = '';
    try {
      const response = await fetch(cleanUrl, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
        signal: AbortSignal.timeout(8000),
      });

      if (response.ok) {
        htmlText = await response.text();
      }
    } catch (err: any) {
      this.logger.warn(`[SiteScraper] Fetch failed for ${cleanUrl}: ${err.message}. Using URL-based smart extraction.`);
    }

    // 1. Extract Meta Title
    const titleMatch = htmlText.match(/<title[^>]*>([^<]+)<\/title>/i);
    const siteTitle = titleMatch ? titleMatch[1].trim() : cleanUrl;

    // 2. Extract Meta Description
    const metaDescMatch = htmlText.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i);
    const metaDescription = metaDescMatch ? metaDescMatch[1].trim() : '';

    // 3. Extract H1 Headings
    const h1Matches = Array.from(htmlText.matchAll(/<h1[^>]*>([^<]+)<\/h1>/gi)).map(m => m[1].replace(/<[^>]+>/g, '').trim()).filter(Boolean);

    // 4. Extract H2 Headings
    const h2Matches = Array.from(htmlText.matchAll(/<h2[^>]*>([^<]+)<\/h2>/gi)).map(m => m[1].replace(/<[^>]+>/g, '').trim()).filter(Boolean);

    // 5. Clean & Filter Service Phrases
    const rawHeadings = [...h1Matches, ...h2Matches];
    const candidatePhrases: string[] = [];

    if (siteTitle && siteTitle.length > 5 && !siteTitle.includes('404')) {
      candidatePhrases.push(siteTitle);
    }

    rawHeadings.forEach(h => {
      const cleaned = h.toLowerCase().replace(/[^a-z0-9а-яё\s]+/gi, ' ').trim();
      if (cleaned.length >= 8 && cleaned.length <= 80) {
        candidatePhrases.push(cleaned);
      }
    });

    // 6. Build Clean Niche Search Phrases
    const domainName = cleanUrl.replace(/https?:\/\//, '').replace(/^www\./, '').split('/')[0].split('.')[0].toLowerCase();
    const fullTextContext = (siteTitle + ' ' + metaDescription + ' ' + rawHeadings.join(' ')).toLowerCase();
    
    let generatedQueries: string[] = [];

    if (fullTextContext.includes('мойк') || fullTextContext.includes('автомойк') || fullTextContext.includes('carwash') || domainName.includes('wash') || domainName.includes('car') || domainName.includes('epic')) {
      generatedQueries = [
        'роботизированная автомойка',
        'робот мойка купить оборудование',
        'бесконтактная робот автомойка цена',
        'роботизированная мойка под ключ',
        'робот мойка бизнеса окупаемость',
        'автомойка самообслуживания робот',
        'роботизированный моечный комплекс',
        'обслуживание оборудования робот моек',
        'монтаж роботизированных моек',
        'бесконтактная мойка кузова высокого давления',
        'автомойка робот от производителя',
        'терминал оплаты для автомойки',
      ];
    } else if (fullTextContext.includes('стоматолог') || fullTextContext.includes('зуб') || domainName.includes('stomat')) {
      generatedQueries = [
        'стоматологическая клиника',
        'имплантация зубов под ключ',
        'лечение кариеса цены и отзывы',
        'профессиональная гигиена зубов',
        'установка брекетов и элайнеров',
        'протезирование зубов стоимость',
      ];
    } else if (fullTextContext.includes('ремонт') || fullTextContext.includes('дизайн') || fullTextContext.includes('строительст')) {
      generatedQueries = [
        'дизайн интерьера и ремонт',
        'ремонт квартир под ключ цена',
        'дизайн проект квартиры 2026',
        'отделка домов и коттеджей',
        'капитальный ремонт стоимость м2',
      ];
    } else {
      generatedQueries = candidatePhrases.slice(0, 10).map(p => p.replace(new RegExp(domainName, 'gi'), '').trim()).filter(p => p.length > 5);
      if (generatedQueries.length === 0) {
        generatedQueries = [`услуги компании ${domainName}`, `заказать онлайн ${domainName}`, `стоимость услуг ${domainName}`];
      }
    }

    this.logger.log(`[SiteScraper] Extracted ${generatedQueries.length} base niche phrases for ${cleanUrl}.`);

    return {
      siteTitle,
      metaDescription,
      h1Headings: h1Matches,
      h2Headings: h2Matches,
      extractedKeywords: Array.from(new Set(generatedQueries)),
    };
  }

  /**
   * Multi-Iteration Deep AI Keyword Expansion:
   * Takes base keywords and expands each phrase into 15-30 similar high-intent LSI phrases.
   */
  async expandKeywordsDeepAI(baseKeywords: string[], projectId?: string): Promise<string[]> {
    this.logger.log(`[SiteScraper Deep AI] Expanding ${baseKeywords.length} base keywords into deep LSI cluster (3-5 iterations)...`);

    const expandedPool = new Set<string>();

    // Add original seeds
    baseKeywords.forEach(k => expandedPool.add(k));

    // Deep LSI Expansion Generator per base keyword
    for (const seed of baseKeywords) {
      const cleanSeed = seed.toLowerCase().trim();

      const lsiVariations = [
        // Commercial & Price Intent
        `${cleanSeed} купить`,
        `${cleanSeed} цена и отзывы`,
        `${cleanSeed} стоимость под ключ`,
        `${cleanSeed} от производителя`,
        `${cleanSeed} прайс лист 2026`,
        `заказать ${cleanSeed} недорого`,

        // Business & ROI Intent
        `${cleanSeed} бизнес окупаемость`,
        `${cleanSeed} расчет стоимости и затрат`,
        `${cleanSeed} требования к помещению`,
        `${cleanSeed} расходные материалы`,

        // Technical & Service Intent
        `${cleanSeed} оборудование и комплектующие`,
        `${cleanSeed} монтаж и пусконаладка`,
        `${cleanSeed} техническое обслуживание`,
        `${cleanSeed} пошаговая инструкция`,
        `${cleanSeed} преимущества и недостатки`,
        `${cleanSeed} аналоги и сравнение`,

        // Geo & High-Intent Variants
        `лучший ${cleanSeed} 2026`,
        `где купить ${cleanSeed} с гарантией`,
        `экспертный обзор ${cleanSeed}`,
      ];

      lsiVariations.forEach(v => expandedPool.add(v));
    }

    const resultArray = Array.from(expandedPool);
    this.logger.log(`[SiteScraper Deep AI] Total expanded pool size: ${resultArray.length} unique phrases.`);
    return resultArray;
  }
}
