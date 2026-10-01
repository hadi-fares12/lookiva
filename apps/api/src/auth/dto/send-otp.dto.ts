import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsString, Matches, MaxLength } from 'class-validator';

export class SendOtpDto {
  @ApiProperty({ example: '+96170123456' })
  @IsString()
  @MaxLength(32)
  @Matches(/^\+[1-9]\d{7,14}$/, { message: 'Phone must be a valid E.164 number such as +96170123456' })
  identifier: string;

  @ApiProperty({ example: 'login' })
  @IsString()
  @IsIn(['login', 'verify'])
  purpose: 'login' | 'verify';

  @ApiProperty({ enum: ['sms'], example: 'sms' })
  @IsString()
  @IsIn(['sms'])
  channel: 'sms';
}
