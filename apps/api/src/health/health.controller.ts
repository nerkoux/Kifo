import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { QueueService, QueueName } from '../queue/queue.service';

@Controller('health')
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly queueService: QueueService,
  ) {}

  @Get()
  async health() {
    const now = new Date().toISOString();

    return {
      status: 'ok',
      timestamp: now,
      service: 'kifo-api',
      version: '0.1.0',
    };
  }

  @Get('ready')
  async readiness() {
    await this.prisma.$queryRaw`SELECT 1`;

    const queueStats = await Promise.all(
      Object.values(QueueName).map(async (queueName) => ({
        queueName,
        metrics: await this.queueService.getQueueMetrics(queueName),
      })),
    );

    return {
      status: 'ready',
      checks: {
        database: 'up',
        queues: queueStats,
      },
    };
  }
}
