import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { SocialV2Controller } from './social-v2.controller';
import { SocialV2Service } from './social-v2.service';
import { BookingV2Module } from '../booking-v2/booking-v2.module';

@Module({
  imports: [PrismaModule, BookingV2Module],
  controllers: [SocialV2Controller],
  providers: [SocialV2Service],
})
export class SocialV2Module {}
