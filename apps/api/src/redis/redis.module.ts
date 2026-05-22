import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

export const REDIS_CLIENT = 'REDIS_CLIENT';
export const REDIS_PUBLISHER = 'REDIS_PUBLISHER';
export const REDIS_SUBSCRIBER = 'REDIS_SUBSCRIBER';

@Global()
@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      useFactory: (configService: ConfigService) => {
        return new Redis(configService.get<string>('REDIS_URL'));
      },
      inject: [ConfigService],
    },
    {
      provide: REDIS_PUBLISHER,
      useFactory: (configService: ConfigService) => {
        return new Redis(configService.get<string>('REDIS_URL'));
      },
      inject: [ConfigService],
    },
    {
      provide: REDIS_SUBSCRIBER,
      useFactory: (configService: ConfigService) => {
        return new Redis(configService.get<string>('REDIS_URL'));
      },
      inject: [ConfigService],
    },
  ],
  exports: [REDIS_CLIENT, REDIS_PUBLISHER, REDIS_SUBSCRIBER],
})
export class RedisModule {}
