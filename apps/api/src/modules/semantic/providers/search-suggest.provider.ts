import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class SearchSuggestProvider {
  private readonly logger = new Logger(SearchSuggestProvider.name);

  /**
   * Fetches search suggestions from Yandex Suggest open endpoint.
   */
  async fetchYandexSuggests(query: string): Promise<string[]> {
    try {
      const url = `https://suggest.yandex.ru/suggest-ya.cgi?part=${encodeURIComponent(query)}&v=4&uil=ru`;
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
        signal: AbortSignal.timeout(4000),
      });

      if (res.ok) {
        const data = await res.json();
        // Yandex suggest-ya returns array format [query, [suggest1, suggest2, ...]]
        if (Array.isArray(data) && Array.isArray(data[1])) {
          return data[1].map((item: any) => (typeof item === 'string' ? item : item[0])).filter(Boolean);
        }
      }
    } catch (err: any) {
      this.logger.debug(`[YandexSuggest] Fetch error for "${query}": ${err.message}`);
    }
    return [];
  }

  /**
   * Fetches search suggestions from Google Suggest open endpoint.
   */
  async fetchGoogleSuggests(query: string): Promise<string[]> {
    try {
      const url = `https://suggestqueries.google.com/complete/search?client=chrome&hl=ru&q=${encodeURIComponent(query)}`;
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
        signal: AbortSignal.timeout(4000),
      });

      if (res.ok) {
        const data = await res.json();
        // Google suggest returns [query, [suggest1, suggest2, ...]]
        if (Array.isArray(data) && Array.isArray(data[1])) {
          return data[1].filter((s: any) => typeof s === 'string');
        }
      }
    } catch (err: any) {
      this.logger.debug(`[GoogleSuggest] Fetch error for "${query}": ${err.message}`);
    }
    return [];
  }

  /**
   * Sweeps Russian alphabet & Latin modifiers to extract long-tail search suggests.
   */
  async collectLongTailSuggests(seeds: string[]): Promise<string[]> {
    this.logger.log(`[SearchSuggestProvider] Mining long-tail search suggests for ${seeds.length} seeds...`);
    const suggestPool = new Set<string>();

    const alphabetRu = ['а', 'б', 'в', 'г', 'д', 'е', 'и', 'к', 'м', 'н', 'п', 'р', 'с', 'т', 'ц', 'ч'];

    for (const seed of seeds.slice(0, 4)) {
      // 1. Direct Suggest
      const [yaDirect, gooDirect] = await Promise.all([
        this.fetchYandexSuggests(seed),
        this.fetchGoogleSuggests(seed),
      ]);

      yaDirect.forEach(s => suggestPool.add(s.toLowerCase().trim()));
      gooDirect.forEach(s => suggestPool.add(s.toLowerCase().trim()));

      // 2. Alphabet Sweep (sample 4 key letters for fast execution)
      const sampledLetters = alphabetRu.slice(0, 4);
      for (const char of sampledLetters) {
        const queryWithChar = `${seed} ${char}`;
        const [yaChar, gooChar] = await Promise.all([
          this.fetchYandexSuggests(queryWithChar),
          this.fetchGoogleSuggests(queryWithChar),
        ]);

        yaChar.forEach(s => suggestPool.add(s.toLowerCase().trim()));
        gooChar.forEach(s => suggestPool.add(s.toLowerCase().trim()));
      }
    }

    // Add high quality long-tail fallbacks if network suggest is limited
    if (suggestPool.size < 10) {
      seeds.forEach(s => {
        suggestPool.add(`${s} купить в москве`);
        suggestPool.add(`${s} отзывы владельцев 2026`);
        suggestPool.add(`${s} стоимость под ключ`);
        suggestPool.add(`${s} как выбрать оборудование`);
      });
    }

    const result = Array.from(suggestPool);
    this.logger.log(`[SearchSuggestProvider] Mined ${result.length} unique long-tail suggests.`);
    return result;
  }
}
