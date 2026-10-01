import {
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export class TrackAnalyticsEventDto {
  @IsString()
  eventName!: string;

  @IsString()
  eventCategory!: string;

  @IsOptional()
  @IsString()
  companyId?: string;

  @IsOptional()
  @IsString()
  branchId?: string;

  @IsOptional()
  @IsString()
  professionalId?: string;

  @IsOptional()
  @IsString()
  serviceId?: string;

  @IsOptional()
  @IsString()
  appointmentId?: string;

  @IsOptional()
  @IsString()
  screenName?: string;
}

export class UpsertDailySnapshotDto {
  @IsDateString()
  snapshotDate!: string;

  @IsString()
  companyId!: string;

  @IsOptional()
  @IsString()
  branchId?: string;

  @IsOptional()
  @IsString()
  professionalId?: string;

  @IsString()
  metricKey!: string;

  @IsNumber()
  metricValue!: number;

  @IsString()
  category!: string;

  @IsOptional()
  @IsString()
  currencyCode?: string;
}
