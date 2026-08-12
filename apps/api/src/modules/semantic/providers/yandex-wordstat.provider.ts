import { Injectable, Logger } from '@nestjs/common';
import { ISemanticProvider } from './semantic-provider.interface';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { EncryptionService } from '../../../infrastructure/security/encryption.service';
import { XmlStockProvider } from './xmlstock.provider';
import { IntegrationProvider } from '@prisma/client';

export interface WordstatParsedResult {
  leftColumnSubQueries: string[];
  rightColumnSimilarQueries: string[];
  allPhrases: string[];
}

@Injectable()
export class YandexWordstatProvider implements ISemanticProvider {
  private readonly logger = new Logger(YandexWordstatProvider.name);
  private readonly yandexApiUrl = 'https://api.direct.yandex.ru/v5/wordstat';

  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
    private readonly xmlStockProvider: XmlStockProvider,
  ) {}

  /**
   * Retrieves and decrypts Yandex Wordstat API key from database for given projectId.
   */
  private async getDecryptedApiKey(projectId?: string): Promise<string | null> {
    if (!projectId) return null;

    const integration = await this.prisma.integrationConnection.findFirst({
      where: {
        projectId,
        provider: {
          in: [IntegrationProvider.YANDEX_WORDSTAT, IntegrationProvider.WORDSTAT],
        },
        isActive: true,
      },
    });

    if (!integration) return null;

    try {
      return this.encryption.decrypt(integration.encryptedKey, integration.iv, integration.authTag);
    } catch (err: any) {
      this.logger.error(`[WordstatProvider] Failed to decrypt Yandex API key: ${err.message}`);
      return null;
    }
  }

  /**
   * Retrieves Left and Right columns from Wordstat API.
   */
  async getSimilarKeywordsWithColumns(baseKeyword: string, projectId?: string, regionId: number = 225): Promise<WordstatParsedResult> {
    this.logger.log(`[WordstatProvider API] Fetching Left & Right column queries for "${baseKeyword}"...`);

    // 1. XmlStock connection
    try {
      const xmlConn = await this.prisma.integrationConnection.findFirst({
        where: {
          projectId,
          provider: IntegrationProvider.XMLSTOCK,
          isActive: true,
        },
      });

      if (xmlConn) {
        const decryptedKey = this.encryption.decrypt(xmlConn.encryptedKey, xmlConn.iv, xmlConn.authTag);
        const config = (xmlConn.config as any) || {};
        const xmlStockData = await this.xmlStockProvider.getWordstatData(
          baseKeyword,
          { userId: config.userId || '', key: decryptedKey, ...config },
          regionId
        );

        return {
          leftColumnSubQueries: xmlStockData.leftColumnSubQueries || [],
          rightColumnSimilarQueries: xmlStockData.rightColumnSimilarQueries || [],
          allPhrases: Array.from(new Set([...(xmlStockData.leftColumnSubQueries || []), ...(xmlStockData.rightColumnSimilarQueries || [])])),
        };
      }
    } catch (err: any) {
      this.logger.warn(`[WordstatProvider XmlStock Column Lookup] ${err.message}`);
    }

    // 2. Direct Yandex Wordstat API
    const apiKey = await this.getDecryptedApiKey(projectId);
    const leftColumn: string[] = [];
    const rightColumn: string[] = [];

    if (apiKey) {
      try {
        const response = await fetch(`${this.yandexApiUrl}/GetTop`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            Phrases: [baseKeyword],
            GeoId: regionId ? [regionId] : undefined,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          if (data?.result?.SearchesWithWords) {
            data.result.SearchesWithWords.forEach((p: any) => leftColumn.push(p.Phrase));
          }
          if (data?.result?.SearchesWithSimilarWords) {
            data.result.SearchesWithSimilarWords.forEach((p: any) => rightColumn.push(p.Phrase));
          }
        }
      } catch (error: any) {
        this.logger.error(`[Yandex API Error] Failed GetTop query for "${baseKeyword}": ${error.message}`);
      }
    }

    return {
      leftColumnSubQueries: leftColumn,
      rightColumnSimilarQueries: rightColumn,
      allPhrases: Array.from(new Set([...leftColumn, ...rightColumn])),
    };
  }

  async getSimilarKeywords(baseKeyword: string, projectId?: string, regionId?: number): Promise<string[]> {
    const result = await this.getSimilarKeywordsWithColumns(baseKeyword, projectId, regionId);
    return result.allPhrases;
  }

  /**
   * Retrieves exact monthly search volume (shows/month) from Wordstat / XmlStock API for user keywords.
   * ABSOLUTELY NO FAKE RANDOM NUMBERS. If key is missing or phrase has 0 shows, returns 0.
   */
  async getSearchVolume(keywords: string[], projectId?: string, regionId: number = 225): Promise<Record<string, number>> {
    const result: Record<string, number> = {};
    if (!keywords || keywords.length === 0) return result;

    // Initialize all keywords with 0 volume
    for (const kw of keywords) {
      result[kw] = 0;
    }

    // 1. XmlStock API Volume Lookup
    try {
      const xmlConn = await this.prisma.integrationConnection.findFirst({
        where: {
          projectId,
          provider: IntegrationProvider.XMLSTOCK,
          isActive: true,
        },
      });

      if (xmlConn) {
        const decryptedKey = this.encryption.decrypt(xmlConn.encryptedKey, xmlConn.iv, xmlConn.authTag);
        const config = (xmlConn.config as any) || {};

        for (const kw of keywords) {
          const xmlData = await this.xmlStockProvider.getWordstatData(
            kw,
            { userId: config.userId || '', key: decryptedKey, ...config },
            regionId
          );
          result[kw] = (xmlData.volume && xmlData.volume > 0) ? xmlData.volume : 0;
        }
        return result;
      }
    } catch (err: any) {
      this.logger.warn(`[WordstatProvider XmlStock Volume Lookup] ${err.message}`);
    }

    // 2. Yandex Wordstat Direct API GetDynamics Call
    const apiKey = await this.getDecryptedApiKey(projectId);
    if (apiKey) {
      try {
        const response = await fetch(`${this.yandexApiUrl}/GetDynamics`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            Phrases: keywords,
            GeoId: regionId ? [regionId] : undefined,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          if (data?.result?.Phrases) {
            for (const item of data.result.Phrases) {
              result[item.Phrase] = item.Shows || 0;
            }
          }
        }
      } catch (error: any) {
        this.logger.error(`[Yandex API Error] Failed GetDynamics query: ${error.message}`);
      }
    }

    return result;
  }
}
