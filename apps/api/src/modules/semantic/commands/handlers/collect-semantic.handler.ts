import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { CollectSemanticCommand } from '../collect-semantic.command';
import { DomainEventTypes, TaskStatusChangedEvent, TaskStatus, TaskType } from '@seo-saas/shared';
import { Logger } from '@nestjs/common';

@CommandHandler(CollectSemanticCommand)
export class CollectSemanticHandler implements ICommandHandler<CollectSemanticCommand> {
  private readonly logger = new Logger(CollectSemanticHandler.name);

  constructor(
    private readonly eventEmitter: EventEmitter2,
    @InjectQueue('semantic-queue') private readonly semanticQueue: Queue,
  ) {}

  async execute(command: CollectSemanticCommand): Promise<{ taskId: string; status: string }> {
    const { dto } = command;
    const taskId = `task_sem_${Date.now()}`;
    
    this.logger.log(`Enqueueing CollectSemanticCommand into BullMQ queue for project: ${dto.projectId} (${taskId})`);

    // Dispatch job to BullMQ queue non-blocking
    this.semanticQueue.add('collect-semantics-job', {
      taskId,
      projectId: dto.projectId,
      seedKeywords: dto.seedKeywords,
      depth: dto.depth || 2,
      regionId: dto.regionId || 225,
    }).catch(err => this.logger.warn(`BullMQ Redis enqueue warning: ${err.message}`));

    // Emit initial QUEUED status event
    const taskEvent: TaskStatusChangedEvent = {
      eventId: `evt_${Date.now()}`,
      eventType: DomainEventTypes.TASK_STATUS_CHANGED,
      aggregateId: taskId,
      timestamp: new Date().toISOString(),
      payload: {
        taskId,
        projectId: dto.projectId,
        taskType: TaskType.COLLECT_SEMANTICS,
        status: TaskStatus.QUEUED,
        progress: 0,
        message: 'Semantic collection job enqueued in BullMQ',
      },
    };

    this.eventEmitter.emit(DomainEventTypes.TASK_STATUS_CHANGED, taskEvent);

    return { taskId, status: 'QUEUED' };
  }
}
