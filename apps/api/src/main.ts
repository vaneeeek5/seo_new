import dns from 'node:dns';
try {
  dns.setDefaultResultOrder('ipv4first');
} catch (_) {}

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

process.on('unhandledRejection', (reason: any) => {
  console.error('[FATAL] Unhandled Rejection:', reason?.message || reason, reason?.stack);
});

process.on('uncaughtException', (err: any) => {
  console.error('[FATAL] Uncaught Exception:', err?.message || err, err?.stack);
});

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  console.log('[Bootstrap] Starting NestJS application...');

  let app: any;
  try {
    app = await NestFactory.create(AppModule, {
      logger: ['log', 'warn', 'error', 'debug'],
    });
    console.log('[Bootstrap] AppModule created successfully');
  } catch (err: any) {
    console.error('[Bootstrap FATAL] Failed to create AppModule:', err.message, err.stack);
    process.exit(1);
  }
  
  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
  });

  // Configure OpenAPI Swagger Documentation
  const config = new DocumentBuilder()
    .setTitle('SEO Content Factory OS API')
    .setDescription('Multi-Agent Autonomous SaaS Platform Architecture (CQRS + DDD + Event-Driven)')
    .setVersion('1.0')
    .addTag('projects', 'Project Management Bounded Context')
    .addTag('semantics', 'Semantic Collection & Clustering Engine')
    .addTag('content', 'Multi-Stage AI Content Generation Engine')
    .addTag('knowledge', 'RAG Brand Knowledge Store Engine')
    .addTag('decision', 'Autonomous SEO Decision Engine')
    .addTag('publishers', 'CMS Auto-Publishing Engine')
    .addTag('analytics', 'Organic Search Analytics Engine')
    .addTag('health', 'System Health & Resource Monitoring')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 4000;
  await app.listen(port, '0.0.0.0');
  console.log(`[Bootstrap] ✅ SEO Content Factory API started on 0.0.0.0:${port}`);
  logger.log(`OpenAPI Swagger: http://0.0.0.0:${port}/api/docs`);
}
bootstrap().catch((err) => {
  console.error('[Bootstrap FATAL] bootstrap() threw:', err?.message, err?.stack);
  process.exit(1);
});

