import { Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { EncryptionService } from './encryption.service';
import { AuditAction, BotType, BotStatus } from '@prisma/client';

interface CreateBotDto {
  type: BotType;
  name: string;
  token?: string; // For BYOB mode
}

interface UpdateBotDto {
  name?: string;
  token?: string;
}

@Injectable()
export class BotsService {
  private readonly logger = new Logger(BotsService.name);

  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
    private encryptionService: EncryptionService,
  ) {}

  async createBot(userId: string, dto: CreateBotDto) {
    let tokenEncrypted: string | undefined;

    // Encrypt token for BYOB bots
    if (dto.type === BotType.CUSTOM && dto.token) {
      tokenEncrypted = this.encryptionService.encrypt(dto.token);
    }

    const bot = await this.prisma.bot.create({
      data: {
        userId,
        type: dto.type,
        name: dto.name,
        tokenEncrypted,
        status: BotStatus.OFFLINE,
      },
    });

    await this.auditService.log({
      userId,
      action: AuditAction.BOT_CREATE,
      entityType: 'bot',
      entityId: bot.id,
      current: { name: dto.name, type: dto.type },
    });

    this.logger.log(`Bot ${bot.name} (${bot.type}) created by user ${userId}`);

    return bot;
  }

  async getBots(userId: string) {
    return this.prisma.bot.findMany({
      where: { userId },
      include: {
        guilds: {
          include: {
            guild: {
              select: { id: true, name: true, icon: true, memberCount: true },
            },
          },
        },
        runtimeWorker: {
          select: { id: true, hostname: true, status: true },
        },
        _count: {
          select: { workflows: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getBot(userId: string, botId: string) {
    const bot = await this.prisma.bot.findFirst({
      where: { id: botId, userId },
      include: {
        guilds: {
          include: {
            guild: true,
          },
        },
        workflows: {
          select: { id: true, name: true, status: true },
        },
      },
    });

    if (!bot) {
      throw new NotFoundException('Bot not found');
    }

    return bot;
  }

  async updateBot(userId: string, botId: string, dto: UpdateBotDto) {
    const bot = await this.prisma.bot.findFirst({
      where: { id: botId, userId },
    });

    if (!bot) {
      throw new NotFoundException('Bot not found');
    }

    const previous = { ...bot };
    let tokenEncrypted = bot.tokenEncrypted;

    // Encrypt new token if provided
    if (dto.token && bot.type === BotType.CUSTOM) {
      tokenEncrypted = this.encryptionService.encrypt(dto.token);
    }

    const updated = await this.prisma.bot.update({
      where: { id: botId },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.token && { tokenEncrypted }),
      },
    });

    await this.auditService.log({
      userId,
      action: dto.token ? AuditAction.BOT_TOKEN_UPDATE : AuditAction.BOT_UPDATE,
      entityType: 'bot',
      entityId: botId,
      previous,
      current: updated,
    });

    return updated;
  }

  async deleteBot(userId: string, botId: string) {
    const bot = await this.prisma.bot.findFirst({
      where: { id: botId, userId },
    });

    if (!bot) {
      throw new NotFoundException('Bot not found');
    }

    await this.prisma.bot.delete({
      where: { id: botId },
    });

    await this.auditService.log({
      userId,
      action: AuditAction.BOT_DELETE,
      entityType: 'bot',
      entityId: botId,
    });

    this.logger.log(`Bot ${botId} deleted by user ${userId}`);

    return { success: true };
  }

  async getDecryptedToken(botId: string): Promise<string | null> {
    const bot = await this.prisma.bot.findUnique({
      where: { id: botId },
    });

    if (!bot || !bot.tokenEncrypted) {
      return null;
    }

    return this.encryptionService.decrypt(bot.tokenEncrypted);
  }
}
