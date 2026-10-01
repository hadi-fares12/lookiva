import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, Length, IsOptional, IsBoolean } from 'class-validator';

export class LoginDto {
  @ApiProperty({
    description: 'Login identifier (email or phone)',
    example: 'user@example.com',
    minLength: 1,
    maxLength: 255,
  })
  @IsString()
  @Length(1, 255)
  identifier: string;

  @ApiProperty({
    description: 'User password',
    minLength: 1,
    maxLength: 128,
  })
  @IsString()
  @Length(1, 128)
  password: string;

  @ApiPropertyOptional({
    description: 'Remember me for extended session',
  })
  @IsOptional()
  @IsBoolean()
  rememberMe?: boolean;

  @ApiPropertyOptional({
    description: 'Device name for session tracking',
    example: 'Chrome on Windows',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @Length(0, 100)
  deviceName?: string;
}
