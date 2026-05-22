import { Module } from '@nestjs/common';
import { WorkflowsController } from './workflows.controller';
import { WorkflowsService } from './workflows.service';
import { WorkflowEngineService } from './workflow-engine.service';
import { WorkflowExecutionProcessorService } from './workflow-execution.processor';
import { AuditModule } from '../audit/audit.module';
import { QueueModule } from '../queue/queue.module';
import { WebsocketModule } from '../websocket/websocket.module';

@Module({
  imports: [AuditModule, QueueModule, WebsocketModule],
  controllers: [WorkflowsController],
  providers: [WorkflowsService, WorkflowEngineService, WorkflowExecutionProcessorService],
  exports: [WorkflowsService, WorkflowEngineService],
})
export class WorkflowsModule {}
