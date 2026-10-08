import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateHoldDto {
  @IsString()
  companyId!: string;

  @IsString()
  branchId!: string;

  @IsOptional()
  @IsString()
  customerId?: string;

  @IsOptional()
  @IsString()
  professionalId?: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  serviceIds!: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  resourceIds?: string[];

  @IsDateString()
  startsAt!: string;

  @IsOptional()
  @IsDateString()
  endsAt?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  guestCount?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(30)
  holdMinutes?: number;

  @IsOptional()
  @IsString()
  createdByIp?: string;
}

export class CreateAppointmentDto extends CreateHoldDto {
  @IsOptional()
  @IsString()
  holdToken?: string;

  @IsOptional()
  @IsString()
  notesCustomer?: string;

  @IsOptional()
  @IsString()
  notesStaff?: string;

  @IsOptional()
  @IsBoolean()
  isWalkIn?: boolean;

  @IsOptional()
  @IsBoolean()
  isHomeService?: boolean;

  @IsOptional()
  @IsString()
  source?: string;
}

export class CancelAppointmentDto {
  @IsString()
  reason!: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class RescheduleAppointmentDto {
  @IsDateString()
  startsAt!: string;

  @IsOptional()
  @IsDateString()
  endsAt?: string;

  @IsOptional()
  @IsString()
  professionalId?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  resourceIds?: string[];

  @IsOptional()
  @IsString()
  reason?: string;
}

export class CheckInDto {
  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number;

  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number;
}

export class QrCheckInDto extends CheckInDto {
  @IsString()
  token!: string;
}

export class FloorStatusDto {
  @IsString()
  state!: string;
}

export class AppointmentTransitionDto {
  @IsOptional()
  @IsString()
  notes?: string;
}

export class JoinQueueDto {
  @IsOptional()
  @IsString()
  queueId?: string;

  @IsOptional()
  @IsString()
  customerId?: string;

  @IsOptional()
  @IsString()
  customerName?: string;

  @IsOptional()
  @IsString()
  customerPhone?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  serviceIds?: string[];

  @IsOptional()
  @IsString()
  professionalId?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class QueueEntryActionDto {
  @IsOptional()
  @IsString()
  notes?: string;
}

export class GroupBookingParticipantDto {
  @IsOptional()
  @IsString()
  customerId?: string;

  @IsOptional()
  @IsString()
  professionalId?: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  serviceIds!: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  resourceIds?: string[];

  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateGroupBookingDto {
  @IsString()
  companyId!: string;

  @IsString()
  branchId!: string;

  @IsDateString()
  startsAt!: string;

  @IsOptional()
  @IsString()
  notesCustomer?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => GroupBookingParticipantDto)
  participants!: GroupBookingParticipantDto[];
}
