import { Controller, Post, Get, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { CreateProjectDto } from '@seo-saas/shared';
import { CreateProjectCommand } from './commands/create-project.command';
import { PrismaService } from '../../infrastructure/database/prisma.service';

@Controller('projects')
export class ProjectController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly prisma: PrismaService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createProject(@Body() body: any) {
    const dto: CreateProjectDto = {
      name: body.name || 'Новый проект',
      domain: body.domain || 'example.com',
      organizationId: body.organizationId || 'org_demo_1',
    };

    const result = await this.commandBus.execute(new CreateProjectCommand(dto));

    // Ensure project is persisted in DB
    const projId = body.id || `proj_${Date.now()}`;
    await this.prisma.organization.upsert({
      where: { id: 'org_demo_1' },
      update: {},
      create: { id: 'org_demo_1', name: 'Default Organization' },
    });

    await this.prisma.project.upsert({
      where: { id: projId },
      update: { name: dto.name, domain: dto.domain },
      create: {
        id: projId,
        organizationId: 'org_demo_1',
        name: dto.name,
        domain: dto.domain,
      },
    });

    return {
      id: projId,
      name: dto.name,
      domain: dto.domain,
      date: new Date().toLocaleDateString('ru-RU'),
      ...result,
    };
  }

  @Get()
  async getProjects() {
    try {
      const projects = await this.prisma.project.findMany({
        orderBy: { createdAt: 'desc' },
      });

      if (projects.length === 0) {
        await this.prisma.organization.upsert({
          where: { id: 'org_demo_1' },
          update: {},
          create: { id: 'org_demo_1', name: 'Default Organization' },
        });

        const p1 = await this.prisma.project.upsert({
          where: { id: 'proj_demo_1' },
          update: {},
          create: { id: 'proj_demo_1', organizationId: 'org_demo_1', name: 'SEO SaaS Platform', domain: 'seo-saas.com' },
        });

        const p2 = await this.prisma.project.upsert({
          where: { id: 'proj_demo_epic' },
          update: {},
          create: { id: 'proj_demo_epic', organizationId: 'org_demo_1', name: 'Epic Car Wash', domain: 'epicarwash.com' },
        });

        return [
          { id: p1.id, name: p1.name, domain: p1.domain, date: p1.createdAt.toLocaleDateString('ru-RU') },
          { id: p2.id, name: p2.name, domain: p2.domain, date: p2.createdAt.toLocaleDateString('ru-RU') },
        ];
      }

      return projects.map(p => ({
        id: p.id,
        name: p.name,
        domain: p.domain,
        date: p.createdAt.toLocaleDateString('ru-RU'),
      }));
    } catch (err: any) {
      return [
        { id: 'proj_demo_1', name: 'SEO SaaS Platform', domain: 'seo-saas.com', date: new Date().toLocaleDateString('ru-RU') },
        { id: 'proj_demo_epic', name: 'Epic Car Wash', domain: 'epicarwash.com', date: new Date().toLocaleDateString('ru-RU') }
      ];
    }
  }
}
