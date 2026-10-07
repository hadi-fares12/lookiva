import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { EmailProcessor } from './processors/email.processor';
import { MediaProcessor } from './processors/media.processor';
import { NotificationProcessor } from './processors/notification.processor';
import { AnalyticsProcessor } from './processors/analytics.processor';
import { PrismaService } from './common/prisma.service';
import { DeadLetterService } from './common/dead-letter.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const redisUrl = config.get<string>('REDIS_URL', 'redis://localhost:6379');
        const parsed = new URL(redisUrl);
        return {
          connection: {
            host: parsed.hostname,
            port: Number(parsed.port || 6379),
            username: parsed.username || undefined,
            password: parsed.password || undefined,
            db: parsed.pathname ? Number(parsed.pathname.slice(1)) || 0 : 0,
          },
        };
      },
    }),
    BullModule.registerQueue(
      { name: 'email-queue' },
      { name: 'media-process-queue' },
      { name: 'notification-queue' },
      { name: 'analytics-queue' },
      { name: 'dead-letter-queue' },
    ),
  ],
  providers: [
    EmailProcessor,
    MediaProcessor,
    NotificationProcessor,
    AnalyticsProcessor,
    PrismaService,
    DeadLetterService,
  ],
})
export class AppModule {}
