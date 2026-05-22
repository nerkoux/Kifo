import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { QueueService, QueueName } from '../queue/queue.service';
import { ExecutionStatus } from '@prisma/client';

// Node Types
export enum NodeType {
  // Triggers
  TRIGGER_MESSAGE_CREATE = 'trigger.messageCreate',
  TRIGGER_MESSAGE_DELETE = 'trigger.messageDelete',
  TRIGGER_REACTION_ADD = 'trigger.reactionAdd',
  TRIGGER_MEMBER_JOIN = 'trigger.memberJoin',
  TRIGGER_MEMBER_LEAVE = 'trigger.memberLeave',
  TRIGGER_SCHEDULED = 'trigger.scheduled',
  TRIGGER_WEBHOOK = 'trigger.webhook',
  
  // Conditions
  CONDITION_EQUALS = 'condition.equals',
  CONDITION_CONTAINS = 'condition.contains',
  CONDITION_REGEX = 'condition.regex',
  CONDITION_ROLE = 'condition.role',
  CONDITION_CHANNEL = 'condition.channel',
  
  // Actions
  ACTION_SEND_MESSAGE = 'action.sendMessage',
  ACTION_DELETE_MESSAGE = 'action.deleteMessage',
  ACTION_ADD_ROLE = 'action.addRole',
  ACTION_REMOVE_ROLE = 'action.removeRole',
  ACTION_TIMEOUT = 'action.timeout',
  ACTION_KICK = 'action.kick',
  ACTION_BAN = 'action.ban',
  ACTION_CREATE_CHANNEL = 'action.createChannel',
  ACTION_DELETE_CHANNEL = 'action.deleteChannel',
  
  // AI
  AI_GENERATE_TEXT = 'ai.generateText',
  AI_MODERATE = 'ai.moderate',
  AI_CLASSIFY = 'ai.classify',
  AI_EXTRACT = 'ai.extract',
  
  // Data
  DATA_STORE = 'data.store',
  DATA_RETRIEVE = 'data.retrieve',
  DATA_TRANSFORM = 'data.transform',
  
  // External
  HTTP_REQUEST = 'http.request',
  DELAY = 'delay.wait',
}

interface WorkflowNode {
  id: string;
  type: NodeType;
  data: Record<string, any>;
  position?: { x: number; y: number };
}

interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  condition?: string;
}

interface ExecutionContext {
  executionId: string;
  workflowId: string;
  botId: string;
  triggerData: Record<string, any>;
  variables: Map<string, any>;
  nodeResults: Map<string, any>;
  logs: Array<{ nodeId: string; type: string; data: any; timestamp: Date }>;
}

@Injectable()
export class WorkflowEngineService {
  private readonly logger = new Logger(WorkflowEngineService.name);

  constructor(
    private prisma: PrismaService,
    private queueService: QueueService,
  ) {}

  async processExecution(executionId: string): Promise<void> {
    const startTime = Date.now();

    try {
      // Fetch execution
      const execution = await this.prisma.execution.findUnique({
        where: { id: executionId },
        include: { workflow: true },
      });

      if (!execution) {
        throw new Error(`Execution ${executionId} not found`);
      }

      // Mark as running
      await this.prisma.execution.update({
        where: { id: executionId },
        data: {
          status: ExecutionStatus.RUNNING,
          startedAt: new Date(),
        },
      });

      // Build execution context
      const context: ExecutionContext = {
        executionId,
        workflowId: execution.workflowId,
        botId: execution.botId,
        triggerData: execution.triggerData as Record<string, any>,
        variables: new Map(),
        nodeResults: new Map(),
        logs: [],
      };

      // Execute workflow
      const nodes = execution.workflow.nodes as unknown as WorkflowNode[];
      const edges = execution.workflow.edges as unknown as WorkflowEdge[];

      await this.executeWorkflowNodes(nodes, edges, context);

      // Mark completed
      await this.prisma.execution.update({
        where: { id: executionId },
        data: {
          status: ExecutionStatus.COMPLETED,
          completedAt: new Date(),
          durationMs: Date.now() - startTime,
          result: Object.fromEntries(context.nodeResults),
        },
      });

      this.logger.log(`Execution ${executionId} completed in ${Date.now() - startTime}ms`);

    } catch (error) {
      this.logger.error(`Execution ${executionId} failed:`, error);

      await this.prisma.execution.update({
        where: { id: executionId },
        data: {
          status: ExecutionStatus.FAILED,
          completedAt: new Date(),
          durationMs: Date.now() - startTime,
          error: {
            message: error.message,
            stack: error.stack,
          },
        },
      });
    }
  }

  private async executeWorkflowNodes(
    nodes: WorkflowNode[],
    edges: WorkflowEdge[],
    context: ExecutionContext,
  ): Promise<void> {
    // Find trigger node (entry point)
    const triggerNode = nodes.find(n => n.type.startsWith('trigger.'));
    if (!triggerNode) {
      throw new Error('No trigger node found in workflow');
    }

    // Build adjacency list
    const adjacency = new Map<string, string[]>();
    for (const edge of edges) {
      if (!adjacency.has(edge.source)) {
        adjacency.set(edge.source, []);
      }
      adjacency.get(edge.source)!.push(edge.target);
    }

    // Execute nodes in order (BFS)
    const queue: string[] = [triggerNode.id];
    const visited = new Set<string>();

    while (queue.length > 0) {
      const nodeId = queue.shift()!;
      
      if (visited.has(nodeId)) continue;
      visited.add(nodeId);

      const node = nodes.find(n => n.id === nodeId);
      if (!node) continue;

      // Execute node
      const result = await this.executeNode(node, context);
      context.nodeResults.set(nodeId, result);

      // Add successors to queue
      const successors = adjacency.get(nodeId) || [];
      for (const successorId of successors) {
        const edge = edges.find(e => e.source === nodeId && e.target === successorId);
        
        // Check condition if present
        if (edge?.condition) {
          const conditionMet = this.evaluateCondition(edge.condition, result, context);
          if (!conditionMet) continue;
        }
        
        queue.push(successorId);
      }
    }
  }

  private async executeNode(
    node: WorkflowNode,
    context: ExecutionContext,
  ): Promise<any> {
    this.logger.debug(`Executing node ${node.id} of type ${node.type}`);

    const startTime = Date.now();
    let result: any;

    try {
      switch (node.type) {
        // Triggers
        case NodeType.TRIGGER_MESSAGE_CREATE:
        case NodeType.TRIGGER_MESSAGE_DELETE:
        case NodeType.TRIGGER_REACTION_ADD:
        case NodeType.TRIGGER_MEMBER_JOIN:
        case NodeType.TRIGGER_MEMBER_LEAVE:
          result = context.triggerData;
          break;

        // Conditions
        case NodeType.CONDITION_EQUALS:
          result = this.evaluateEquals(node.data, context);
          break;
        case NodeType.CONDITION_CONTAINS:
          result = this.evaluateContains(node.data, context);
          break;
        case NodeType.CONDITION_REGEX:
          result = this.evaluateRegex(node.data, context);
          break;

        // Actions
        case NodeType.ACTION_SEND_MESSAGE:
          await this.queueAction('sendMessage', node.data, context);
          result = { queued: true, action: 'sendMessage' };
          break;
        case NodeType.ACTION_DELETE_MESSAGE:
          await this.queueAction('deleteMessage', node.data, context);
          result = { queued: true, action: 'deleteMessage' };
          break;
        case NodeType.ACTION_ADD_ROLE:
          await this.queueAction('addRole', node.data, context);
          result = { queued: true, action: 'addRole' };
          break;

        // AI
        case NodeType.AI_GENERATE_TEXT:
          result = await this.executeAIGeneration(node.data, context);
          break;
        case NodeType.AI_MODERATE:
          result = await this.executeAIModeration(node.data, context);
          break;

        // Data
        case NodeType.DATA_STORE:
          context.variables.set(node.data.key, node.data.value);
          result = { stored: true };
          break;
        case NodeType.DATA_RETRIEVE:
          result = context.variables.get(node.data.key);
          break;

        // Delay
        case NodeType.DELAY:
          await this.sleep(node.data.duration || 1000);
          result = { delayed: node.data.duration };
          break;

        default:
          result = { skipped: true, reason: 'Unknown node type' };
      }

      // Log execution
      await this.logExecution(context, node.id, node.type, 'info', 'Node executed', result);

    } catch (error) {
      await this.logExecution(context, node.id, node.type, 'error', error.message, { error });
      throw error;
    }

    return result;
  }

  private evaluateEquals(data: any, context: ExecutionContext): boolean {
    const value = this.resolveValue(data.value, context);
    const compareTo = this.resolveValue(data.compareTo, context);
    return value === compareTo;
  }

  private evaluateContains(data: any, context: ExecutionContext): boolean {
    const value = String(this.resolveValue(data.value, context));
    const substring = String(this.resolveValue(data.substring, context));
    return value.includes(substring);
  }

  private evaluateRegex(data: any, context: ExecutionContext): boolean {
    const value = String(this.resolveValue(data.value, context));
    const pattern = new RegExp(data.pattern, data.flags || '');
    return pattern.test(value);
  }

  private evaluateCondition(
    condition: string,
    nodeResult: any,
    context: ExecutionContext,
  ): boolean {
    // Simple condition evaluation
    if (condition === 'true') return true;
    if (condition === 'false') return false;
    
    // Result-based conditions
    if (condition.startsWith('result.')) {
      const path = condition.slice(7);
      const value = this.getValueByPath(nodeResult, path);
      return Boolean(value);
    }
    
    return true;
  }

  private resolveValue(value: any, context: ExecutionContext): any {
    if (typeof value !== 'string') return value;
    
    // Variable interpolation: {{variable}}
    if (value.startsWith('{{') && value.endsWith('}}')) {
      const varName = value.slice(2, -2);
      return context.variables.get(varName) ?? context.triggerData[varName];
    }
    
    // Trigger data access: trigger.property
    if (value.startsWith('trigger.')) {
      const path = value.slice(8);
      return this.getValueByPath(context.triggerData, path);
    }
    
    return value;
  }

  private getValueByPath(obj: any, path: string): any {
    return path.split('.').reduce((o, p) => o?.[p], obj);
  }

  private async queueAction(
    action: string,
    data: any,
    context: ExecutionContext,
  ): Promise<void> {
    await this.queueService.addJob(QueueName.DISCORD_EVENTS, {
      name: `discord-${action}`,
      data: {
        botId: context.botId,
        action,
        params: data,
        executionId: context.executionId,
      },
    });
  }

  private async executeAIGeneration(data: any, context: ExecutionContext): Promise<any> {
    // Queue AI job
    const job = await this.queueService.addJob(QueueName.AI_JOBS, {
      name: 'ai-generate-text',
      data: {
        prompt: this.resolveValue(data.prompt, context),
        model: data.model || 'gpt-4',
        maxTokens: data.maxTokens,
        temperature: data.temperature,
        executionId: context.executionId,
      },
    });

    // Return job reference (actual result will be processed asynchronously)
    return { jobId: job.id, queued: true };
  }

  private async executeAIModeration(data: any, context: ExecutionContext): Promise<any> {
    const job = await this.queueService.addJob(QueueName.AI_JOBS, {
      name: 'ai-moderate',
      data: {
        content: this.resolveValue(data.content, context),
        categories: data.categories,
        executionId: context.executionId,
      },
    });

    return { jobId: job.id, queued: true };
  }

  private async logExecution(
    context: ExecutionContext,
    nodeId: string,
    nodeType: string,
    level: string,
    message: string,
    data: any,
  ): Promise<void> {
    context.logs.push({
      nodeId,
      type: nodeType,
      data: { level, message, data },
      timestamp: new Date(),
    });

    // Persist to database
    await this.prisma.executionLog.create({
      data: {
        executionId: context.executionId,
        nodeId,
        nodeType,
        level,
        message,
        data,
      },
    });
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
