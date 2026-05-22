import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ExecutionsService {
  constructor(private readonly prisma: PrismaService) {}

  async listExecutions(
    userId: string,
    options: {
      workflowId?: string;
      botId?: string;
      status?: string;
      limit?: number;
      cursor?: string;
    } = {},
  ) {
    const take = Math.min(Math.max(options.limit ?? 25, 1), 100);

    return this.prisma.execution.findMany({
      where: {
        workflow: { userId },
        ...(options.workflowId ? { workflowId: options.workflowId } : {}),
        ...(options.botId ? { botId: options.botId } : {}),
        ...(options.status ? { status: options.status as any } : {}),
      },
      include: {
        workflow: {
          select: { id: true, name: true },
        },
        bot: {
          select: { id: true, name: true, type: true },
        },
        _count: {
          select: { logs: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take,
      ...(options.cursor ? { cursor: { id: options.cursor }, skip: 1 } : {}),
    });
  }

  async getExecution(userId: string, executionId: string) {
    const execution = await this.prisma.execution.findFirst({
      where: {
        id: executionId,
        workflow: { userId },
      },
      include: {
        workflow: {
          select: { id: true, name: true, status: true },
        },
        bot: {
          select: { id: true, name: true, type: true },
        },
      },
    });

    if (!execution) {
      throw new NotFoundException('Execution not found');
    }

    return execution;
  }

  async getExecutionLogs(userId: string, executionId: string) {
    const execution = await this.prisma.execution.findFirst({
      where: {
        id: executionId,
        workflow: { userId },
      },
      select: { id: true },
    });

    if (!execution) {
      throw new NotFoundException('Execution not found');
    }

    return this.prisma.executionLog.findMany({
      where: { executionId },
      orderBy: { timestamp: 'asc' },
    });
  }
}
