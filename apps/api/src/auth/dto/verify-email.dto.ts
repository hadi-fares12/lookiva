import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length } from 'class-validator';

export class VerifyEmailDto {
  @ApiProperty({
    description: 'Email verification token',
    minLength: 1,
    maxLength: 512,
  })
  @IsString()
  @Length(1, 512)
  token: string;
}
