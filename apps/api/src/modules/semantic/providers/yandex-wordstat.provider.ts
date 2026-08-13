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
   * Retrieves and decrypts active Yandex Wordstat / XmlStock API key & folderId from database.
   */
  private async getDecryptedIntegration(projectId?: string): Promise<{ apiKey: string; folderId?: string; provider: string } | null> {
    // 1. Try Yandex Wordstat or XmlStock active connection
    let integration = await this.prisma.integrationConnection.findFirst({
      where: {
        provider: {
          in: [IntegrationProvider.YANDEX_WORDSTAT, IntegrationProvider.WORDSTAT, IntegrationProvider.XMLSTOCK],
        },
        isActive: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    // 2. Fallback: check if ANY active connection exists in DB
    if (!integration) {
      integration = await this.prisma.integrationConnection.findFirst({
        where: { isActive: true },
        orderBy: { createdAt: 'desc' },
      });
    }

    if (!integration) {
      this.logger.warn(`[WordstatProvider] No active integration connection found in DB.`);
      return null;
    }

    try {
      const apiKey = this.encryption.decrypt(integration.encryptedKey, integration.iv, integration.authTag);
      const config = (integration.config as any) || {};
      return { apiKey, folderId: config.folderId, provider: integration.provider };
    } catch (err: any) {
      this.logger.error(`[WordstatProvider] Failed to decrypt API key: ${err.message}`);
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
  ): Promise<{ volume: number; topRequests: Array<{ phrase: string; count: number }>; similarRequests: Array<{ phrase: string; count: number }>; rawStatus?: number; rawMessage?: string }> {
    const cleanKey = apiKey.trim();
    const headersList: Array<Record<string, string>> = [];

    // Header option A: Api-Key
    const headersA: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': cleanKey.startsWith('Api-Key ') ? cleanKey : `Api-Key ${cleanKey}`,
    };
    if (folderId) headersA['x-folder-id'] = folderId;
    headersList.push(headersA);

    // Header option B: Bearer
    const headersB: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': cleanKey.startsWith('Bearer ') ? cleanKey : `Bearer ${cleanKey}`,
    };
    if (folderId) headersB['x-folder-id'] = folderId;
    headersList.push(headersB);

    const payload = {
      phrase,
      numPhrases: 50,
      regions: [String(regionId)],  // API требует строку, не число
      devices: ['DEVICE_ALL'],
      ...(folderId ? { folderId } : {}),
    };

    let lastStatus = 0;
    let lastMsg = '';

    for (const headers of headersList) {
      this.logger.log(`[Yandex Wordstat Request] Phrase: "${phrase}", Auth: ${headers['Authorization'].substring(0, 15)}...`);
      try {
        const response = await fetch(this.cloudWordstatUrl, {
          method: 'POST',
          headers,
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(4000),
        });

        const respText = await response.text();
        lastStatus = response.status;
        lastMsg = respText;

        console.log(`[WORDSTAT API] HTTP ${response.status} для фразы "${phrase}": ${respText.substring(0, 400)}`);
        this.logger.log(`[Yandex Wordstat API Response HTTP ${response.status}] ${respText.substring(0, 300)}`);

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

          const exactMatch = topRequests.find((r: any) => r.phrase.toLowerCase() === phrase.toLowerCase());
          const volume = exactMatch ? exactMatch.count : topRequests[0]?.count || 0;

          return { volume, topRequests, similarRequests, rawStatus: response.status, rawMessage: respText };
        }
        // If Yandex API returned HTTP 400, 401, 403, 404 - break immediately, don't waste time trying option B
        if (response.status >= 400 && response.status < 500) {
          break;
        }
      } catch (err: any) {
        lastMsg = err.message;
        console.error(`[WORDSTAT ERROR] Запрос к Yandex Wordstat API завис/упал: ${err.message}`);
        this.logger.error(`[Yandex Search API Wordstat Error] ${err.message}`);
      }
    }

    return { volume: 0, topRequests: [], similarRequests: [], rawStatus: lastStatus, rawMessage: lastMsg };
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

    // 1. Official Yandex Search API Wordstat (v2 / AI Studio) - Parallel execution
    const yandexAuth = await this.getDecryptedIntegration(projectId);
    if (yandexAuth) {
      await Promise.all(
        keywords.map(async (kw) => {
          const res = await this.queryYandexSearchApiWordstat(kw, yandexAuth.apiKey, yandexAuth.folderId, regionId);
          if (res.volume > 0) {
            result[kw] = res.volume;
          } else if (res.topRequests.length > 0) {
            result[kw] = res.topRequests[0].count;
          }
        })
      );
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
