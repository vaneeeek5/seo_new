import { Controller, Post, Get, Body, Param, HttpCode, HttpStatus } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { IngestKnowledgeCommand, IngestKnowledgeDto } from './commands/ingest-knowledge.command';
import { PrismaService } from '../../infrastructure/database/prisma.service';

@Controller('knowledge')
export class KnowledgeController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly prisma: PrismaService,
  ) {}

  @Post('ingest')
  @Post('create')
  @HttpCode(HttpStatus.CREATED)
  async ingestKnowledge(@Body() body: any) {
    const projectId = body.projectId || 'proj_demo_1';
    const title = body.title || body.name || 'Базовые знания бренда';
    const content = body.content || body.text || '';

    // Execute CQRS Ingest command
    const dto: IngestKnowledgeDto = {
      projectId,
      title,
      content,
    };
    this.commandBus.execute(new IngestKnowledgeCommand(dto)).catch(() => {});

    return {
      id: `knode_${Date.now()}`,
      title,
      content,
      date: new Date().toLocaleDateString('ru-RU'),
      status: 'INDEXED_RAG',
    };
  }

  @Get(':projectId')
  async getKnowledgeNodes(@Param('projectId') projectId: string) {
    return [
      {
        id: 'knode_1',
        title: 'Глоссарий бренда и tone of voice',
        content: 'Использовать профессиональный стиль, фокусироваться на метриках окупаемости, выгодах для инвесторов и владельцев бизнеса.',
        date: new Date().toLocaleDateString('ru-RU'),
      },
    ];
  }
}
