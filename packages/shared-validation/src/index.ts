import { z } from 'zod';
import {
  IsString,
  IsInt,
  IsOptional,
  IsNumber,
  Min,
  Max,
  IsEmail,
  Length,
  IsEnum,
  IsPositive,
  Matches,
  Validate,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';

export const registerZodSchema = z.object({
  email: z.optional(z.string().email().max(255)),
  phone: z.optional(z.string().max(32)),
  password: z.string().min(8).max(128),
  firstName: z.string().min(2).max(50),
  lastName: z.string().min(2).max(50),
  locale: z.optional(z.string().max(10)),
  acceptTerms: z.boolean(),
});

export const loginZodSchema = z.object({
  identifier: z.string().min(1).max(255),
  password: z.string().min(1).max(128),
  rememberMe: z.optional(z.boolean()),
  deviceName: z.optional(z.string().max(100)),
});

export const refreshZodSchema = z.object({
  refreshToken: z.string().min(1).max(1024),
  deviceName: z.optional(z.string().max(100)),
});

export const discoverySearchSortEnum = z.enum([
  'relevance',
  'nearest',
  'lowPrice',
  'highPrice',
  'earliest',
  'trending',
  'newest',
  'topRated',
  'mostBooked',
]);

export type DiscoverySearchSort = z.infer<typeof discoverySearchSortEnum>;

export const discoverySearchZodSchema = z.object({
  q: z.optional(z.string().max(200)),
  limit: z.optional(z.number().int().min(1).max(100)),
  offset: z.optional(z.number().int().min(0)),
  minRating: z.optional(z.number().min(0).max(5)),
  maxPrice: z.optional(z.number().min(0)),
  minPrice: z.optional(z.number().min(0)),
  sort: z.optional(discoverySearchSortEnum),
  categoryIds: z.optional(z.array(z.string()).max(50)),
  professionalIds: z.optional(z.array(z.string()).max(50)),
  openNow: z.optional(z.boolean()),
  availableNow: z.optional(z.boolean()),
  availableToday: z.optional(z.boolean()),
  homeService: z.optional(z.boolean()),
  verified: z.optional(z.boolean()),
  promotion: z.optional(z.boolean()),
  paymentMethods: z.optional(z.array(z.string()).max(20)),
  facilities: z.optional(z.array(z.string()).max(50)),
  cityId: z.optional(z.string()),
  areaId: z.optional(z.string()),
  tagKeys: z.optional(z.array(z.string()).max(50)),
  genderPreference: z.optional(z.string().max(20)),
  dateFrom: z.optional(z.coerce.date()),
  dateTo: z.optional(z.coerce.date()),
  durationMinMinutes: z.optional(z.number().int().min(0)),
  durationMaxMinutes: z.optional(z.number().int().min(0)),
  priceLevel: z.optional(z.array(z.number().int().min(1).max(4)).max(4)),
});

export const nearbyZodSchema = z.object({
  lat: z.number().min(-90).max(90),
  lon: z.number().min(-180).max(180),
  radiusMeters: z.optional(z.number().min(1).max(100000).default(1000)),
  limit: z.optional(z.number().int().min(1).max(100)),
  offset: z.optional(z.number().int().min(0)),
  categoryIds: z.optional(z.array(z.string()).max(50)),
  openNow: z.optional(z.boolean()),
  availableNow: z.optional(z.boolean()),
  verified: z.optional(z.boolean()),
  minRating: z.optional(z.number().min(0).max(5)),
});

export const forgotPasswordZodSchema = z.object({
  identifier: z.string().min(1).max(255),
});

export const resetPasswordZodSchema = z.object({
  token: z.string().min(1).max(512),
  password: z.string().min(8).max(128),
});

export const verifyOtpZodSchema = z.object({
  identifier: z.string().min(1).max(255),
  otp: z.string().min(4).max(12),
  purpose: z.string().min(1).max(50),
});

export const sendOtpZodSchema = z.object({
  identifier: z.string().min(1).max(255),
  purpose: z.string().min(1).max(50),
  channel: z.enum(['sms', 'email', 'whatsapp']),
});

export const ZodSchemas = {
  register: registerZodSchema,
  login: loginZodSchema,
  refresh: refreshZodSchema,
  discoverySearch: discoverySearchZodSchema,
  nearby: nearbyZodSchema,
  forgotPassword: forgotPasswordZodSchema,
  resetPassword: resetPasswordZodSchema,
  verifyOtp: verifyOtpZodSchema,
  sendOtp: sendOtpZodSchema,
} as const;

export type RegisterZod = z.infer<typeof ZodSchemas.register>;
export type LoginZod = z.infer<typeof ZodSchemas.login>;
export type RefreshZod = z.infer<typeof ZodSchemas.refresh>;
export type DiscoverySearchZod = z.infer<typeof ZodSchemas.discoverySearch>;
export type NearbyZod = z.infer<typeof ZodSchemas.nearby>;

@ValidatorConstraint({ name: 'isLebanesePhone', async: false })
export class IsLebanesePhoneConstraint implements ValidatorConstraintInterface {
  validate(phone: unknown): boolean {
    if (typeof phone !== 'string') return false;
    return isLebanesePhone(phone);
  }
  defaultMessage(args: ValidationArguments): string {
    return `${args.property} must be a valid Lebanese phone number`;
  }
}

export function isLebanesePhone(phone: string): boolean {
  if (!phone || typeof phone !== 'string') return false;
  const cleaned = phone.replace(/[\s\-\.\(\)]/g, '');
  const patterns = [
    /^\+961[0-9]{7,8}$/,
    /^\+81[0-9]{7,8}$/,
    /^00961[0-9]{7,8}$/,
    /^961[0-9]{7,8}$/,
    /^03[0-9]{6}$/,
    /^70[0-9]{6}$/,
    /^71[0-9]{6}$/,
    /^76[0-9]{6}$/,
    /^78[0-9]{6}$/,
    /^79[0-9]{6}$/,
    /^81[0-9]{6}$/,
    /^01[0-9]{6}$/,
    /^0[2-9][0-9]{6}$/,
  ];
  return patterns.some((p) => p.test(cleaned));
}

export function isStrongPassword(password: string): boolean {
  if (!password || typeof password !== 'string') return false;
  if (password.length < 8) return false;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSymbol = /[!@#$%^&*()_+\-=\[\]{}|;':",.<>\/?\\`~]/.test(password);
  return hasUpper && hasLower && (hasNumber || hasSymbol);
}

export function passwordStrength(password: string): {
  score: 0 | 1 | 2 | 3 | 4;
  label: 'too_weak' | 'weak' | 'fair' | 'strong' | 'very_strong';
  meetsMin: boolean;
} {
  if (!password) return { score: 0, label: 'too_weak', meetsMin: false };
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[!@#$%^&*()_+\-=\[\]{}|;':",.<>\/?\\`~]/.test(password)) score++;
  const s = Math.min(score, 4) as 0 | 1 | 2 | 3 | 4;
  const labels = {
    0: 'too_weak',
    1: 'weak',
    2: 'fair',
    3: 'strong',
    4: 'very_strong',
  } as const;
  const meetsMin = isStrongPassword(password);
  return { score: s, label: labels[s], meetsMin };
}

export class RegisterDto {
  @IsOptional()
  @IsEmail()
  @Max(255)
  email?: string;

  @IsOptional()
  @IsString()
  @Length(1, 32)
  @Validate(IsLebanesePhoneConstraint)
  phone?: string;

  @IsString()
  @Length(8, 128)
  password: string;

  @IsString()
  @Length(2, 50)
  firstName: string;

  @IsString()
  @Length(2, 50)
  lastName: string;

  @IsOptional()
  @IsString()
  @Length(1, 10)
  locale?: string;

  acceptTerms: boolean;
}

export class LoginDto {
  @IsString()
  @Length(1, 255)
  identifier: string;

  @IsString()
  @Length(1, 128)
  password: string;

  @IsOptional()
  rememberMe?: boolean;

  @IsOptional()
  @IsString()
  @Length(0, 100)
  deviceName?: string;
}

export class RefreshTokenDto {
  @IsString()
  @Length(1, 1024)
  refreshToken: string;

  @IsOptional()
  @IsString()
  @Length(0, 100)
  deviceName?: string;
}

const DISCOVERY_SORT_VALUES = [
  'relevance',
  'nearest',
  'lowPrice',
  'highPrice',
  'earliest',
  'trending',
  'newest',
  'topRated',
  'mostBooked',
] as const;

export class DiscoverySearchDto {
  @IsOptional()
  @IsString()
  @Length(0, 200)
  q?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(5)
  minRating?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maxPrice?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minPrice?: number;

  @IsOptional()
  @IsString()
  sort?: (typeof DISCOVERY_SORT_VALUES)[number];

  @IsOptional()
  categoryIds?: string[];

  @IsOptional()
  professionalIds?: string[];

  @IsOptional()
  openNow?: boolean;

  @IsOptional()
  availableNow?: boolean;

  @IsOptional()
  availableToday?: boolean;

  @IsOptional()
  homeService?: boolean;

  @IsOptional()
  verified?: boolean;

  @IsOptional()
  promotion?: boolean;

  @IsOptional()
  paymentMethods?: string[];

  @IsOptional()
  facilities?: string[];

  @IsOptional()
  @IsString()
  cityId?: string;

  @IsOptional()
  @IsString()
  areaId?: string;

  @IsOptional()
  tagKeys?: string[];

  @IsOptional()
  @IsString()
  @Length(0, 20)
  genderPreference?: string;

  @IsOptional()
  @Type(() => Date)
  dateFrom?: Date;

  @IsOptional()
  @Type(() => Date)
  dateTo?: Date;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  durationMinMinutes?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  durationMaxMinutes?: number;

  @IsOptional()
  priceLevel?: Array<1 | 2 | 3 | 4>;
}

export class NearbyDto {
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat: number;

  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  lon: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100000)
  radiusMeters?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number;

  @IsOptional()
  categoryIds?: string[];

  @IsOptional()
  openNow?: boolean;

  @IsOptional()
  availableNow?: boolean;

  @IsOptional()
  verified?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(5)
  minRating?: number;
}

export class ForgotPasswordDto {
  @IsString()
  @Length(1, 255)
  identifier: string;
}

export class ResetPasswordDto {
  @IsString()
  @Length(1, 512)
  token: string;

  @IsString()
  @Length(8, 128)
  password: string;
}

export class VerifyOtpDto {
  @IsString()
  @Length(1, 255)
  identifier: string;

  @IsString()
  @Length(4, 12)
  otp: string;

  @IsString()
  @Length(1, 50)
  purpose: string;
}

export class SendOtpDto {
  @IsString()
  @Length(1, 255)
  identifier: string;

  @IsString()
  @Length(1, 50)
  purpose: string;

  @IsEnum(['sms', 'email', 'whatsapp'])
  channel: 'sms' | 'email' | 'whatsapp';
}

