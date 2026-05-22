import { config } from 'dotenv';
config();

import { RuntimeManager } from './runtime-manager';
import { HealthServer } from './health-server';
import { logger } from './utils/logger';

async function main() {
  logger.info('🚀 Starting Kifo Runtime Worker...');

  const runtimeManager = new RuntimeManager();
  const healthServer = new HealthServer(runtimeManager);

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    logger.info(`Received ${signal}, shutting down gracefully...`);
    
    try {
      await runtimeManager.shutdown();
      await healthServer.stop();
      logger.info('Shutdown complete');
      process.exit(0);
    } catch (error) {
      logger.error('Error during shutdown:', error);
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  // Start services
  try {
    await runtimeManager.initialize();
    await healthServer.start();
    
    logger.info('✅ Runtime Worker started successfully');
  } catch (error) {
    logger.error({ err: error }, 'Failed to start Runtime Worker');
    process.exit(1);
  }
}

main();
