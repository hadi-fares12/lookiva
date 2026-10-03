import { Module } from '@nestjs/common';
import { CustomerOpsController } from './customer-ops.controller';
import { CustomerOpsService } from './customer-ops.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  controllers: [CustomerOpsController],
  providers: [CustomerOpsService],
})
export class CustomerOpsModule {}
