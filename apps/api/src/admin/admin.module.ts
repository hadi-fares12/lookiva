import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AuthModule } from '../auth/auth.module';
import { FinanceV2Module } from '../finance-v2/finance-v2.module';
import { BookingV2Module } from '../booking-v2/booking-v2.module';

@Module({
  imports: [AuthModule, FinanceV2Module, BookingV2Module],
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}
