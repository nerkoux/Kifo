import { Injectable, Logger } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@Injectable()
@WebSocketGateway({
  namespace: '/runtime',
  cors: {
    origin: '*',
    credentials: true,
  },
})
export class RuntimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(RuntimeGateway.name);

  @WebSocketServer()
  server: Server;

  handleConnection(client: Socket) {
    this.logger.debug(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.debug(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('execution:subscribe')
  onExecutionSubscribe(
    @MessageBody() body: { executionId?: string; workflowId?: string; botId?: string },
    @ConnectedSocket() client: Socket,
  ) {
    if (body.executionId) {
      client.join(`execution:${body.executionId}`);
    }
    if (body.workflowId) {
      client.join(`workflow:${body.workflowId}`);
    }
    if (body.botId) {
      client.join(`bot:${body.botId}`);
    }
    client.emit('execution:subscribed', body);
  }

  emitExecutionQueued(payload: Record<string, unknown>) {
    this.server.to(`workflow:${payload.workflowId}`).emit('execution:queued', payload);
    this.server.to(`bot:${payload.botId}`).emit('execution:queued', payload);
  }

  emitExecutionStatus(payload: Record<string, unknown>) {
    this.server.to(`execution:${payload.executionId}`).emit('execution:status', payload);
    this.server.to(`workflow:${payload.workflowId}`).emit('execution:status', payload);
    this.server.to(`bot:${payload.botId}`).emit('execution:status', payload);
  }

  emitExecutionLog(payload: Record<string, unknown>) {
    this.server.to(`execution:${payload.executionId}`).emit('execution:log', payload);
  }
}
