import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { BookingV2Controller } from './booking-v2.controller';
import { BookingV2Service } from './booking-v2.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { RealtimeModule } from '../realtime/realtime.module';

@Module({
  imports: [PrismaModule, NotificationsModule, RealtimeModule],
  controllers: [BookingV2Controller],
  providers: [BookingV2Service],
  exports: [BookingV2Service],
})
export class BookingV2Module {}
