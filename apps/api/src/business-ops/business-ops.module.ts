import { Module } from '@nestjs/common';
import { BusinessOpsController } from './business-ops.controller';
import { BusinessOpsService } from './business-ops.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  controllers: [BusinessOpsController],
  providers: [BusinessOpsService],
})
export class BusinessOpsModule {}
