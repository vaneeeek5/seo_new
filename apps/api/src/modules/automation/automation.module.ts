import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { CqrsModule } from '@nestjs/cqrs';
import { AutopilotScheduler } from './autopilot.scheduler';
import { PrismaService } from '../../infrastructure/database/prisma.service';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    CqrsModule,
  ],
  providers: [AutopilotScheduler, PrismaService],
  exports: [AutopilotScheduler],
})
export class AutomationModule {}
