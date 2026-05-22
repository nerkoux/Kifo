import express from 'express';
import { RuntimeManager } from './runtime-manager';
import { logger } from './utils/logger';

export class HealthServer {
  private app: express.Application;
  private port: number;
  private server?: ReturnType<typeof this.app.listen>;
  private runtimeManager: RuntimeManager;

  constructor(runtimeManager: RuntimeManager) {
    this.app = express();
    this.port = parseInt(process.env.RUNTIME_WORKER_PORT || '5000', 10);
    this.runtimeManager = runtimeManager;
    
    this.setupRoutes();
  }

  private setupRoutes(): void {
    // Health check endpoint
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        workerId: this.runtimeManager.getWorkerId(),
        connectedBots: this.runtimeManager.getConnectedBotCount(),
        timestamp: new Date().toISOString(),
      });
    });

    // Metrics endpoint
    this.app.get('/metrics', (req, res) => {
      res.json({
        workerId: this.runtimeManager.getWorkerId(),
        connectedBots: this.runtimeManager.getConnectedBotCount(),
        memory: process.memoryUsage(),
        uptime: process.uptime(),
      });
    });

    // Ready check
    this.app.get('/ready', (req, res) => {
      const botCount = this.runtimeManager.getConnectedBotCount();
      if (botCount > 0) {
        res.json({ ready: true, bots: botCount });
      } else {
        res.status(503).json({ ready: false, bots: 0 });
      }
    });
  }

  async start(): Promise<void> {
    return new Promise((resolve) => {
      this.server = this.app.listen(this.port, () => {
        logger.info(`Health server listening on port ${this.port}`);
        resolve();
      });
    });
  }

  async stop(): Promise<void> {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => {
          logger.info('Health server stopped');
          resolve();
        });
      } else {
        resolve();
      }
    });
  }
}
