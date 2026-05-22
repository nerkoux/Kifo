import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit() {
    await this.$connect();
    this.logger.log('✅ Database connection established');
    
    // Log query metrics in development
    if (process.env.NODE_ENV === 'development') {
      this.$on('query' as never, (e: { query: string; duration: number }) => {
        this.logger.debug(`Query: ${e.query} - ${e.duration}ms`);
      });
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('🔌 Database connection closed');
  }
  
  // Helper method for transactions
  async executeInTransaction<T>(fn: (prisma: PrismaClient) => Promise<T>): Promise<T> {
    return this.$transaction(async (prisma) => {
      return fn(prisma as PrismaClient);
    });
  }
}
