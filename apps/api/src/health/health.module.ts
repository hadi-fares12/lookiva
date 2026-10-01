import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import {
  HealthController,
  PrismaHealthIndicator,
  RedisHealthIndicator,
  StorageHealthIndicator,
} from './health.controller';

@Module({
  imports: [TerminusModule],
  controllers: [HealthController],
  providers: [
    PrismaHealthIndicator,
    RedisHealthIndicator,
    StorageHealthIndicator,
  ],
})
export class HealthModule {}
