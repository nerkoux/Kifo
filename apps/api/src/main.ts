import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });
  
  const configService = app.get(ConfigService);
  const port = configService.get<number>('API_PORT', 4000);
  const host = configService.get<string>('API_HOST', '0.0.0.0');
  
  // Security middleware
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    },
  }));
  
  // Compression
  app.use(compression());

  // Cookie parsing (required for refresh/logout flows)
  app.use(cookieParser());
  
  // CORS
  app.enableCors({
    origin: configService.get('CORS_ORIGIN', '*'),
    credentials: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: 'Content-Type, Accept, Authorization',
  });
  
  // Global validation pipe
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true,
    forbidNonWhitelisted: true,
    transformOptions: {
      enableImplicitConversion: true,
    },
  }));
  
  // API prefix
  app.setGlobalPrefix('api');
  
  // Swagger documentation
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Kifo Platform API')
    .setDescription('AI-native Discord automation platform')
    .setVersion('0.1.0')
    .addBearerAuth()
    .addTag('Auth', 'Authentication endpoints')
    .addTag('Users', 'User management')
    .addTag('Bots', 'Bot management (Shared & BYOB)')
    .addTag('Workflows', 'Workflow builder & execution')
    .addTag('Executions', 'Execution logs & monitoring')
    .addTag('Guilds', 'Discord guild management')
    .addTag('Runtime', 'Worker runtime orchestration')
    .addTag('Health', 'Health and readiness endpoints')
    .build();
  
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);
  
  await app.listen(port, host);
  
  logger.log(`🚀 Kifo API running on ${host}:${port}`);
  logger.log(`📚 Swagger docs available at /api/docs`);
}

bootstrap().catch((err) => {
  console.error('Failed to start application:', err);
  process.exit(1);
});
