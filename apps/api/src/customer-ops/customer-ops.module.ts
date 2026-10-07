import { Module } from '@nestjs/common';
import { CustomerOpsController } from './customer-ops.controller';
import { CustomerOpsService } from './customer-ops.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { RealtimeModule } from '../realtime/realtime.module';
import { MediaModule } from '../media/media.module';

@Module({
  imports: [NotificationsModule, RealtimeModule, MediaModule],
  controllers: [CustomerOpsController],
  providers: [CustomerOpsService],
})
export class CustomerOpsModule {}
