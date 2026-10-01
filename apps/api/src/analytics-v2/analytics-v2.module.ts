import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AnalyticsV2Controller } from './analytics-v2.controller';
import { AnalyticsV2Service } from './analytics-v2.service';

@Module({
  imports: [PrismaModule],
  controllers: [AnalyticsV2Controller],
  providers: [AnalyticsV2Service],
})
export class AnalyticsV2Module {}
