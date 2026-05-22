import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditAction } from '@prisma/client';

interface AuditLogEntry {
  userId: string;
  action: AuditAction;
  entityType: string;
  entityId: string;
  previous?: Record<string, any>;
  current?: Record<string, any>;
  metadata?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private prisma: PrismaService) {}

  async log(entry: AuditLogEntry): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          userId: entry.userId,
          action: entry.action,
          entityType: entry.entityType,
          entityId: entry.entityId,
          previous: entry.previous,
          current: entry.current,
          metadata: entry.metadata,
          ipAddress: entry.ipAddress,
          userAgent: entry.userAgent,
        },
      });
    } catch (error) {
      this.logger.error('Failed to create audit log:', error);
      // Don't throw - audit logging should not break main flow
    }
  }

  async getAuditLogs(
    userId: string,
    options: {
      entityType?: string;
      action?: AuditAction;
      limit?: number;
      offset?: number;
    } = {},
  ) {
    const { entityType, action, limit = 50, offset = 0 } = options;

    return this.prisma.auditLog.findMany({
      where: {
        userId,
        ...(entityType && { entityType }),
        ...(action && { action }),
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });
  }
}
