import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { SocialV2Controller } from './social-v2.controller';
import { SocialV2Service } from './social-v2.service';

@Module({
  imports: [PrismaModule],
  controllers: [SocialV2Controller],
  providers: [SocialV2Service],
})
export class SocialV2Module {}
