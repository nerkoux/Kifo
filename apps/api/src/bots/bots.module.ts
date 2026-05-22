import { Module } from '@nestjs/common';
import { BotsController } from './bots.controller';
import { BotsService } from './bots.service';
import { EncryptionService } from './encryption.service';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuditModule],
  controllers: [BotsController],
  providers: [BotsService, EncryptionService],
  exports: [BotsService, EncryptionService],
})
export class BotsModule {}
