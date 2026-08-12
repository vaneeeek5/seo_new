import { Global, Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';

@Global()
@Module({
  imports: [
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379', 10),
        lazyConnect: true,
        connectTimeout: 5000,
        enableOfflineQueue: true,
        maxRetriesPerRequest: null,
        retryStrategy: (times: number) => Math.min(times * 100, 2000),
      },
    }),
    BullModule.registerQueue(
      {
        name: 'semantic-queue',
        defaultJobOptions: {
          attempts: 3,
          backoff: { type: 'exponential', delay: 2000 },
        },
      },
      {
        name: 'content-queue',
        defaultJobOptions: {
          attempts: 3,
          backoff: { type: 'exponential', delay: 2000 },
        },
      },
      {
        name: 'publication-queue',
        defaultJobOptions: {
          attempts: 3,
          backoff: { type: 'exponential', delay: 2000 },
        },
      },
    ),
  ],
  exports: [BullModule],
})
export class QueueModule {}
