import { Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { QueueService, QueueName } from '../queue/queue.service';
import { WorkflowStatus, AuditAction, BotType } from '@prisma/client';
import { CreateWorkflowDto, UpdateWorkflowDto } from './dto/workflow.dto';
import { RuntimeGateway } from '../websocket/runtime.gateway';

@Injectable()
export class WorkflowsService {
  private readonly logger = new Logger(WorkflowsService.name);

  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
    private queueService: QueueService,
    private runtimeGateway: RuntimeGateway,
  ) {}

  async createWorkflow(userId: string, dto: CreateWorkflowDto) {
    // Verify bot ownership
    const bot = await this.prisma.bot.findFirst({
      where: { id: dto.botId, userId },
    });

    if (!bot) {
      throw new ForbiddenException('Bot not found or access denied');
    }

    const workflow = await this.prisma.workflow.create({
      data: {
        userId,
        botId: dto.botId,
        guildId: dto.guildId,
        name: dto.name,
        description: dto.description,
        nodes: dto.nodes,
        edges: dto.edges,
        status: WorkflowStatus.DRAFT,
      },
    });

    await this.auditService.log({
      userId,
      action: AuditAction.WORKFLOW_CREATE,
      entityType: 'workflow',
      entityId: workflow.id,
      current: { name: dto.name, botId: dto.botId },
    });

    this.logger.log(`Workflow ${workflow.name} created by user ${userId}`);

    return workflow;
  }

  async getWorkflows(userId: string, options: { botId?: string; status?: WorkflowStatus } = {}) {
    return this.prisma.workflow.findMany({
      where: {
        userId,
        ...(options.botId && { botId: options.botId }),
        ...(options.status && { status: options.status }),
      },
      include: {
        bot: {
          select: { id: true, name: true, type: true, status: true },
        },
        guild: {
          select: { id: true, name: true, icon: true },
        },
        _count: {
          select: { executions: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async getWorkflow(userId: string, workflowId: string) {
    const workflow = await this.prisma.workflow.findFirst({
      where: { id: workflowId, userId },
      include: {
        bot: true,
        guild: true,
        versions: {
          orderBy: { version: 'desc' },
          take: 10,
        },
      },
    });

    if (!workflow) {
      throw new NotFoundException('Workflow not found');
    }

    return workflow;
  }

  async updateWorkflow(userId: string, workflowId: string, dto: UpdateWorkflowDto) {
    const workflow = await this.prisma.workflow.findFirst({
      where: { id: workflowId, userId },
    });

    if (!workflow) {
      throw new NotFoundException('Workflow not found');
    }

    const previous = { ...workflow };

    const updated = await this.prisma.workflow.update({
      where: { id: workflowId },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.nodes && { nodes: dto.nodes }),
        ...(dto.edges && { edges: dto.edges }),
        ...(dto.status && { status: dto.status }),
      },
    });

    // Create version snapshot if nodes/edges changed
    if (dto.nodes || dto.edges) {
      const latestVersion = await this.prisma.workflowVersion.findFirst({
        where: { workflowId },
        orderBy: { version: 'desc' },
      });

      await this.prisma.workflowVersion.create({
        data: {
          workflowId,
          version: (latestVersion?.version ?? 0) + 1,
          nodes: updated.nodes,
          edges: updated.edges,
          createdBy: userId,
        },
      });
    }

    await this.auditService.log({
      userId,
      action: AuditAction.WORKFLOW_UPDATE,
      entityType: 'workflow',
      entityId: workflowId,
      previous,
      current: updated,
    });

    return updated;
  }

  async deleteWorkflow(userId: string, workflowId: string) {
    const workflow = await this.prisma.workflow.findFirst({
      where: { id: workflowId, userId },
    });

    if (!workflow) {
      throw new NotFoundException('Workflow not found');
    }

    await this.prisma.workflow.delete({
      where: { id: workflowId },
    });

    await this.auditService.log({
      userId,
      action: AuditAction.WORKFLOW_DELETE,
      entityType: 'workflow',
      entityId: workflowId,
    });

    this.logger.log(`Workflow ${workflowId} deleted by user ${userId}`);

    return { success: true };
  }

  async publishWorkflow(userId: string, workflowId: string) {
    const workflow = await this.prisma.workflow.findFirst({
      where: { id: workflowId, userId },
      include: { bot: true },
    });

    if (!workflow) {
      throw new NotFoundException('Workflow not found');
    }

    if (workflow.bot.status !== 'ONLINE' && workflow.bot.type === BotType.CUSTOM) {
      throw new ForbiddenException('Bot must be online to publish workflow');
    }

    const updated = await this.prisma.workflow.update({
      where: { id: workflowId },
      data: { status: WorkflowStatus.ACTIVE },
    });

    await this.auditService.log({
      userId,
      action: AuditAction.WORKFLOW_PUBLISH,
      entityType: 'workflow',
      entityId: workflowId,
    });

    return updated;
  }

  async executeWorkflow(
    userId: string,
    workflowId: string,
    triggerType: string,
    triggerData: Record<string, any>,
  ) {
    const workflow = await this.prisma.workflow.findFirst({
      where: { id: workflowId, userId },
    });

    if (!workflow || workflow.status !== WorkflowStatus.ACTIVE) {
      return null;
    }

    // Create execution record
    const execution = await this.prisma.execution.create({
      data: {
        workflowId,
        botId: workflow.botId,
        triggerType,
        triggerData,
        status: 'PENDING',
      },
    });

    // Queue for execution
    await this.queueService.addJob(QueueName.WORKFLOW_EXECUTION, {
      name: 'execute-workflow',
      data: {
        executionId: execution.id,
        workflowId,
        botId: workflow.botId,
        nodes: workflow.nodes,
        edges: workflow.edges,
        triggerData,
      },
    });

    this.runtimeGateway.emitExecutionQueued({
      executionId: execution.id,
      workflowId,
      botId: workflow.botId,
      status: 'PENDING',
      triggerType,
      createdAt: execution.createdAt,
    });

    return execution;
  }

  async queueExecution(userId: string, workflowId: string, triggerData: Record<string, any>) {
    return this.executeWorkflow(userId, workflowId, 'manual', triggerData);
  }
}
