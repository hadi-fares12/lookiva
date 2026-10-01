import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDefined,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Max,
  Min,
} from 'class-validator';

export class SetActiveDto {
  @IsBoolean()
  isActive!: boolean;

  @IsOptional()
  @IsString()
  @Length(0, 500)
  reason?: string;
}

export class ReviewBusinessVerificationDto {
  @IsIn(['approved', 'rejected', 'reviewing'])
  status!: 'approved' | 'rejected' | 'reviewing';

  @IsOptional()
  @IsString()
  @Length(0, 1000)
  reason?: string;
}

export class UpdateFeatureFlagDto {
  @IsOptional() @IsBoolean() isEnabled?: boolean;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(100) rolloutPercent?: number;
  @IsOptional() @IsArray() @IsString({ each: true }) userIds?: string[];
  @IsOptional() @IsArray() @IsString({ each: true }) countryCodes?: string[];
  @IsOptional() @IsString() environment?: string;
}

export class UpdateRemoteConfigDto {
  @IsDefined()
  value!: unknown;
  @IsOptional() @IsString() valueType?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsBoolean() isPublic?: boolean;
  @IsOptional() @IsString() minAppVersion?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) platforms?: string[];
}

export class UpdateCategoryDto {
  @IsOptional() @IsString() @Length(1, 150) name?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() iconKey?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsOptional() @IsBoolean() isFeatured?: boolean;
  @IsOptional() @Type(() => Number) @IsInt() sortOrder?: number;
}

export class UpdateCountryDto {
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsOptional() @IsString() currencyCode?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) timezones?: string[];
  @IsOptional() @Type(() => Number) @IsInt() sortOrder?: number;
}

export class UpdateThemeDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsDefined() palette?: unknown;
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsOptional() @IsBoolean() isDefault?: boolean;
  @IsOptional() @Type(() => Number) @IsInt() sortOrder?: number;
}

export class UpdateSupportTicketDto {
  @IsOptional() @IsIn(['open', 'in_progress', 'waiting_customer', 'resolved', 'closed']) status?: string;
  @IsOptional() @IsIn(['low', 'normal', 'high', 'urgent']) priority?: string;
  @IsOptional() @IsString() assignedToId?: string;
}

export class ResolveDisputeDto {
  @IsIn(['reviewing', 'resolved', 'closed', 'rejected'])
  status!: string;
  @IsOptional() @IsString() resolution?: string;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) resolutionAmount?: number;
}
