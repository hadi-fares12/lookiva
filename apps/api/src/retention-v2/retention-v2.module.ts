import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { RetentionV2Controller } from './retention-v2.controller';
import { RetentionV2Service } from './retention-v2.service';

@Module({
  imports: [PrismaModule],
  controllers: [RetentionV2Controller],
  providers: [RetentionV2Service],
})
export class RetentionV2Module {}
