import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  MinLength,
  MaxLength,
  Min,
  Max,
  IsNumber,
  IsBoolean,
  IsIn,
  IsInt,
  IsArray,
} from 'class-validator';
import { Type } from 'class-transformer';

const SORT_VALUES = [
  'relevance',
  'nearest',
  'lowPrice',
  'highPrice',
  'topRated',
  'newest',
  'mostBooked',
] as const;

export class DiscoverySearchDto {
  @ApiPropertyOptional({
    description: 'Free text search query',
    minLength: 2,
    maxLength: 200,
    example: 'fade haircut',
  })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  q?: string;

  @ApiPropertyOptional({
    description: 'Number of results per page',
    minimum: 1,
    maximum: 100,
    default: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({
    description: 'Pagination offset',
    minimum: 0,
    default: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number = 0;

  @ApiPropertyOptional({
    description: 'Availability window in minutes for available-now discovery',
    minimum: 15,
    maximum: 1440,
    default: 120,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(15)
  @Max(1440)
  windowMinutes?: number = 120;

  @ApiPropertyOptional({
    description: 'Minimum average rating (0-5)',
    minimum: 0,
    maximum: 5,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 1 })
  @Min(0)
  @Max(5)
  minRating?: number;

  @ApiPropertyOptional({
    description: 'Maximum service price',
    minimum: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  maxPrice?: number;

  @ApiPropertyOptional({
    description: 'Minimum service price',
    minimum: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  minPrice?: number;

  @ApiPropertyOptional({
    description: 'Sort order for results',
    enum: SORT_VALUES,
    default: 'relevance',
  })
  @IsOptional()
  @IsIn(SORT_VALUES)
  sort?: (typeof SORT_VALUES)[number] = 'relevance';

  @ApiPropertyOptional({
    description: 'Filter by service category UUIDs',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  categoryIds?: string[];

  @ApiPropertyOptional({
    description: 'Filter by professional UUIDs',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  professionalIds?: string[];

  @ApiPropertyOptional({
    description: 'Only show businesses that are open now',
    default: false,
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  openNow?: boolean;

  @ApiPropertyOptional({
    description: 'Only show businesses with available slots now',
    default: false,
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  availableNow?: boolean;

  @ApiPropertyOptional({
    description: 'Only show businesses available today',
    default: false,
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  availableToday?: boolean;

  @ApiPropertyOptional({
    description: 'Only show businesses offering home service',
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  homeService?: boolean;

  @ApiPropertyOptional({
    description: 'Only show verified businesses',
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  verified?: boolean;

  @ApiPropertyOptional({
    description: 'Only show businesses with active promotions',
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  promotion?: boolean;

  @ApiPropertyOptional({
    description: 'Filter by accepted payment methods',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  paymentMethods?: string[];

  @ApiPropertyOptional({
    description: 'Filter by facilities',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  facilities?: string[];

  @ApiPropertyOptional({
    description: 'Filter by city UUID',
    format: 'uuid',
  })
  @IsOptional()
  @IsString()
  cityId?: string;

  @ApiPropertyOptional({
    description: 'Filter by area UUID',
    format: 'uuid',
  })
  @IsOptional()
  @IsString()
  areaId?: string;

  @ApiPropertyOptional({
    description: 'Filter by tag keys',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tagKeys?: string[];

  @ApiPropertyOptional({
    description: 'Professional gender preference',
    example: 'female',
  })
  @IsOptional()
  @IsString()
  genderPreference?: string;

  @ApiPropertyOptional({
    description: 'Viewer latitude (required for sort=nearest)',
    minimum: -90,
    maximum: 90,
    example: 33.896,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 6 })
  @Min(-90)
  @Max(90)
  lat?: number;

  @ApiPropertyOptional({
    description: 'Viewer longitude (required for sort=nearest)',
    minimum: -180,
    maximum: 180,
    example: 35.482,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 6 })
  @Min(-180)
  @Max(180)
  lon?: number;

  @ApiPropertyOptional({
    description: 'Search radius in meters',
    minimum: 0,
    default: 5000,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  radiusMeters?: number = 5000;
}

export class NearbyDto {
  @ApiPropertyOptional({
    description: 'Viewer latitude',
    minimum: -90,
    maximum: 90,
    required: true,
    example: 33.896,
  })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 6 })
  @Min(-90)
  @Max(90)
  lat!: number;

  @ApiPropertyOptional({
    description: 'Viewer longitude',
    minimum: -180,
    maximum: 180,
    required: true,
    example: 35.482,
  })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 6 })
  @Min(-180)
  @Max(180)
  lon!: number;

  @ApiPropertyOptional({
    description: 'Search radius in meters',
    minimum: 0,
    default: 1000,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  radiusMeters?: number = 1000;

  @ApiPropertyOptional({
    description: 'Availability window in minutes for available-now discovery',
    minimum: 15,
    maximum: 1440,
    default: 120,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(15)
  @Max(1440)
  windowMinutes?: number = 120;

  @ApiPropertyOptional({
    description: 'Number of results per page',
    minimum: 1,
    maximum: 100,
    default: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({
    description: 'Pagination offset',
    minimum: 0,
    default: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number = 0;

  @ApiPropertyOptional({
    description: 'Filter by service category UUIDs',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  categoryIds?: string[];

  @ApiPropertyOptional({
    description: 'Only show businesses that are open now',
    default: false,
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  openNow?: boolean;

  @ApiPropertyOptional({
    description: 'Only show businesses with available slots now',
    default: false,
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  availableNow?: boolean;

  @ApiPropertyOptional({
    description: 'Only show verified businesses',
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  verified?: boolean;

  @ApiPropertyOptional({
    description: 'Minimum average rating (0-5)',
    minimum: 0,
    maximum: 5,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 1 })
  @Min(0)
  @Max(5)
  minRating?: number;
}

export class HomeSectionsDto {
  @ApiPropertyOptional({
    description: 'Viewer latitude',
    minimum: -90,
    maximum: 90,
    example: 33.896,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 6 })
  @Min(-90)
  @Max(90)
  lat?: number;

  @ApiPropertyOptional({
    description: 'Viewer longitude',
    minimum: -180,
    maximum: 180,
    example: 35.482,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 6 })
  @Min(-180)
  @Max(180)
  lon?: number;

  @ApiPropertyOptional({
    description: 'Number of items per section',
    minimum: 1,
    maximum: 50,
    default: 8,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number = 8;
}

export class SuggestionsDto {
  @ApiPropertyOptional({
    description: 'Search query prefix',
    minLength: 1,
    maxLength: 200,
    required: true,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  q!: string;

  @ApiPropertyOptional({
    description: 'Max number of suggestions',
    minimum: 1,
    maximum: 50,
    default: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number = 10;
}
