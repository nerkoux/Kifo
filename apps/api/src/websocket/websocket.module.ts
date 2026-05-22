import { Module } from '@nestjs/common';
import { RuntimeGateway } from './runtime.gateway';

@Module({
  providers: [RuntimeGateway],
  exports: [RuntimeGateway],
})
export class WebsocketModule {}
