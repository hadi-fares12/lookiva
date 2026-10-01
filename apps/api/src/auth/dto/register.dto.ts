import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsString,
  Length,
  IsOptional,
  IsBoolean,
  Validate,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';
import { IsLebanesePhoneConstraint } from '@lookiva/shared-validation';

@ValidatorConstraint({ name: 'atLeastOneContact', async: false })
export class AtLeastOneContactConstraint implements ValidatorConstraintInterface {
  validate(_value: unknown, args: ValidationArguments): boolean {
    const object = args.object as Record<string, unknown>;
    return !!(object.email || object.phone);
  }
  defaultMessage(): string {
    return 'Either email or phone must be provided';
  }
}

export class RegisterDto {
  @ApiPropertyOptional({
    description: 'User email address',
    example: 'user@example.com',
    maxLength: 255,
  })
  @IsOptional()
  @IsEmail()
  @Length(1, 255)
  @Validate(AtLeastOneContactConstraint)
  email?: string;

  @ApiPropertyOptional({
    description: 'Lebanese phone number with country code',
    example: '+96170123456',
    maxLength: 32,
  })
  @IsOptional()
  @IsString()
  @Length(1, 32)
  @Validate(IsLebanesePhoneConstraint)
  phone?: string;

  @ApiProperty({
    description: 'User password (min 8, max 128 chars)',
    minLength: 8,
    maxLength: 128,
  })
  @IsString()
  @Length(8, 128)
  password: string;

  @ApiProperty({
    description: 'User first name',
    minLength: 2,
    maxLength: 50,
  })
  @IsString()
  @Length(2, 50)
  firstName: string;

  @ApiProperty({
    description: 'User last name',
    minLength: 2,
    maxLength: 50,
  })
  @IsString()
  @Length(2, 50)
  lastName: string;

  @ApiPropertyOptional({
    description: 'User locale',
    example: 'en',
    maxLength: 10,
  })
  @IsOptional()
  @IsString()
  @Length(1, 10)
  locale?: string;

  @ApiProperty({
    description: 'Accept terms and conditions',
  })
  @IsBoolean()
  acceptTerms: boolean;
}
