import { Type } from 'class-transformer';
import {
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsEmail,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Max,
  Min,
} from 'class-validator';

export class CreateServiceDto {
  @IsString() categoryId!: string;
  @IsString() @Length(1, 150) name!: string;
  @IsOptional() @IsString() summary?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() slug?: string;
  @IsArray() @ArrayUnique() @IsString({ each: true }) branchIds!: string[];
  @IsOptional() @IsArray() @ArrayUnique() @IsString({ each: true }) professionalIds?: string[];
  @IsOptional() @IsArray() @ArrayUnique() @IsString({ each: true }) resourceIds?: string[];
  @Type(() => Number) @IsInt() @Min(1) @Max(1440) durationMinutes!: number;
  @Type(() => Number) @IsNumber() @Min(0) basePrice!: number;
  @IsString() @Length(3, 3) currencyCode!: string;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) @Max(100) depositPercent?: number;
  @IsOptional() @IsBoolean() homeServiceAllowed?: boolean;
  @IsOptional() @IsBoolean() walkInsAllowed?: boolean;
  @IsOptional() @IsBoolean() onlinePaymentRequired?: boolean;
  @IsOptional() @IsArray() @ArrayUnique() @IsString({ each: true }) tags?: string[];
}

export class UpdateServiceDto {
  @IsOptional() @IsString() categoryId?: string;
  @IsOptional() @IsString() @Length(1, 150) name?: string;
  @IsOptional() @IsString() summary?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsArray() @ArrayUnique() @IsString({ each: true }) branchIds?: string[];
  @IsOptional() @IsArray() @ArrayUnique() @IsString({ each: true }) professionalIds?: string[];
  @IsOptional() @IsArray() @ArrayUnique() @IsString({ each: true }) resourceIds?: string[];
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(1440) durationMinutes?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) basePrice?: number;
  @IsOptional() @IsString() @Length(3, 3) currencyCode?: string;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) @Max(100) depositPercent?: number;
  @IsOptional() @IsBoolean() homeServiceAllowed?: boolean;
  @IsOptional() @IsBoolean() walkInsAllowed?: boolean;
  @IsOptional() @IsBoolean() onlinePaymentRequired?: boolean;
  @IsOptional() @IsArray() @ArrayUnique() @IsString({ each: true }) tags?: string[];
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsOptional() @IsBoolean() isFeatured?: boolean;
}

export class CreateResourceDto {
  @IsOptional() @IsString() branchId?: string;
  @IsOptional() @IsString() resourceTypeId?: string;
  @IsString() @Length(1, 150) name!: string;
  @IsString() @Length(1, 80) type!: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() iconKey?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) quantity?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) capacityPerSlot?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) hourlyCost?: number;
  @IsOptional() @IsString() @Length(3, 3) currencyCode?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) tags?: string[];
}

export class UpdateResourceDto {
  @IsOptional() @IsString() branchId?: string;
  @IsOptional() @IsString() resourceTypeId?: string;
  @IsOptional() @IsString() @Length(1, 150) name?: string;
  @IsOptional() @IsString() type?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() iconKey?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) quantity?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) capacityPerSlot?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) hourlyCost?: number;
  @IsOptional() @IsString() @Length(3, 3) currencyCode?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) tags?: string[];
  @IsOptional() @IsBoolean() isActive?: boolean;
}

export class CreatePromotionDto {
  @IsOptional() @IsString() branchId?: string;
  @IsString() @Length(1, 150) name!: string;
  @IsOptional() @IsString() description?: string;
  @IsIn(['percentage', 'fixed', 'first_visit', 'happy_hour', 'last_minute', 'bundle']) promotionType!: string;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) @Max(100) valuePercent?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) valueFixed?: number;
  @IsDateString() startsAt!: string;
  @IsOptional() @IsDateString() endsAt?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) eligibleServiceIds?: string[];
  @IsOptional() @IsArray() @IsString({ each: true }) eligibleProfessionalIds?: string[];
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) usageLimit?: number;
  @IsOptional() @IsBoolean() isPublic?: boolean;
}

export class UpdatePromotionDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) @Max(100) valuePercent?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) valueFixed?: number;
  @IsOptional() @IsDateString() startsAt?: string;
  @IsOptional() @IsDateString() endsAt?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) eligibleServiceIds?: string[];
  @IsOptional() @IsArray() @IsString({ each: true }) eligibleProfessionalIds?: string[];
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) usageLimit?: number;
  @IsOptional() @IsBoolean() isPublic?: boolean;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

export class CreateQueueDto {
  @IsString() branchId!: string;
  @IsOptional() @IsString() @Length(1, 120) name?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(240) estimatedWaitPerPersonMinutes?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(500) maxWaiting?: number;
}

export class UpdateQueueDto {
  @IsOptional() @IsString() @Length(1, 120) name?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(240) estimatedWaitPerPersonMinutes?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(500) maxWaiting?: number;
  @IsOptional() @IsBoolean() isActive?: boolean;
}


export class CreateBusinessUserDto {
  @IsString() @Length(2, 120)
  fullName!: string;

  @IsOptional() @IsEmail()
  email?: string;

  @IsOptional() @IsString() @Length(5, 30)
  phone?: string;

  @IsIn(['business_manager', 'branch_manager', 'professional', 'staff'])
  roleKey!: string;

  @IsOptional() @IsString()
  branchId?: string;

  @IsOptional() @IsString() @Length(2, 120)
  professionalDisplayName?: string;

  @IsOptional() @IsArray() @ArrayUnique() @IsString({ each: true })
  specialties?: string[];
}

export class UpdateBusinessUserDto {
  @IsOptional() @IsString() @Length(2, 120)
  fullName?: string;

  @IsOptional() @IsString() @Length(5, 30)
  phone?: string;

  @IsOptional() @IsIn(['business_manager', 'branch_manager', 'professional', 'staff'])
  roleKey?: string;

  @IsOptional() @IsString()
  branchId?: string;

  @IsOptional() @IsBoolean()
  isActive?: boolean;

  @IsOptional() @IsString() @Length(2, 120)
  professionalDisplayName?: string;

  @IsOptional() @IsArray() @ArrayUnique() @IsString({ each: true })
  specialties?: string[];
}


export class CreateBranchDto {
  @IsString() @Length(1, 150)
  name!: string;

  @IsOptional() @IsString()
  addressLine1?: string;

  @IsOptional() @IsString()
  phone?: string;

  @IsOptional() @IsString()
  whatsapp?: string;

  @IsOptional() @IsString()
  instagramHandle?: string;

  @IsOptional() @IsNumber() @Min(-90) @Max(90)
  latitude?: number;

  @IsOptional() @IsNumber() @Min(-180) @Max(180)
  longitude?: number;

  @IsOptional() @IsBoolean()
  bookingEnabled?: boolean;

  @IsOptional() @IsBoolean()
  walkInsEnabled?: boolean;

  @IsOptional() @IsBoolean()
  homeServiceEnabled?: boolean;
}

export class UpdateBranchDto {
  @IsOptional() @IsString() @Length(1, 150)
  name?: string;

  @IsOptional() @IsString()
  addressLine1?: string;

  @IsOptional() @IsString()
  phone?: string;

  @IsOptional() @IsString()
  whatsapp?: string;

  @IsOptional() @IsString()
  instagramHandle?: string;

  @IsOptional() @IsNumber() @Min(-90) @Max(90)
  latitude?: number;

  @IsOptional() @IsNumber() @Min(-180) @Max(180)
  longitude?: number;

  @IsOptional() @IsBoolean()
  bookingEnabled?: boolean;

  @IsOptional() @IsBoolean()
  walkInsEnabled?: boolean;

  @IsOptional() @IsBoolean()
  homeServiceEnabled?: boolean;

  @IsOptional() @IsBoolean()
  isActive?: boolean;
}
