import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  Headers,
  Req,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedUser } from './types/request-with-user';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { SendPhoneOtpDto } from './dto/send-phone-otp.dto';
import { VerifyPhoneOtpDto } from './dto/verify-phone-otp.dto';
import { SendOtpDto } from './dto/send-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { GoogleLoginDto } from './dto/google-login.dto';

function extractIp(req: unknown): string | undefined {
  const r = req as Record<string, unknown>;
  const forwardedFor = (r.headers as Record<string, unknown> | undefined)?.[
    'x-forwarded-for'
  ] as string | undefined;
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }
  return r.ip as string | undefined;
}

@ApiTags('Auth')
@Controller('auth')
@Throttle({ default: { limit: 5, ttl: 60 } })
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Register a new user account' })
  async register(
    @Body() dto: RegisterDto,
    @Req() req: unknown,
    @Headers('user-agent') userAgent?: string,
  ) {
    const ip = extractIp(req);
    const tokens = await this.authService.register(dto, ip, userAgent);
    return {
      message: 'Registration successful',
      ...tokens,
    };
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with email/phone and password' })
  async login(
    @Body() dto: LoginDto,
    @Req() req: unknown,
    @Headers('user-agent') userAgent?: string,
  ) {
    const ip = extractIp(req);
    const tokens = await this.authService.login(dto, ip, userAgent);
    return {
      message: 'Login successful',
      ...tokens,
    };
  }

  @Public()
  @Post('google')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Sign in or create a customer account with a Google ID token' })
  async googleLogin(
    @Body() dto: GoogleLoginDto,
    @Req() req: unknown,
    @Headers('user-agent') userAgent?: string,
  ) {
    const tokens = await this.authService.loginWithGoogle(
      dto.idToken,
      extractIp(req),
      userAgent,
      dto.deviceName,
    );
    return { message: 'Google sign-in successful', ...tokens };
  }

  @Get('me')
  @ApiOperation({ summary: 'Get current authenticated user profile' })
  async me(@CurrentUser() user: AuthenticatedUser) {
    return {
      user,
    };
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token using refresh token' })
  async refresh(
    @Body() dto: RefreshDto,
    @Req() req: unknown,
    @Headers('user-agent') userAgent?: string,
  ) {
    const ip = extractIp(req);
    const tokens = await this.authService.refresh(
      dto.refreshToken,
      undefined,
      ip,
      userAgent,
    );
    return {
      message: 'Token refreshed',
      ...tokens,
    };
  }

  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Change password for the authenticated account' })
  async changePassword(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ChangePasswordDto,
  ) {
    await this.authService.changePassword(user.id, dto.currentPassword, dto.newPassword);
    return { message: 'Password changed successfully. Other sessions were revoked.' };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Logout current session or specific session' })
  async logout(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body?: { refreshToken?: string },
  ) {
    await this.authService.logout(user.id, body?.refreshToken);
    return {
      message: 'Logged out successfully',
    };
  }

  @Post('logout-everywhere')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Logout from all active sessions' })
  async logoutEverywhere(@CurrentUser() user: AuthenticatedUser) {
    await this.authService.logoutEverywhere(user.id);
    return {
      message: 'Logged out from all sessions',
    };
  }

  @Get('sessions')
  @ApiOperation({ summary: 'List all user sessions' })
  async getSessions(@CurrentUser() user: AuthenticatedUser) {
    const sessions = await this.authService.getSessions(user.id);
    return {
      sessions,
    };
  }

  @Delete('sessions/:id')
  @ApiOperation({ summary: 'Revoke a specific session' })
  async revokeSession(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') sessionId: string,
  ) {
    if (!sessionId) {
      throw new BadRequestException('Session ID is required');
    }
    await this.authService.revokeSession(user.id, sessionId);
    return {
      message: 'Session revoked',
    };
  }

  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request password reset email' })
  async forgotPassword(
    @Body() dto: ForgotPasswordDto,
    @Req() req: unknown,
    @Headers('user-agent') userAgent?: string,
  ) {
    const ip = extractIp(req);
    await this.authService.forgotPassword(dto.email, ip, userAgent);
    return {
      message:
        'If the email is registered, a password reset link has been sent',
    };
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset password using reset token' })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    await this.authService.resetPassword(dto.token, dto.password);
    return {
      message: 'Password reset successful',
    };
  }

  @Public()
  @Post('email/verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify email using verification token' })
  async verifyEmail(@Body() dto: VerifyEmailDto) {
    await this.authService.verifyEmail(dto.token);
    return {
      message: 'Email verified successfully',
    };
  }


  @Public()
  @Post('send-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send a login/verification OTP to an E.164 phone number' })
  async sendOtp(@Body() dto: SendOtpDto, @Req() req: unknown) {
    const ip = extractIp(req);
    await this.authService.sendPhoneOtp(dto.identifier, dto.purpose, ip);
    return { message: 'If the phone is eligible, an OTP code has been sent' };
  }

  @Public()
  @Post('verify-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify a phone OTP and create a session for login purpose' })
  async verifyOtp(
    @Body() dto: VerifyOtpDto,
    @Req() req: unknown,
    @Headers('user-agent') userAgent?: string,
  ) {
    const ip = extractIp(req);
    if (dto.purpose === 'login') {
      const tokens = await this.authService.loginWithPhoneOtp(dto.identifier, dto.otp, ip, userAgent, dto.deviceName);
      return { message: 'OTP login successful', ...tokens };
    }
    await this.authService.verifyPhoneOtp(dto.identifier, dto.otp, undefined, 'verify');
    return { message: 'Phone OTP verified successfully' };
  }

  @Public()
  @Post('phone/otp/send')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send OTP code to phone number' })
  async sendPhoneOtp(@Body() dto: SendPhoneOtpDto, @Req() req: unknown) {
    const ip = extractIp(req);
    await this.authService.sendPhoneOtp(dto.phone, 'verify', ip);
    return {
      message: 'OTP code sent',
    };
  }

  @Public()
  @Post('phone/otp/verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify OTP code for phone number' })
  async verifyPhoneOtp(
    @Body() dto: VerifyPhoneOtpDto,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    await this.authService.verifyPhoneOtp(dto.phone, dto.code, user?.id, 'verify');
    return {
      message: 'Phone OTP verified successfully',
    };
  }
}
