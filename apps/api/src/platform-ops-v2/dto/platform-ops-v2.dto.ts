import {
  IsArray,
  IsNumber,
  IsBoolean,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class CreateGeofenceCandidateDto {
  @IsString()
  userId!: string;

  @IsOptional()
  @IsString()
  companyId?: string;

  @IsOptional()
  @IsString()
  professionalId?: string;

  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude!: number;

  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude!: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  radiusMeters?: number;

  @IsNumber()
  priorityScore!: number;
}

export class ModerateReportDto {
  @IsString()
  actionTaken!: string;

  @IsOptional()
  @IsString()
  actionDetails?: string;
}

export class AiParseSearchDto {
  @IsString()
  query!: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  enabledProviders?: string[];
}


export class CreateModerationAppealDto {
  @IsString()
  targetType!: string;

  @IsString()
  targetId!: string;

  @IsOptional()
  @IsString()
  strikeId?: string;

  @IsString()
  reasonReversal!: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  evidenceMediaIds?: string[];
}

export class ResolveModerationAppealDto {
  @IsString()
  status!: string;

  @IsString()
  resolution!: string;

  @IsOptional()
  @IsString()
  resolutionNotes?: string;

  @IsOptional()
  @IsBoolean()
  restoreContent?: boolean;

  @IsOptional()
  @IsBoolean()
  clearStrike?: boolean;
}
