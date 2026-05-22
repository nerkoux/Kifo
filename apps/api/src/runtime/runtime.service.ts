import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RuntimeService {
  constructor(private readonly prisma: PrismaService) {}

  async getWorkers() {
    return this.prisma.runtimeWorker.findMany({
      include: {
        bots: {
          select: { id: true, name: true, status: true, type: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async getRuntimeSummary() {
    const [workers, onlineBots, activeWorkflows] = await Promise.all([
      this.prisma.runtimeWorker.count({ where: { status: 'ACTIVE' } }),
      this.prisma.bot.count({ where: { status: 'ONLINE' } }),
      this.prisma.workflow.count({ where: { status: 'ACTIVE' } }),
    ]);

    return {
      workers,
      onlineBots,
      activeWorkflows,
    };
  }
}
