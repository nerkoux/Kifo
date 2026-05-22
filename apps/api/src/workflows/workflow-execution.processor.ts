import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Job, Worker } from 'bullmq';
import Redis from 'ioredis';
import { QueueName } from '../queue/queue.service';
import { WorkflowEngineService } from './workflow-engine.service';

@Injectable()
export class WorkflowExecutionProcessorService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(WorkflowExecutionProcessorService.name);
  private workflowWorker?: Worker;
  private aiWorker?: Worker;
  private readonly connection: Redis;

  constructor(private readonly workflowEngineService: WorkflowEngineService) {
    this.connection = new Redis(process.env.REDIS_URL || 'redis://redis:6379', {
      maxRetriesPerRequest: null,
    });
  }

  onModuleInit() {
    this.workflowWorker = new Worker(
      QueueName.WORKFLOW_EXECUTION,
      async (job: Job) => {
        const executionId = String(job.data.executionId || '');

        if (!executionId) {
          throw new Error('workflow-execution job missing executionId');
        }

        await this.workflowEngineService.processExecution(executionId);
      },
      {
        connection: this.connection,
        concurrency: parseInt(process.env.WORKFLOW_CONCURRENCY || '10', 10),
      },
    );

    this.aiWorker = new Worker(
      QueueName.AI_JOBS,
      async (job: Job) => {
        this.logger.debug(`AI job queued: ${job.name} (${job.id})`);
      },
      {
        connection: this.connection,
        concurrency: parseInt(process.env.AI_JOB_CONCURRENCY || '5', 10),
      },
    );

    this.workflowWorker.on('failed', (job, error) => {
      this.logger.error(`workflow-execution job failed: ${job?.id}`, error?.stack);
    });

    this.aiWorker.on('failed', (job, error) => {
      this.logger.error(`ai-jobs job failed: ${job?.id}`, error?.stack);
    });

    this.logger.log('Workflow queue processors initialized');
  }

  async onModuleDestroy() {
    if (this.workflowWorker) {
      await this.workflowWorker.close();
    }

    if (this.aiWorker) {
      await this.aiWorker.close();
    }

    await this.connection.quit();
  }
}
