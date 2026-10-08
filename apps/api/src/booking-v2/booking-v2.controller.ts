import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PermissionKey } from '@lookiva/shared-types';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { AuthenticatedUser } from '../auth/types/request-with-user';
import { BookingV2Service } from './booking-v2.service';
import {
  CancelAppointmentDto,
  CheckInDto,
  QrCheckInDto,
  CreateAppointmentDto,
  CreateGroupBookingDto,
  CreateHoldDto,
  JoinQueueDto,
  QueueEntryActionDto,
  RescheduleAppointmentDto,
  FloorStatusDto,
  AppointmentTransitionDto,
} from './dto/booking-v2.dto';

@ApiTags('Booking Engine V2')
@ApiBearerAuth()
@Controller('booking-v2')
export class BookingV2Controller {
  constructor(private readonly booking: BookingV2Service) {}

  @Get('availability')
  @RequirePermissions(PermissionKey.BookingView)
  @ApiOperation({ summary: 'Check professional/resource conflicts for a proposed booking window' })
  availability(
    @Query('branchId') branchId: string,
    @Query('startsAt') startsAt: string,
    @Query('endsAt') endsAt: string,
    @Query('professionalId') professionalId?: string,
    @Query('resourceIds') resourceIds?: string,
  ) {
    return this.booking.checkAvailability({
      branchId,
      startsAt,
      endsAt,
      professionalId,
      resourceIds: resourceIds ? resourceIds.split(',').filter(Boolean) : [],
    });
  }

  @Post('holds')
  @RequirePermissions(PermissionKey.BookingCreate)
  @ApiOperation({ summary: 'Create an expiring booking hold after conflict checks' })
  createHold(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateHoldDto,
  ) {
    return this.booking.createHold(user, dto);
  }

  @Post('appointments')
  @RequirePermissions(PermissionKey.BookingCreate)
  @ApiOperation({ summary: 'Create an appointment, optionally converting a hold' })
  createAppointment(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateAppointmentDto,
  ) {
    return this.booking.createAppointment(user, dto);
  }

  @Post('group-bookings')
  @RequirePermissions(PermissionKey.BookingGroupManage)
  @ApiOperation({ summary: 'Create a group booking with multiple participants/services/resources' })
  createGroupBooking(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateGroupBookingDto,
  ) {
    return this.booking.createGroupBooking(user, dto);
  }

  @Patch('appointments/:id/cancel')
  @RequirePermissions(PermissionKey.BookingCancel)
  @ApiOperation({ summary: 'Cancel an appointment and record status history' })
  cancel(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: CancelAppointmentDto,
  ) {
    return this.booking.cancelAppointment(user, id, dto);
  }

  @Patch('appointments/:id/reschedule')
  @RequirePermissions(PermissionKey.BookingEdit)
  @ApiOperation({ summary: 'Reschedule an appointment after rechecking availability' })
  reschedule(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: RescheduleAppointmentDto,
  ) {
    return this.booking.rescheduleAppointment(user, id, dto);
  }

  @Get('appointments/:id/check-in-token')
  @RequirePermissions(PermissionKey.BookingView)
  @ApiOperation({ summary: 'Create a short-lived signed QR token for appointment check-in' })
  checkInToken(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.booking.createCheckInToken(user, id);
  }

  @Patch('appointments/check-in-by-token')
  @RequirePermissions(PermissionKey.BookingCheckIn)
  @ApiOperation({ summary: 'Check in a customer by scanning a signed appointment token' })
  checkInByToken(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: QrCheckInDto,
  ) {
    return this.booking.checkInByToken(user, dto);
  }

  @Patch('appointments/:id/check-in')
  @RequirePermissions(PermissionKey.BookingCheckIn)
  @ApiOperation({ summary: 'Check in a customer for an appointment' })
  checkIn(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: CheckInDto,
  ) {
    return this.booking.checkIn(user, id, dto);
  }


  @Patch('appointments/:id/floor-status')
  @RequirePermissions(PermissionKey.BookingManage)
  @ApiOperation({ summary: 'Advance floor-board state through ready, started, completed, paid and checked-out' })
  floorStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: FloorStatusDto,
  ) {
    return this.booking.updateFloorStatus(user, id, dto.state);
  }

  @Patch('appointments/:id/start')
  @RequirePermissions(PermissionKey.BookingManage)
  @ApiOperation({ summary: 'Start service for a checked-in appointment' })
  start(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: AppointmentTransitionDto) {
    return this.booking.startAppointment(user, id, dto.notes);
  }

  @Patch('appointments/:id/complete')
  @RequirePermissions(PermissionKey.BookingManage)
  @ApiOperation({ summary: 'Complete an in-progress appointment' })
  complete(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: AppointmentTransitionDto) {
    return this.booking.completeAppointment(user, id, dto.notes);
  }

  @Patch('appointments/:id/no-show')
  @RequirePermissions(PermissionKey.BookingManage)
  @ApiOperation({ summary: 'Mark a pending/confirmed appointment as no-show' })
  noShow(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: AppointmentTransitionDto) {
    return this.booking.markNoShow(user, id, dto.notes);
  }

  @Get('queues/:branchId')
  @RequirePermissions(PermissionKey.BookingQueueManage)
  @ApiOperation({ summary: 'Read active queues and waiting entries for a branch' })
  getQueue(@CurrentUser() user: AuthenticatedUser, @Param('branchId') branchId: string) {
    return this.booking.getQueues(user, branchId);
  }

  @Post('queues/:branchId/join')
  @RequirePermissions(PermissionKey.BookingCreate)
  @ApiOperation({ summary: 'Join a live walk-in queue' })
  joinQueue(
    @CurrentUser() user: AuthenticatedUser,
    @Param('branchId') branchId: string,
    @Body() dto: JoinQueueDto,
  ) {
    return this.booking.joinQueue(user, branchId, dto);
  }

  @Patch('queue-entries/:id/leave')
  @RequirePermissions(PermissionKey.BookingCreate)
  @ApiOperation({ summary: 'Leave or cancel a queue entry' })
  leaveQueue(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: QueueEntryActionDto) {
    return this.booking.updateQueueEntryStatus(user, id, 'cancelled', dto.notes, true);
  }

  @Patch('queue-entries/:id/call')
  @RequirePermissions(PermissionKey.BookingQueueManage)
  @ApiOperation({ summary: 'Mark a queue entry as called' })
  callQueueEntry(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: QueueEntryActionDto) {
    return this.booking.updateQueueEntryStatus(user, id, 'called', dto.notes);
  }

  @Patch('queue-entries/:id/serve')
  @RequirePermissions(PermissionKey.BookingQueueManage)
  @ApiOperation({ summary: 'Mark a queue entry as served' })
  serveQueueEntry(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: QueueEntryActionDto) {
    return this.booking.updateQueueEntryStatus(user, id, 'served', dto.notes);
  }
}
