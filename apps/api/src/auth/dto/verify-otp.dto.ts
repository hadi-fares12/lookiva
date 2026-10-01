import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsString, Length, Matches, MaxLength, IsOptional } from 'class-validator';

export class VerifyOtpDto {
  @ApiProperty({ example: '+96170123456' })
  @IsString()
  @MaxLength(32)
  @Matches(/^\+[1-9]\d{7,14}$/, { message: 'Phone must be a valid E.164 number' })
  identifier: string;

  @ApiProperty({ example: '123456' })
  @IsString()
  @Length(6, 6)
  @Matches(/^\d{6}$/)
  otp: string;

  @ApiProperty({ example: 'login' })
  @IsString()
  @IsIn(['login', 'verify'])
  purpose: 'login' | 'verify';

  @IsOptional()
  @IsString()
  @MaxLength(120)
  deviceName?: string;
}
