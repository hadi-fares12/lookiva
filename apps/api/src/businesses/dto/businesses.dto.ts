import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsBoolean, IsEmail, IsInt, IsNumber, IsOptional, IsString, IsUrl, Length, Max, Min } from 'class-validator';

export class BusinessIncludeQueryDto {
  @ApiPropertyOptional({
    description: 'Comma-separated list of includes: branches,services,professionals,reviews',
    type: String,
  })
  @IsOptional()
  @IsString()
  include?: string;

  @ApiPropertyOptional({ type: Number })
  @IsOptional()
  @Type(() => Number)
  viewerLat?: number;

  @ApiPropertyOptional({ type: Number })
  @IsOptional()
  @Type(() => Number)
  viewerLon?: number;
}

export class PaginationQueryDto {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}

export class BusinessListQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ type: Number })
  @IsOptional()
  @Type(() => Number)
  viewerLat?: number;

  @ApiPropertyOptional({ type: Number })
  @IsOptional()
  @Type(() => Number)
  viewerLon?: number;
}

export class PatchBusinessDto {
  @ApiPropertyOptional({ type: String })
  @IsOptional() @IsString() @Length(1, 180)
  display_name?: string;

  @ApiPropertyOptional({ type: String, nullable: true })
  @IsOptional() @IsString() @Length(0, 240)
  tagline?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  @IsOptional() @IsString() @Length(0, 1000)
  description_short?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  @IsOptional() @IsString()
  description_long?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  @IsOptional() @IsUrl({ require_protocol: true })
  website_url?: string | null;

  @ApiPropertyOptional({ type: Boolean })
  @IsOptional() @IsBoolean()
  booking_enabled?: boolean;

  @ApiPropertyOptional({ type: Boolean })
  @IsOptional() @IsBoolean()
  walk_ins_enabled?: boolean;

  @ApiPropertyOptional({ type: Boolean })
  @IsOptional() @IsBoolean()
  online_payments_enabled?: boolean;

  @ApiPropertyOptional({ type: Boolean })
  @IsOptional() @IsBoolean()
  auto_confirm_bookings?: boolean;

  @ApiPropertyOptional({ type: Boolean })
  @IsOptional() @IsBoolean()
  deposit_required?: boolean;

  @ApiPropertyOptional({ type: Number, minimum: 0, maximum: 100 })
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) @Max(100)
  deposit_percent?: number;

  @ApiPropertyOptional({ type: Number, minimum: 0 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(0)
  min_booking_notice_minutes?: number;

  @ApiPropertyOptional({ type: Number, minimum: 1, maximum: 730 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(730)
  max_booking_advance_days?: number;

  @ApiPropertyOptional({ type: Number, minimum: 0, maximum: 720 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(720)
  cancellation_policy_hours?: number;

  @ApiPropertyOptional({ type: Number, minimum: 0, maximum: 100 })
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) @Max(100)
  cancellation_fee_percent?: number;

  @ApiPropertyOptional({ type: Number, minimum: 0, maximum: 100 })
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) @Max(100)
  no_show_fee_percent?: number;
}


export class CreateBusinessApplicationDto {
  @IsString() @Length(2, 120)
  ownerFullName!: string;

  @IsEmail()
  ownerEmail!: string;

  @IsOptional() @IsString() @Length(5, 30)
  ownerPhone?: string;

  @IsString() @Length(2, 180)
  businessName!: string;

  @IsString()
  countryId!: string;

  @IsArray() @ArrayMinSize(1) @IsString({ each: true })
  categoryIds!: string[];

  @IsOptional() @IsString() @Length(0, 1000)
  description?: string;

  @IsOptional() @IsUrl({ require_protocol: true })
  websiteUrl?: string;

  @IsOptional() @IsString()
  addressLine1?: string;

  @IsOptional() @IsNumber() @Min(-90) @Max(90)
  latitude?: number;

  @IsOptional() @IsNumber() @Min(-180) @Max(180)
  longitude?: number;

  @IsOptional() @IsString() @Length(5, 30)
  whatsapp?: string;

  @IsOptional() @IsString() @Length(0, 120)
  instagramHandle?: string;

  @IsOptional() @IsString()
  registrationNumber?: string;

  @IsOptional() @IsString()
  taxIdNumber?: string;

  @IsOptional() @IsArray() @IsString({ each: true })
  documentMediaIds?: string[];

  @IsOptional() @IsString() @Length(0, 2000)
  notes?: string;
}
