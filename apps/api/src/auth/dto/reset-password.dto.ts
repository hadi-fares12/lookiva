import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length } from 'class-validator';

export class ResetPasswordDto {
  @ApiProperty({
    description: 'Password reset token',
    minLength: 1,
    maxLength: 512,
  })
  @IsString()
  @Length(1, 512)
  token: string;

  @ApiProperty({
    description: 'New password (min 8, max 128 chars)',
    minLength: 8,
    maxLength: 128,
  })
  @IsString()
  @Length(8, 128)
  password: string;
}
