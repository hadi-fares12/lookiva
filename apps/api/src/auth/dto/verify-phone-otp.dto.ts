import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length, Matches, MaxLength } from 'class-validator';

export class VerifyPhoneOtpDto {
  @ApiProperty({ description: 'E.164 phone number', example: '+96170123456', maxLength: 32 })
  @IsString()
  @MaxLength(32)
  @Matches(/^\+[1-9]\d{7,14}$/, { message: 'Phone must be a valid E.164 number' })
  phone: string;

  @ApiProperty({ description: '6-digit OTP code', example: '123456' })
  @IsString()
  @Length(6, 6)
  @Matches(/^\d{6}$/)
  code: string;
}
