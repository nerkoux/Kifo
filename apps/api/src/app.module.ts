import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { QueueModule } from './queue/queue.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { BotsModule } from './bots/bots.module';
import { WorkflowsModule } from './workflows/workflows.module';
import { ExecutionsModule } from './executions/executions.module';
import { GuildsModule } from './guilds/guilds.module';
import { RuntimeModule } from './runtime/runtime.module';
import { AiModule } from './ai/ai.module';
import { AuditModule } from './audit/audit.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { WebsocketModule } from './websocket/websocket.module';
import { validate } from './config/env.validation';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      validate,
      cache: true,
    }),
    
    // Rate limiting
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 60000, // 1 minute
        limit: 100, // 100 requests per minute
      },
      {
        name: 'strict',
        ttl: 60000,
        limit: 30,
      },
    ]),
    
    // Core infrastructure
    PrismaModule,
    RedisModule,
    QueueModule,
    
    // Feature modules
    AuthModule,
    UsersModule,
    BotsModule,
    WorkflowsModule,
    ExecutionsModule,
    GuildsModule,
    RuntimeModule,
    AiModule,
    AuditModule,
    AnalyticsModule,
    WebsocketModule,
  ],
})
export class AppModule {}
