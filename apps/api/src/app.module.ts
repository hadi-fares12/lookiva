import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { BullModule } from '@nestjs/bullmq';
import {
  I18nModule,
  QueryResolver,
  AcceptLanguageResolver,
  HeaderResolver,
  I18nJsonLoader,
} from 'nestjs-i18n';
import { join } from 'path';
import { envSchema } from './common/config/env.schema';
import { PrismaModule } from './prisma/prisma.module';
import { HealthModule } from './health/health.module';
import { AuthModule } from './auth/auth.module';
import { PlatformModule } from './platform/platform.module';
import { GeoModule } from './geo/geo.module';
import { DiscoveryModule } from './discovery/discovery.module';
import { BusinessesModule } from './businesses/businesses.module';
import { BranchesModule } from './branches/branches.module';
import { ProfessionalsModule } from './professionals/professionals.module';
import { ServicesModule } from './services/services.module';
import { ResourcesModule } from './resources/resources.module';
import { ReviewsModule } from './reviews/reviews.module';
import { CustomersModule } from './customers/customers.module';
import { SocialModule } from './social/social.module';
import { MediaModule } from './media/media.module';
import { NotificationsModule } from './notifications/notifications.module';
import { AdminModule } from './admin/admin.module';
import { BookingV2Module } from './booking-v2/booking-v2.module';
import { FinanceV2Module } from './finance-v2/finance-v2.module';
import { RetentionV2Module } from './retention-v2/retention-v2.module';
import { SocialV2Module } from './social-v2/social-v2.module';
import { AnalyticsV2Module } from './analytics-v2/analytics-v2.module';
import { PlatformOpsV2Module } from './platform-ops-v2/platform-ops-v2.module';
import { BusinessOpsModule } from './business-ops/business-ops.module';
import { CustomerOpsModule } from './customer-ops/customer-ops.module';
import { RealtimeModule } from './realtime/realtime.module';
import { LoggerModule } from 'nestjs-pino';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '.env.local', '../../.env'],
      validate: (config) => envSchema.parse(config),
    }),
    LoggerModule.forRoot({
      pinoHttp: {
        transport:
          process.env.NODE_ENV !== 'production'
            ? { target: 'pino-pretty' }
            : undefined,
        autoLogging: false,
      },
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 60,
      },
      {
        ttl: 60000,
        limit: 5,
        name: 'auth',
      },
    ]),
    I18nModule.forRoot({
      fallbackLanguage: 'en',
      loader: I18nJsonLoader,
      loaderOptions: {
        path: join(__dirname, '../../packages/localization/src/locales'),
        watch: true,
      },
      resolvers: [
        { use: QueryResolver, options: ['lang', 'locale', 'l'] },
        new HeaderResolver(['x-locale']),
        AcceptLanguageResolver,
      ],
      typesOutputPath: join(__dirname, '../generated/i18n.generated.ts'),
    }),
    BullModule.forRootAsync({
      useFactory: (configService: ConfigService) => {
        const redisUrl = configService.get<string>('REDIS_URL');
        const connection = redisUrl
          ? (() => {
              const parsed = new URL(redisUrl);
              return {
                host: parsed.hostname,
                port: Number(parsed.port || 6379),
                username: parsed.username || undefined,
                password: parsed.password || undefined,
                db: parsed.pathname ? Number(parsed.pathname.slice(1)) || 0 : 0,
              };
            })()
          : { host: 'localhost', port: 6379 };

        return {
          connection,
          defaultJobOptions: {
            attempts: 3,
            backoff: {
              type: 'exponential',
              delay: 1000,
            },
            removeOnComplete: 100,
            removeOnFail: 500,
          },
        };
      },
      inject: [ConfigService],
    }),
    PrismaModule,
    HealthModule,
    AuthModule,
    PlatformModule,
    GeoModule,
    DiscoveryModule,
    BusinessesModule,
    BranchesModule,
    ProfessionalsModule,
    ServicesModule,
    ResourcesModule,
    ReviewsModule,
    CustomersModule,
    SocialModule,
    MediaModule,
    NotificationsModule,
    AdminModule,
    BookingV2Module,
    FinanceV2Module,
    RetentionV2Module,
    SocialV2Module,
    AnalyticsV2Module,
    PlatformOpsV2Module,
    BusinessOpsModule,
    CustomerOpsModule,
    RealtimeModule,
  ],
})
export class AppModule {}
