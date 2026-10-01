import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length } from 'class-validator';

export class RefreshDto {
  @ApiProperty({
    description: 'Refresh token',
    minLength: 1,
    maxLength: 1024,
  })
  @IsString()
  @Length(1, 1024)
  refreshToken: string;
}
