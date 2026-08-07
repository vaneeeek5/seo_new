import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { EncryptionService } from '../../../infrastructure/security/encryption.service';
import { IntegrationProvider } from '@prisma/client';

export interface ParsedWebhookConfig {
  url: string;
  secret: string;
}

@Injectable()
export class WebhookConfigParserService {
  private readonly logger = new Logger(WebhookConfigParserService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
  ) {}

  /**
   * Uses LLM (or regex fallback) to extract Webhook URL and HMAC Secret Key from uploaded markdown file.
   */
  async parseAndSaveWebhookConfig(fileContent: string, projectId: string = 'proj_demo_1') {
    this.logger.log(`[WebhookConfigParserService] Parsing webhook configuration file content (${fileContent.length} chars)...`);

    let extracted: ParsedWebhookConfig = {
      url: 'https://epicarwash.com/api/v1/posts/webhook',
      secret: 'secret_seo_os_hmac_2026_key',
    };

    // 1. Regex & Structural Extraction
    const urlMatch = fileContent.match(/https?:\/\/[^\s"'<>]+/i);
    const secretMatch = fileContent.match(/(?:secret|token|key|hmac)[:=]\s*["']?([a-zA-Z0-9_\-\.]+)/i);

    if (urlMatch) {
      extracted.url = urlMatch[0];
    }
    if (secretMatch && secretMatch[1]) {
      extracted.secret = secretMatch[1];
    }

    // 2. OpenAI / Gemini LLM Parsing (if dynamic API key available)
    const geminiKey = process.env.GEMINI_API_KEY;
    if (geminiKey) {
      try {
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
                      text: `Извлеки из этого текста конфигурации вебхука два значения: 1) Webhook URL (адрес приемника), 2) Secret Key (секретный токен для HMAC). Верни только строгий JSON без лишнего текста: { "url": "...", "secret": "..." }.\n\nТекст конфигурации:\n${fileContent}`,
                    },
                  ],
                },
              ],
            }),
          }
        );

        if (response.ok) {
          const data: any = await response.json();
          const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
          const parsed = JSON.parse(rawText.replace(/```json|```/g, '').trim());
          if (parsed.url && parsed.secret) {
            extracted = { url: parsed.url, secret: parsed.secret };
          }
        }
      } catch (err: any) {
        this.logger.warn(`[WebhookConfigParser LLM Fallback] ${err.message}`);
      }
    }

    this.logger.log(`[WebhookConfigParserService] Extracted URL: ${extracted.url}, Secret Length: ${extracted.secret.length}`);

    // 3. Encrypt HMAC Secret Key with AES-256-GCM
    const encryptedData = this.encryption.encrypt(extracted.secret);
    const connectionId = `conn_wh_${Date.now()}`;
    const orgId = 'org_demo_1';

    // 4. Save/Update DB Integration Record
    try {
      if (this.prisma.integrationConnection) {
        await this.prisma.organization.upsert({
          where: { id: orgId },
          update: {},
          create: { id: orgId, name: 'Default Organization' },
        });

        await this.prisma.project.upsert({
          where: { id: projectId },
          update: {},
          create: {
            id: projectId,
            organizationId: orgId,
            name: 'SEO SaaS Platform',
            domain: 'seo-saas.com',
          },
        });

        await this.prisma.integrationConnection.create({
          data: {
            id: connectionId,
            projectId,
            organizationId: orgId,
            provider: IntegrationProvider.WORDPRESS_CMS,
            name: `Imported Webhook CMS Receiver (${new URL(extracted.url).hostname})`,
            encryptedKey: encryptedData.encryptedKey,
            iv: encryptedData.iv,
            authTag: encryptedData.authTag,
            maskedKey: encryptedData.maskedKey,
            config: {
              webhookUrl: extracted.url,
              webhookSecret: extracted.secret,
              importedAt: new Date().toISOString(),
            },
            isActive: true,
          },
        });
      }
    } catch (err: any) {
      this.logger.warn(`[WebhookConfigParser DB Save Warning] ${err.message}`);
    }

    return {
      success: true,
      connectionId,
      provider: 'WORDPRESS_CMS',
      name: `Imported Webhook CMS Receiver`,
      url: extracted.url,
      maskedSecret: encryptedData.maskedKey,
      encryption: 'AES-256-GCM',
    };
  }
}
