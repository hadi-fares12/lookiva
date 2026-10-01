import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsIn,
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUrl,
  Length,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export class PatchCustomerProfileDto {
  @IsOptional() @IsString() @Length(1, 80) firstName?: string;
  @IsOptional() @IsString() @Length(1, 80) lastName?: string;
  @IsOptional() @IsString() @Length(2, 10) locale?: string;
  @IsOptional() @IsIn(['midnight-gold', 'silver-light', 'system']) themeMode?: string;
  @IsOptional() @IsString() avatarMediaId?: string | null;
  @IsOptional() @IsString() @Length(0, 1200) bio?: string | null;
  @IsOptional() @IsUrl({ require_protocol: true }) websiteUrl?: string | null;
  @IsOptional() @IsString() @Length(0, 100) instagramHandle?: string | null;
  @IsOptional() @IsString() @Length(0, 100) tiktokHandle?: string | null;
  @IsOptional() @IsString() countryId?: string;
  @IsOptional() @IsString() cityId?: string | null;
}

export class UserPreferencesPatchDto {
  @IsOptional() @IsBoolean() email_marketing?: boolean;
  @IsOptional() @IsBoolean() email_bookings?: boolean;
  @IsOptional() @IsBoolean() email_reviews?: boolean;
  @IsOptional() @IsBoolean() push_marketing?: boolean;
  @IsOptional() @IsBoolean() push_bookings?: boolean;
  @IsOptional() @IsBoolean() push_reviews?: boolean;
  @IsOptional() @IsBoolean() push_messages?: boolean;
  @IsOptional() @IsBoolean() push_system?: boolean;
  @IsOptional() @IsBoolean() sms_bookings?: boolean;
  @IsOptional() @IsBoolean() sms_reminders?: boolean;
  @IsOptional() @IsBoolean() nearby_enabled?: boolean;
  @IsOptional() @Type(() => Number) @IsInt() @Min(100) @Max(100000) nearby_radius_meters?: number;
  @IsOptional() @IsBoolean() auto_translate?: boolean;
  @IsOptional() @IsBoolean() reduced_motion?: boolean;
  @IsOptional() @IsBoolean() high_contrast?: boolean;
  @IsOptional() @IsBoolean() show_verified_only?: boolean;
  @IsOptional() @IsString() default_payment_method_id?: string | null;
}

export class NotificationPreferencesPatchDto extends UserPreferencesPatchDto {
  @IsOptional() @IsObject() do_not_disturb?: Record<string, unknown> | null;
  @IsOptional() @IsArray() @IsString({ each: true }) muted_types?: string[];
  @IsOptional() @IsBoolean() sound_enabled?: boolean;
  @IsOptional() @IsBoolean() vibration_enabled?: boolean;
  @IsOptional() @IsBoolean() led_enabled?: boolean;
}

export class LocationPreferencesPatchDto {
  @IsOptional() @IsBoolean() gps_enabled?: boolean;
  @IsOptional() @IsBoolean() approximate_location?: boolean;
  @IsOptional() @IsString() home_area_id?: string | null;
  @IsOptional() @IsString() work_area_id?: string | null;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(-90) @Max(90) home_latitude?: number | null;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(-180) @Max(180) home_longitude?: number | null;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(-90) @Max(90) work_latitude?: number | null;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(-180) @Max(180) work_longitude?: number | null;
  @IsOptional() @Type(() => Number) @IsInt() @Min(100) @Max(100000) search_radius_default_m?: number;
}

export class NearbyPreferencesPatchDto {
  @IsOptional() @IsBoolean() enabled?: boolean;
  @IsOptional() @Type(() => Number) @IsInt() @Min(100) @Max(100000) distance_threshold_meters?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) @Max(5) min_rating?: number | null;
  @IsOptional() @IsArray() @IsString({ each: true }) category_ids?: string[];
  @IsOptional() @IsBoolean() favorite_businesses_only?: boolean;
  @IsOptional() @IsBoolean() followed_professionals_only?: boolean;
  @IsOptional() @IsBoolean() include_offers?: boolean;
  @IsOptional() @IsBoolean() include_availability?: boolean;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(50) daily_max_notifications?: number;
  @IsOptional() @IsString() @Length(5, 5) quiet_hours_start?: string | null;
  @IsOptional() @IsString() @Length(5, 5) quiet_hours_end?: string | null;
  @IsOptional() @IsString() quiet_hours_timezone?: string | null;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(10080) cooldown_minutes_business?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(10080) cooldown_minutes_category?: number;
}

export class UpdateCustomerPreferencesDto {
  @IsOptional() @ValidateNested() @Type(() => UserPreferencesPatchDto)
  user_preferences?: UserPreferencesPatchDto;

  @IsOptional() @ValidateNested() @Type(() => NotificationPreferencesPatchDto)
  notification_preferences?: NotificationPreferencesPatchDto;

  @IsOptional() @ValidateNested() @Type(() => LocationPreferencesPatchDto)
  location_preferences?: LocationPreferencesPatchDto;

  @IsOptional() @ValidateNested() @Type(() => NearbyPreferencesPatchDto)
  nearby_notification_preferences?: NearbyPreferencesPatchDto;
}
