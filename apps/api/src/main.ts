import dns from 'node:dns';
try {
  dns.setDefaultResultOrder('ipv4first');
} catch (_) {}

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

process.on('unhandledRejection', (reason: any) => {
  console.warn('[Process Warning] Unhandled Rejection:', reason?.message || reason);
});

process.on('uncaughtException', (err: any) => {
  console.warn('[Process Warning] Uncaught Exception:', err?.message || err);
});

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);
  
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
  logger.log(`SEO Content Factory API running on 0.0.0.0:${port}`);
  logger.log(`OpenAPI Swagger documentation available at http://0.0.0.0:${port}/api/docs`);
}
bootstrap();
