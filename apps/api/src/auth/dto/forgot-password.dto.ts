import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length, IsEmail } from 'class-validator';

export class ForgotPasswordDto {
  @ApiProperty({
    description: 'User email for password reset',
    example: 'user@example.com',
    minLength: 1,
    maxLength: 255,
  })
  @IsString()
  @Length(1, 255)
  @IsEmail()
  email: string;
}
