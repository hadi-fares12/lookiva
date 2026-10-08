import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { PrismaModule } from '../prisma/prisma.module';
import { PlatformOpsV2Controller } from './platform-ops-v2.controller';
import { PlatformOpsV2Service } from './platform-ops-v2.service';

@Module({
  imports: [PrismaModule, BullModule.registerQueue({ name: 'dead-letter-queue' })],
  controllers: [PlatformOpsV2Controller],
  providers: [PlatformOpsV2Service],
})
export class PlatformOpsV2Module {}
