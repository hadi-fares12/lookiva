import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/types/request-with-user';
import { CustomerOpsService } from './customer-ops.service';

@ApiTags('Customer Operations')
@ApiBearerAuth()
@Controller('customer-ops')
export class CustomerOpsController {
  constructor(private readonly ops: CustomerOpsService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Authenticated customer account dashboard' })
  dashboard(@CurrentUser() user: AuthenticatedUser) { return this.ops.dashboard(user.id); }

  @Get('bookings')
  bookings(@CurrentUser() user: AuthenticatedUser, @Query('status') status?: string, @Query('limit') limit?: string) {
    return this.ops.bookings(user.id, status, Number(limit) || 100);
  }

  @Get('bookings/:id')
  booking(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) { return this.ops.booking(user.id, id); }

  @Get('bookings/:id/consents')
  bookingConsents(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.ops.bookingConsents(user.id, id);
  }

  @Post('bookings/:id/consents/:formId/sign')
  signBookingConsent(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Param('formId') formId: string,
    @Body() body: {
      accepted?: boolean;
      typedSignature?: string;
      responses?: Record<string, unknown>;
    },
  ) {
    return this.ops.signBookingConsent(user.id, id, formId, body);
  }

  @Get('conversations')
  conversations(@CurrentUser() user: AuthenticatedUser) { return this.ops.conversations(user.id); }

  @Get('conversations/:id/messages')
  messages(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Query('limit') limit?: string) {
    return this.ops.messages(user.id, id, Number(limit) || 100);
  }

  @Post('conversations/:id/messages')
  sendMessage(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: { body: string; messageType?: string }) {
    return this.ops.sendMessage(user.id, id, body.body, body.messageType || 'text');
  }

  @Get('retention')
  retention(@CurrentUser() user: AuthenticatedUser) { return this.ops.retention(user.id); }

  @Get('reviews')
  reviews(@CurrentUser() user: AuthenticatedUser) { return this.ops.reviews(user.id); }
}
