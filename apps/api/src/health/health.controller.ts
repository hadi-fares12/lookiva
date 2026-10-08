import { Controller, Get, Injectable, Logger } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
  HealthCheck,
  HealthCheckService,
  HealthIndicator,
  HealthIndicatorResult,
  HealthCheckError,
} from '@nestjs/terminus';
import { ConfigService } from '@nestjs/config';
import { Public } from '../common/decorators/public.decorator';
import { PrismaService } from '../prisma/prisma.service';
import Redis from 'ioredis';
import { requestMetricsSnapshot } from '../common/observability/request-metrics';

@Injectable()
export class PrismaHealthIndicator extends HealthIndicator {
  private readonly logger = new Logger(PrismaHealthIndicator.name);

  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return this.getStatus(key, true);
    } catch (err) {
      this.logger.error(`Prisma health check failed: ${err}`);
      throw new HealthCheckError(
        'Prisma failed',
        this.getStatus(key, false, { message: String(err) }),
      );
    }
  }
}

@Injectable()
export class RedisHealthIndicator extends HealthIndicator {
  private readonly logger = new Logger(RedisHealthIndicator.name);

  constructor(private readonly configService: ConfigService) {
    super();
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    const redisUrl = this.configService.get<string>(
      'REDIS_URL',
      'redis://localhost:6379',
    );
    const client = new Redis(redisUrl, {
      connectTimeout: 2000,
      maxRetriesPerRequest: 1,
      enableReadyCheck: false,
      lazyConnect: true,
    });

    try {
      await client.connect();
      const pong = await client.ping();
      await client.quit();
      return this.getStatus(key, true, { ping: pong });
    } catch (err) {
      this.logger.warn(`Redis health check failed: ${err}`);
      try {
        await client.quit();
      } catch {
        // ignore
      }
      return this.getStatus(key, false, { message: String(err) });
    }
  }
}

@Injectable()
export class StorageHealthIndicator extends HealthIndicator {
  private readonly logger = new Logger(StorageHealthIndicator.name);

  constructor(private readonly configService: ConfigService) {
    super();
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    const endpoint = this.configService.get<string>('MINIO_ENDPOINT', 'localhost');
    const port = this.configService.get<number>('MINIO_PORT', 9000);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      try {
        const scheme = this.configService.get<boolean>('MINIO_USE_SSL', false) ? 'https' : 'http';
        const url = `${scheme}://${endpoint}:${port}/minio/health/live`;
        const response = await fetch(url, { signal: controller.signal, method: 'GET' });
        if (!response.ok) throw new Error(`Storage health endpoint returned HTTP ${response.status}`);
      } finally {
        clearTimeout(timeoutId);
      }
      return this.getStatus(key, true);
    } catch (err) {
      this.logger.warn(`MinIO/Storage health check failed: ${err}`);
      return this.getStatus(key, false, {
        message: String(err),
        checkedEndpoint: `${endpoint}:${port}`,
      });
    }
  }
}

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly prismaHealthIndicator: PrismaHealthIndicator,
    private readonly redisHealthIndicator: RedisHealthIndicator,
    private readonly storageHealthIndicator: StorageHealthIndicator,
  ) {}

  @Public()
  @Get('metrics')
  metrics() {
    return {
      status: 'ok',
      service: 'lookiva-api',
      ...requestMetricsSnapshot(),
    };
  }

  @Public()
  @Get()
  @HealthCheck()
  async check() {
    try {
      const result = await this.health.check([
        async () => this.prismaHealthIndicator.isHealthy('database'),
        async () => this.redisHealthIndicator.isHealthy('redis'),
        async () => this.storageHealthIndicator.isHealthy('storage'),
      ]);

      const info: Record<string, unknown> = {};
      const details: Record<string, unknown> = {};
      let overallStatus = result.status;

      if (result.details) {
        for (const [k, v] of Object.entries(result.details)) {
          details[k] = v;
          const entry = v as Record<string, unknown>;
          if (entry.status === 'up') {
            info[k] = entry;
          }
        }
      }

      const errorEntries: Record<string, unknown> = {};
      if (result.details) {
        for (const [k, v] of Object.entries(result.details)) {
          const entry = v as Record<string, unknown>;
          if (entry.status === 'down') {
            errorEntries[k] = entry;
            overallStatus = 'error';
          }
        }
      }

      return {
        status: overallStatus,
        info,
        error: Object.keys(errorEntries).length > 0 ? errorEntries : {},
        details,
      };
    } catch (err) {
      const fallback: Record<string, unknown> = {};
      try {
        fallback.database = (await this.prismaHealthIndicator.isHealthy(
          'database',
        )) as unknown;
      } catch (dbErr) {
        fallback.database = { status: 'down', message: String(dbErr) };
      }
      return {
        status: 'error',
        info: {},
        error: { message: String(err) },
        details: fallback,
      };
    }
  }
}
