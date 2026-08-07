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
   * Cleans and sanitizes raw text into strict 2-4 word base search masks with zero punctuation.
   */
  private sanitizeMask(raw: string): string | null {
    if (!raw) return null;
    // Strip all punctuation, quotes, brackets, and special symbols
    const clean = raw.toLowerCase().replace(/[.,!?;:"'()\[\]{}–—\-\\\/]+/g, ' ').replace(/\s+/g, ' ').trim();
    const words = clean.split(' ').filter(w => w.length > 0);

    // Strict Gatekeeper Rule: Must be 2-4 words long
    if (words.length >= 2 && words.length <= 4) {
      return words.join(' ');
    }
    return null;
  }

  /**
   * Uses LLM to extract strict 2-4 word base search masks from website content.
   */
  async extractBaseMasksWithAI(textContext: string): Promise<string[]> {
    const geminiKey = process.env.GEMINI_API_KEY;
    const promptText = `Ты должен вернуть только базовые маски. Каждая маска должна состоять строго из 2-4 слов (без предлогов). Никаких знаков препинания, никаких длинных предложений. Верни плоский JSON массив строк, без выдуманной частотности. Пример хороших масок: ['купить kling 3', 'нейросети для фото', 'оплата topaz'].\n\nКонтекст для анализа:\n${textContext.slice(0, 2000)}`;

    if (geminiKey) {
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: promptText }] }],
            }),
          }
        );

        if (response.ok) {
          const data: any = await response.json();
          const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
          const parsed = JSON.parse(rawText.replace(/```json|```/g, '').trim());
          if (Array.isArray(parsed)) {
            const validMasks = parsed
              .map(m => this.sanitizeMask(String(m)))
              .filter((m): m is string => m !== null);
            if (validMasks.length > 0) {
              return Array.from(new Set(validMasks));
            }
          }
        }
      } catch (err: any) {
        this.logger.warn(`[SiteScraper AI Extraction Warning] ${err.message}`);
      }
    }

    // Heuristic Fallback
    const candidateLines = textContext.split('\n');
    const fallbackMasks: string[] = [];
    for (const line of candidateLines) {
      const sanitized = this.sanitizeMask(line);
      if (sanitized) fallbackMasks.push(sanitized);
    }
    return Array.from(new Set(fallbackMasks)).slice(0, 10);
  }

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

    // 3. Extract Headings
    const h1Matches = Array.from(htmlText.matchAll(/<h1[^>]*>([^<]+)<\/h1>/gi)).map(m => m[1].replace(/<[^>]+>/g, '').trim()).filter(Boolean);
    const h2Matches = Array.from(htmlText.matchAll(/<h2[^>]*>([^<]+)<\/h2>/gi)).map(m => m[1].replace(/<[^>]+>/g, '').trim()).filter(Boolean);

    const domainName = cleanUrl.replace(/https?:\/\//, '').replace(/^www\./, '').split('/')[0].split('.')[0].toLowerCase();
    const fullTextContext = (siteTitle + ' ' + metaDescription + ' ' + h1Matches.join(' ') + ' ' + h2Matches.join(' '));

    // Extract strict 2-4 word base masks using AI
    let generatedQueries = await this.extractBaseMasksWithAI(fullTextContext);

    if (generatedQueries.length === 0) {
      if (fullTextContext.includes('мойк') || fullTextContext.includes('автомойк') || domainName.includes('wash')) {
        generatedQueries = [
          'роботизированная автомойка',
          'купить робот мойку',
          'бесконтактная робот мойка',
          'роботизированный моечный комплекс',
        ];
      } else {
        generatedQueries = [`услуги ${domainName}`, `заказать ${domainName}`];
      }
    }

    this.logger.log(`[SiteScraper] Extracted ${generatedQueries.length} strict base seed masks for ${cleanUrl}.`);

    return {
      siteTitle,
      metaDescription,
      h1Headings: h1Matches,
      h2Headings: h2Matches,
      extractedKeywords: generatedQueries,
    };
  }

  /**
   * Generates additional seed variations for Wordstat querying.
   */
  async expandKeywordsDeepAI(baseKeywords: string[], projectId?: string): Promise<string[]> {
    this.logger.log(`[SiteScraper Base Seeds] Clean seed phrases for Wordstat lookup: ${baseKeywords.length} seeds...`);
    const validSeeds: string[] = [];

    for (const seed of baseKeywords) {
      const sanitized = this.sanitizeMask(seed);
      if (sanitized) {
        validSeeds.push(sanitized);
      }
    }

    return Array.from(new Set(validSeeds));
  }
}
