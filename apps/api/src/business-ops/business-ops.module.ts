import { Module } from '@nestjs/common';
import { BusinessOpsController } from './business-ops.controller';
import { BusinessOpsService } from './business-ops.service';

@Module({
  controllers: [BusinessOpsController],
  providers: [BusinessOpsService],
})
export class BusinessOpsModule {}
