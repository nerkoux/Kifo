import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue, Worker, Job } from 'bullmq';
import Redis from 'ioredis';

export enum QueueName {
  DISCORD_EVENTS = 'discord-events',
  WORKFLOW_EXECUTION = 'workflow-execution',
  AI_JOBS = 'ai-jobs',
  ANALYTICS = 'analytics',
  NOTIFICATIONS = 'notifications',
}

export interface QueueJob {
  name: string;
  data: Record<string, unknown>;
  opts?: {
    priority?: number;
    delay?: number;
    attempts?: number;
    backoff?: {
      type: 'fixed' | 'exponential';
      delay: number;
    };
  };
}

@Injectable()
export class QueueService implements OnModuleInit {
  private readonly logger = new Logger(QueueService.name);
  private queues: Map<QueueName, Queue> = new Map();
  private redisConnection: Redis;

  constructor(private configService: ConfigService) {
    this.redisConnection = new Redis(configService.get<string>('REDIS_URL'), {
      maxRetriesPerRequest: null,
    });
  }

  onModuleInit() {
    // Initialize all queues
    Object.values(QueueName).forEach((queueName) => {
      this.queues.set(
        queueName,
        new Queue(queueName, {
          connection: this.redisConnection,
          defaultJobOptions: {
            attempts: 3,
            backoff: {
              type: 'exponential',
              delay: 1000,
            },
            removeOnComplete: {
              age: 3600, // 1 hour
              count: 1000,
            },
            removeOnFail: {
              age: 86400, // 24 hours
            },
          },
        })
      );
    });

    this.logger.log('✅ Queue service initialized');
  }

  async addJob(queueName: QueueName, job: QueueJob): Promise<Job> {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }

    return queue.add(job.name, job.data, job.opts);
  }

  async addJobs(queueName: QueueName, jobs: QueueJob[]): Promise<Job[]> {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }

    return queue.addBulk(
      jobs.map((job) => ({
        name: job.name,
        data: job.data,
        opts: job.opts,
      }))
    );
  }

  async getQueueMetrics(queueName: QueueName) {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }

    const [waiting, active, completed, failed, delayed] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getCompletedCount(),
      queue.getFailedCount(),
      queue.getDelayedCount(),
    ]);

    return {
      waiting,
      active,
      completed,
      failed,
      delayed,
    };
  }

  async pauseQueue(queueName: QueueName) {
    const queue = this.queues.get(queueName);
    if (!queue) return;
    await queue.pause();
    this.logger.log(`⏸️ Queue ${queueName} paused`);
  }

  async resumeQueue(queueName: QueueName) {
    const queue = this.queues.get(queueName);
    if (!queue) return;
    await queue.resume();
    this.logger.log(`▶️ Queue ${queueName} resumed`);
  }

  async cleanQueue(queueName: QueueName, gracePeriod: number = 3600000) {
    const queue = this.queues.get(queueName);
    if (!queue) return;
    
    await queue.clean(gracePeriod, 1000, 'completed');
    await queue.clean(gracePeriod, 1000, 'failed');
    
    this.logger.log(`🧹 Queue ${queueName} cleaned`);
  }

  getQueue(queueName: QueueName): Queue | undefined {
    return this.queues.get(queueName);
  }
}
