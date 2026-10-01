import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { applySettingsToProcessEnv } from '@lookiva/shared-config';
import { AppModule } from './app.module';
import { EmailProcessor } from './processors/email.processor';
import { MediaProcessor } from './processors/media.processor';
import { NotificationProcessor } from './processors/notification.processor';
import { AnalyticsProcessor } from './processors/analytics.processor';

applySettingsToProcessEnv();

const logger = new Logger('WorkerBootstrap');

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    bufferLogs: true,
  });

  app.enableShutdownHooks();

  app.get(EmailProcessor);
  app.get(MediaProcessor);
  app.get(NotificationProcessor);
  app.get(AnalyticsProcessor);

  process.on('SIGINT', async () => {
    logger.log('SIGINT received. Shutting down gracefully...');
    await app.close();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    logger.log('SIGTERM received. Shutting down gracefully...');
    await app.close();
    process.exit(0);
  });

  logger.log('LOOKIVA workers started, listening on Redis...');
}

bootstrap().catch((err) => {
  logger.error('Failed to start workers:', err);
  process.exit(1);
});
