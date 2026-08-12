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

  // Official Endpoints for Yandex AI Studio / Yandex Cloud Search API Wordstat
  private readonly cloudWordstatUrl = 'https://searchapi.api.cloud.yandex.net/v2/wordstat/topRequests';
  private readonly legacyWordstatUrl = 'https://api.wordstat.yandex.net/v1/topRequests';

  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
    private readonly xmlStockProvider: XmlStockProvider,
  ) {}

  /**
   * Retrieves and decrypts Yandex Wordstat API key & folderId from database.
   */
  private async getDecryptedIntegration(projectId?: string): Promise<{ apiKey: string; folderId?: string; provider: string } | null> {
    const integration = await this.prisma.integrationConnection.findFirst({
      where: {
        provider: {
          in: [IntegrationProvider.YANDEX_WORDSTAT, IntegrationProvider.WORDSTAT],
        },
        isActive: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!integration) {
      this.logger.warn(`[WordstatProvider] No active Yandex Wordstat integration connection found in DB.`);
      return null;
    }

    try {
      const apiKey = this.encryption.decrypt(integration.encryptedKey, integration.iv, integration.authTag);
      const config = (integration.config as any) || {};
      return { apiKey, folderId: config.folderId, provider: integration.provider };
    } catch (err: any) {
      this.logger.error(`[WordstatProvider] Failed to decrypt Yandex API key: ${err.message}`);
      return null;
    }
  }

  /**
   * Official Yandex Search API Wordstat (v2 / AI Studio) Query Execution
   */
  private async queryYandexSearchApiWordstat(
    phrase: string,
    apiKey: string,
    folderId?: string,
    regionId: number = 225
  ): Promise<{ volume: number; topRequests: Array<{ phrase: string; count: number }>; similarRequests: Array<{ phrase: string; count: number }> }> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (apiKey.startsWith('AQVN') || apiKey.startsWith('t1.')) {
      headers['Authorization'] = `Bearer ${apiKey}`;
    } else {
      headers['Authorization'] = `Api-Key ${apiKey}`;
    }

    if (folderId) {
      headers['x-folder-id'] = folderId;
    }

    const payload = {
      phrase,
      numPhrases: 50,
      regions: [regionId],
      devices: ['DEVICE_ALL'],
      ...(folderId ? { folderId } : {}),
    };

    this.logger.log(`[Yandex Wordstat Request] Phrase: "${phrase}", Auth: ${headers['Authorization'] ? 'Present' : 'Missing'}, FolderId: ${folderId || 'None'}`);

    try {
      // 1. Try Yandex Cloud Search API v2 Wordstat Endpoint
      let response = await fetch(this.cloudWordstatUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      // 2. Fallback to Legacy Wordstat API v1 Endpoint
      if (!response.ok) {
        response = await fetch(this.legacyWordstatUrl, {
          method: 'POST',
          headers,
          body: JSON.stringify({ phrase, numPhrases: 50, regions: [regionId] }),
        });
      }

      const respText = await response.text();
      this.logger.log(`[Yandex Wordstat API Response Code ${response.status}] Content: ${respText.substring(0, 300)}`);

      if (response.ok) {
        let data: any = {};
        try { data = JSON.parse(respText); } catch (_) {}

        const topRequests = (data.topRequests || []).map((item: any) => ({
          phrase: item.phrase || item.Phrase || '',
          count: Number(item.count || item.Shows || item.shows || 0),
        }));

        const similarRequests = (data.similarRequests || []).map((item: any) => ({
          phrase: item.phrase || item.Phrase || '',
          count: Number(item.count || item.Shows || item.shows || 0),
        }));

        // Find exact match or first top request count
        const exactMatch = topRequests.find((r: any) => r.phrase.toLowerCase() === phrase.toLowerCase());
        const volume = exactMatch ? exactMatch.count : topRequests[0]?.count || 0;

        return { volume, topRequests, similarRequests };
      }
    } catch (err: any) {
      this.logger.error(`[Yandex Search API Wordstat Error] ${err.message}`);
    }

    return { volume: 0, topRequests: [], similarRequests: [] };
  }

  /**
   * Retrieves Left and Right columns from Yandex Search API Wordstat.
   */
  async getSimilarKeywordsWithColumns(baseKeyword: string, projectId?: string, regionId: number = 225): Promise<WordstatParsedResult> {
    this.logger.log(`[WordstatProvider API] Fetching Wordstat data for "${baseKeyword}" (Region: ${regionId})...`);

    // 1. Yandex Search API Wordstat (v2 / AI Studio)
    const yandexAuth = await this.getDecryptedIntegration(projectId);
    if (yandexAuth) {
      const res = await this.queryYandexSearchApiWordstat(baseKeyword, yandexAuth.apiKey, yandexAuth.folderId, regionId);
      if (res.topRequests.length > 0 || res.similarRequests.length > 0) {
        const leftColumn = res.topRequests.map(r => r.phrase);
        const rightColumn = res.similarRequests.map(r => r.phrase);
        return {
          leftColumnSubQueries: leftColumn,
          rightColumnSimilarQueries: rightColumn,
          allPhrases: Array.from(new Set([...leftColumn, ...rightColumn])),
        };
      }
    }

    // 2. XmlStock connection fallback
    try {
      const xmlConn = await this.prisma.integrationConnection.findFirst({
        where: {
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

    return {
      leftColumnSubQueries: [],
      rightColumnSimilarQueries: [],
      allPhrases: [],
    };
  }

  async getSimilarKeywords(baseKeyword: string, projectId?: string, regionId?: number): Promise<string[]> {
    const result = await this.getSimilarKeywordsWithColumns(baseKeyword, projectId, regionId);
    return result.allPhrases;
  }

  /**
   * Retrieves exact monthly search volume (shows/month) from Yandex Search API Wordstat.
   */
  async getSearchVolume(keywords: string[], projectId?: string, regionId: number = 225): Promise<Record<string, number>> {
    const result: Record<string, number> = {};
    if (!keywords || keywords.length === 0) return result;

    // 1. Official Yandex Search API Wordstat (v2 / AI Studio)
    const yandexAuth = await this.getDecryptedIntegration(projectId);
    if (yandexAuth) {
      for (const kw of keywords) {
        const res = await this.queryYandexSearchApiWordstat(kw, yandexAuth.apiKey, yandexAuth.folderId, regionId);
        if (res.volume > 0) {
          result[kw] = res.volume;
        } else if (res.topRequests.length > 0) {
          result[kw] = res.topRequests[0].count;
        }
      }
    }

    // 2. XmlStock API Volume Lookup (if active XmlStock connection exists)
    try {
      const xmlConn = await this.prisma.integrationConnection.findFirst({
        where: {
          provider: IntegrationProvider.XMLSTOCK,
          isActive: true,
        },
      });

      if (xmlConn) {
        const decryptedKey = this.encryption.decrypt(xmlConn.encryptedKey, xmlConn.iv, xmlConn.authTag);
        const config = (xmlConn.config as any) || {};

        for (const kw of keywords) {
          if (!result[kw] || result[kw] === 0) {
            const xmlData = await this.xmlStockProvider.getWordstatData(
              kw,
              { userId: config.userId || '', key: decryptedKey, ...config },
              regionId
            );
            if (xmlData.volume && xmlData.volume > 0) {
              result[kw] = xmlData.volume;
            }
          }
        }
      }
    } catch (err: any) {
      this.logger.warn(`[WordstatProvider XmlStock Volume Lookup] ${err.message}`);
    }

    // Return exact volumes found (or 0 if missing/unauthorized)
    for (const kw of keywords) {
      if (typeof result[kw] !== 'number') {
        result[kw] = 0;
      }
    }

    return result;
  }
}
