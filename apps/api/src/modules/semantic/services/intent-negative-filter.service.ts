import { Injectable, Logger } from '@nestjs/common';
import { KeywordIntent } from '@prisma/client';

export interface ClassifiedKeyword {
  phrase: string;
  intent: KeywordIntent;
}

@Injectable()
export class IntentNegativeFilterService {
  private readonly logger = new Logger(IntentNegativeFilterService.name);

  // Standard Dictionary of Minus-words (Мусорные / Hерелевантные запросы)
  private readonly negativeWords = [
    'скачать',
    'бесплатно',
    'б/у',
    'бу',
    'вакансии',
    'работа',
    'торрент',
    'своими руками',
    'форум',
    'авито',
    'порно',
    'секс',
    'слив',
    'кряк',
    'crack',
    'гдз',
    'реферат',
    'взлом',
  ];

  // Intent Detection Markers
  private readonly commercialMarkers = [
    'купить',
    'цена',
    'стоимость',
    'заказать',
    'под ключ',
    'продажа',
    'прайс',
    'магазин',
    'расчет',
    'окупаемость',
    'недорого',
    'производитель',
    'дилер',
    'каталог',
    'расценка',
    'руб',
    'оборудование',
    'франшиза',
  ];

  private readonly navigationalMarkers = [
    'официальный сайт',
    'вход',
    'кабинет',
    'контакты',
    'адрес',
    'телефон',
    'где находится',
    'личный кабинет',
    'карта проезда',
    'график работы',
  ];

  /**
   * Filters out phrases containing negative minus-words.
   */
  filterNegativeWords(phrases: string[]): string[] {
    const cleanList: string[] = [];

    for (const phrase of phrases) {
      const lower = phrase.toLowerCase();
      const hasNegative = this.negativeWords.some(neg => {
        // Exact word boundary or contained phrase match
        const regex = new RegExp(`(?:^|\\s)${neg}(?:$|\\s)`, 'i');
        return regex.test(lower) || lower.includes(` ${neg}`) || lower.includes(`${neg} `);
      });

      if (!hasNegative) {
        cleanList.push(phrase);
      } else {
        this.logger.debug(`[NegativeFilter] Filtered out minus-word phrase: "${phrase}"`);
      }
    }

    this.logger.log(`[IntentNegativeFilter] Cleaned ${phrases.length - cleanList.length} minus-word phrases. Remaining: ${cleanList.length}.`);
    return cleanList;
  }

  /**
   * Classifies a phrase into COMMERCIAL, INFORMATIONAL, or NAVIGATIONAL intent.
   */
  classifyIntent(phrase: string): KeywordIntent {
    const lower = phrase.toLowerCase();

    // 1. Check Navigational
    if (this.navigationalMarkers.some(m => lower.includes(m))) {
      return KeywordIntent.NAVIGATIONAL;
    }

    // 2. Check Commercial
    if (this.commercialMarkers.some(m => lower.includes(m))) {
      return KeywordIntent.COMMERCIAL;
    }

    // 3. Default: Informational
    return KeywordIntent.INFORMATIONAL;
  }

  /**
   * Batch classifies phrases into structured ClassifiedKeyword objects.
   */
  batchClassify(phrases: string[]): ClassifiedKeyword[] {
    return phrases.map(phrase => ({
      phrase,
      intent: this.classifyIntent(phrase),
    }));
  }
}
