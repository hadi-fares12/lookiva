import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { FinanceV2Controller } from './finance-v2.controller';
import { FinanceV2Service } from './finance-v2.service';
import { PaymentProviderService } from './payment-provider.service';

@Module({
  imports: [PrismaModule],
  controllers: [FinanceV2Controller],
  providers: [FinanceV2Service, PaymentProviderService],
  exports: [FinanceV2Service, PaymentProviderService],
})
export class FinanceV2Module {}
