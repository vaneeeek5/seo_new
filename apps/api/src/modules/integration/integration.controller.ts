import { Controller, Post, Body, HttpCode, HttpStatus, Get, Param, Query, Delete, Patch } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { SaveConnectionCommand, SaveConnectionDto } from './commands/save-connection.command';
import { DeleteIntegrationCommand } from './commands/delete-integration.command';
import { GetIntegrationsQuery } from './queries/get-integrations.query';
import { IntegrationService } from './integration.service';

@Controller('integrations')
export class IntegrationController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
    private readonly integrationService: IntegrationService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createIntegration(@Body() dto: SaveConnectionDto) {
    return await this.commandBus.execute(new SaveConnectionCommand(dto));
  }

  @Post('save')
  @HttpCode(HttpStatus.CREATED)
  async saveConnection(@Body() dto: SaveConnectionDto) {
    return await this.commandBus.execute(new SaveConnectionCommand(dto));
  }

  @Get()
  async getIntegrations(@Query('projectId') projectId?: string) {
    return await this.queryBus.execute(new GetIntegrationsQuery(projectId));
  }

  @Get('list/:projectId')
  async listConnections(@Param('projectId') projectId: string) {
    return await this.queryBus.execute(new GetIntegrationsQuery(projectId));
  }

  @Patch(':id/config')
  async updateConfig(@Param('id') id: string, @Body() body: { config: any }) {
    return await this.integrationService.updateConfig(id, body.config);
  }

  @Delete(':id')
  async deleteIntegrationById(@Param('id') id: string) {
    return await this.commandBus.execute(new DeleteIntegrationCommand(id));
  }

  @Delete()
  async deleteIntegrationQuery(@Query('id') id: string) {
    return await this.commandBus.execute(new DeleteIntegrationCommand(id));
  }
}
