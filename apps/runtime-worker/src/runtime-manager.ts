import { Client, GatewayIntentBits, Events, Partials } from 'discord.js';
import { Worker, Job } from 'bullmq';
import Redis from 'ioredis';
import { PrismaClient } from '@prisma/client';
import { logger } from './utils/logger';

interface BotConfig {
  id: string;
  type: 'SHARED' | 'CUSTOM';
  token: string;
  discordBotId?: string;
}

export class RuntimeManager {
  private clients: Map<string, Client> = new Map();
  private prisma: PrismaClient;
  private redis: Redis;
  private workers: Worker[] = [];
  private workerId: string;
  private maxBots: number;
  private heartbeatInterval?: NodeJS.Timeout;

  constructor() {
    this.prisma = new PrismaClient({
      datasources: {
        db: {
          url: process.env.DATABASE_URL,
        },
      },
    });
    this.redis = new Redis(process.env.REDIS_URL || 'redis://redis:6379', {
      maxRetriesPerRequest: null,
    });
    this.workerId = `worker-${process.pid}-${Date.now()}`;
    this.maxBots = parseInt(process.env.MAX_BOTS_PER_WORKER || '50', 10);
  }

  async initialize(): Promise<void> {
    logger.info(`Initializing Runtime Worker ${this.workerId}...`);

    // Register worker in database
    await this.registerWorker();

    // Start heartbeat
    this.startHeartbeat();

    // Load and connect bots
    await this.loadBots();

    // Start queue workers
    this.startQueueWorkers();

    logger.info(`Runtime Worker ${this.workerId} initialized with ${this.clients.size} bots`);
  }

  async shutdown(): Promise<void> {
    logger.info('Shutting down Runtime Worker...');

    // Stop heartbeat
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    // Stop queue workers
    for (const worker of this.workers) {
      await worker.close();
    }

    // Disconnect all Discord clients
    for (const [botId, client] of this.clients) {
      logger.info(`Disconnecting bot ${botId}...`);
      client.destroy();
    }
    this.clients.clear();

    // Update worker status
    await this.prisma.runtimeWorker.update({
      where: { id: this.workerId },
      data: { status: 'OFFLINE', currentBots: 0 },
    });

    // Close database connection
    await this.prisma.$disconnect();
    await this.redis.quit();

    logger.info('Runtime Worker shutdown complete');
  }

  private async registerWorker(): Promise<void> {
    const hostname = require('os').hostname();
    const port = parseInt(process.env.RUNTIME_WORKER_PORT || '5000', 10);

    await this.prisma.runtimeWorker.create({
      data: {
        id: this.workerId,
        hostname,
        port,
        maxBots: this.maxBots,
        concurrency: parseInt(process.env.WORKFLOW_CONCURRENCY || '10', 10),
        status: 'ACTIVE',
        currentBots: 0,
        lastHeartbeat: new Date(),
      },
    });
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(async () => {
      try {
        await this.prisma.runtimeWorker.update({
          where: { id: this.workerId },
          data: {
            lastHeartbeat: new Date(),
            currentBots: this.clients.size,
          },
        });
      } catch (error) {
        logger.error({ err: error }, 'Heartbeat failed');
      }
    }, 30000); // Every 30 seconds
  }

  private async loadBots(): Promise<void> {
    // Load platform bot (shared mode)
    const platformToken = process.env.DISCORD_BOT_TOKEN;
    if (platformToken) {
      try {
        await this.connectBot({
          id: 'platform',
          type: 'SHARED',
          token: platformToken,
        });
      } catch (error) {
        logger.error({ err: error }, 'Failed to connect platform bot');
        if (process.env.REQUIRE_PLATFORM_BOT === 'true') {
          throw error;
        }
      }
    }

    // Load custom bots assigned to this worker
    const bots = await this.prisma.bot.findMany({
      where: {
        type: 'CUSTOM',
        status: { in: ['OFFLINE', 'ERROR'] },
      },
      take: this.maxBots - this.clients.size,
    });

    for (const bot of bots) {
      if (!bot.tokenEncrypted) continue;

      try {
        // Decrypt token (would need to implement decryption here)
        const decryptedToken = bot.tokenEncrypted; // TODO: decrypt
        
        await this.connectBot({
          id: bot.id,
          type: 'CUSTOM',
          token: decryptedToken,
          discordBotId: bot.discordBotId || undefined,
        });

        // Update bot status
        await this.prisma.bot.update({
          where: { id: bot.id },
          data: {
            status: 'ONLINE',
            runtimeWorkerId: this.workerId,
            lastOnlineAt: new Date(),
          },
        });
      } catch (error) {
        logger.error({ err: error }, `Failed to connect bot ${bot.id}`);
        
        await this.prisma.bot.update({
          where: { id: bot.id },
          data: {
            status: 'ERROR',
            errorMessage: error instanceof Error ? error.message : 'Unknown error',
          },
        });
      }
    }
  }

  private async connectBot(config: BotConfig): Promise<void> {
    if (this.clients.has(config.id)) {
      logger.warn(`Bot ${config.id} already connected`);
      return;
    }

    const client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildModeration,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.DirectMessages,
      ],
      partials: [Partials.Channel, Partials.Message, Partials.Reaction],
    });

    // Event handlers
    client.once(Events.ClientReady, () => {
      logger.info(`Bot ${config.id} connected as ${client.user?.tag}`);
    });

    client.on(Events.MessageCreate, (message) => {
      this.handleDiscordEvent('messageCreate', config.id, {
        messageId: message.id,
        content: message.content,
        authorId: message.author.id,
        authorTag: message.author.tag,
        channelId: message.channelId,
        guildId: message.guild?.id,
        timestamp: message.createdAt.toISOString(),
      });
    });

    client.on(Events.GuildMemberAdd, (member) => {
      this.handleDiscordEvent('memberJoin', config.id, {
        userId: member.id,
        userTag: member.user.tag,
        guildId: member.guild.id,
        timestamp: new Date().toISOString(),
      });
    });

    client.on(Events.GuildMemberRemove, (member) => {
      this.handleDiscordEvent('memberLeave', config.id, {
        userId: member.id,
        userTag: member.user.tag,
        guildId: member.guild.id,
        timestamp: new Date().toISOString(),
      });
    });

    client.on(Events.Error, (error) => {
      logger.error({ err: error }, `Bot ${config.id} error`);
    });

    await client.login(config.token);
    this.clients.set(config.id, client);
  }

  private async handleDiscordEvent(
    eventType: string,
    botId: string,
    eventData: Record<string, any>,
  ): Promise<void> {
    // Find workflows that match this trigger
    const workflows = await this.prisma.workflow.findMany({
      where: {
        botId,
        status: 'ACTIVE',
      },
    });

    for (const workflow of workflows) {
      const nodes = workflow.nodes as any[];
      const triggerNode = nodes.find(n => n.type === `trigger.${eventType}`);
      
      if (triggerNode) {
        // Check trigger conditions
        const shouldTrigger = this.evaluateTrigger(triggerNode.data, eventData);
        
        if (shouldTrigger) {
          // Queue workflow execution
          await this.redis.lpush('queue:discord-events', JSON.stringify({
            workflowId: workflow.id,
            botId,
            triggerType: eventType,
            triggerData: eventData,
            timestamp: Date.now(),
          }));
        }
      }
    }
  }

  private evaluateTrigger(triggerData: any, eventData: any): boolean {
    if (!triggerData.conditions || triggerData.conditions.length === 0) {
      return true;
    }

    for (const condition of triggerData.conditions) {
      const value = this.getValueByPath(eventData, condition.field);
      
      switch (condition.operator) {
        case 'equals':
          if (value !== condition.value) return false;
          break;
        case 'contains':
          if (!String(value).includes(condition.value)) return false;
          break;
        case 'startsWith':
          if (!String(value).startsWith(condition.value)) return false;
          break;
        case 'regex':
          const regex = new RegExp(condition.value);
          if (!regex.test(String(value))) return false;
          break;
      }
    }

    return true;
  }

  private getValueByPath(obj: any, path: string): any {
    return path.split('.').reduce((o, p) => o?.[p], obj);
  }

  private startQueueWorkers(): void {
    // Workflow execution worker
    const workflowWorker = new Worker(
      'workflow-execution',
      async (job: Job) => {
        logger.info(`Processing workflow execution: ${job.id}`);
        // Workflow execution logic here
      },
      { connection: this.redis }
    );

    // Discord action worker
    const discordWorker = new Worker(
      'discord-events',
      async (job: Job) => {
        logger.info(`Processing Discord action: ${job.id}`);
        await this.processDiscordAction(job.data);
      },
      { connection: this.redis }
    );

    this.workers.push(workflowWorker, discordWorker);
  }

  private async processDiscordAction(data: any): Promise<void> {
    const { botId, action, params } = data;
    const client = this.clients.get(botId);
    
    if (!client) {
      throw new Error(`Bot ${botId} not found`);
    }

    switch (action) {
      case 'sendMessage':
        const channel = await client.channels.fetch(params.channelId);
        if (channel?.isTextBased()) {
          await channel.send(params.content);
        }
        break;
      
      case 'deleteMessage':
        const deleteChannel = await client.channels.fetch(params.channelId);
        if (deleteChannel?.isTextBased()) {
          const message = await deleteChannel.messages.fetch(params.messageId);
          await message.delete();
        }
        break;
      
      case 'addRole':
        const guild = await client.guilds.fetch(params.guildId);
        const member = await guild.members.fetch(params.userId);
        await member.roles.add(params.roleId);
        break;
      
      default:
        logger.warn(`Unknown Discord action: ${action}`);
    }
  }

  getConnectedBotCount(): number {
    return this.clients.size;
  }

  getWorkerId(): string {
    return this.workerId;
  }
}
