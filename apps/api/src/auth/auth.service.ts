import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ConflictException,
  InternalServerErrorException,
  ServiceUnavailableException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import {
  UserRole,
  PermissionKey,
  ScopeType,
} from '@lookiva/shared-types';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

interface SessionOptions {
  userAgent?: string;
  ipAddress?: string;
  deviceName?: string;
  deviceType?: string;
  familyId?: string;
}

interface AuthenticatedUser {
  id: string;
  email: string | null;
  phone: string | null;
  fullName: string;
  isActive: boolean;
  permissions: PermissionKey[];
  roleScopes: Array<{
    id: string;
    roleId: string;
    roleKey: UserRole;
    scopeType: ScopeType;
    scopeId: string | null;
    companyId: string | null;
    branchId: string | null;
  }>;
}

interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @InjectQueue('email-queue') private readonly emailQueue: Queue,
  ) {}

  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 12);
  }

  async verifyPassword(plain: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plain, hash);
  }

  hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  private generateRandomHex(length: number): string {
    return crypto.randomBytes(length).toString('hex');
  }

  private generateCuid(): string {
    return crypto.randomBytes(16).toString('hex');
  }

  async generateTokens(
    userId: string,
    sessionOpts: SessionOptions = {},
  ): Promise<TokenPair> {
    const jti = this.generateCuid();
    const accessTtl = this.configService.get<string>('JWT_ACCESS_TTL', '15m');
    const refreshTtlDays = this.parseTtlToDays(
      this.configService.get<string>('JWT_REFRESH_TTL', '7d'),
    );

    const accessToken = await this.jwtService.signAsync(
      { sub: userId, jti },
      { expiresIn: accessTtl },
    );

    const refreshTokenPlain = this.generateRandomHex(32);
    const refreshTokenHash = this.hashToken(refreshTokenPlain);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + refreshTtlDays);

    await this.prisma.sessions.create({
      data: {
        user_id: userId,
        refresh_token_hash: refreshTokenHash,
        access_token_jti: jti,
        user_agent: sessionOpts.userAgent,
        ip_address: sessionOpts.ipAddress,
        device_name: sessionOpts.deviceName,
        device_type: sessionOpts.deviceType,
        family_id: sessionOpts.familyId || this.generateCuid(),
        expires_at: expiresAt,
      },
    });

    const expiresIn = this.parseTtlToSeconds(accessTtl);

    return {
      accessToken,
      refreshToken: refreshTokenPlain,
      expiresIn,
    };
  }

  private parseTtlToDays(ttl: string): number {
    const match = ttl.match(/^(\d+)([smhd])$/);
    if (!match) return 7;
    const value = parseInt(match[1], 10);
    const unit = match[2];
    switch (unit) {
      case 's': return Math.ceil(value / 86400);
      case 'm': return Math.ceil(value / 1440);
      case 'h': return Math.ceil(value / 24);
      case 'd': return value;
      default: return 7;
    }
  }

  private parseTtlToSeconds(ttl: string): number {
    const match = ttl.match(/^(\d+)([smhd])$/);
    if (!match) return 900;
    const value = parseInt(match[1], 10);
    const unit = match[2];
    switch (unit) {
      case 's': return value;
      case 'm': return value * 60;
      case 'h': return value * 3600;
      case 'd': return value * 86400;
      default: return 900;
    }
  }

  async register(
    dto: RegisterDto,
    reqIp?: string,
    userAgent?: string,
  ): Promise<TokenPair> {
    if (!dto.acceptTerms) {
      throw new BadRequestException('You must accept the terms and conditions');
    }

    if (!dto.email && !dto.phone) {
      throw new BadRequestException('Either email or phone must be provided');
    }

    const normalizedEmail = dto.email?.toLowerCase().trim();
    const normalizedPhone = dto.phone?.trim();

    if (normalizedEmail) {
      const existingEmail = await this.prisma.users.findUnique({
        where: { email: normalizedEmail },
      });
      if (existingEmail) {
        throw new ConflictException('Email is already registered');
      }
    }

    if (normalizedPhone) {
      const existingPhone = await this.prisma.users.findUnique({
        where: { phone: normalizedPhone },
      });
      if (existingPhone) {
        throw new ConflictException('Phone is already registered');
      }
    }

    const passwordHash = await this.hashPassword(dto.password);
    const fullName = `${dto.firstName} ${dto.lastName}`;
    const locale = dto.locale || 'en';

    let countryId: string | null = null;
    try {
      const lbCountry = await this.prisma.countries.findFirst({
        where: { iso_code: 'LB' },
      });
      if (lbCountry) {
        countryId = lbCountry.id;
      }
    } catch {
      countryId = null;
    }

    let customerRoleId: string | null = null;
    try {
      const customerRole = await this.prisma.roles.findFirst({
        where: { key: UserRole.Customer },
      });
      if (customerRole) {
        customerRoleId = customerRole.id;
      }
    } catch {
      customerRoleId = null;
    }

    try {
      return await this.prisma.$transaction(async (tx) => {
        const user = await tx.users.create({
          data: {
            email: normalizedEmail,
            phone: normalizedPhone,
            password_hash: passwordHash,
            full_name: fullName,
            locale,
          },
        });

        await tx.user_profiles.create({
          data: {
            user_id: user.id,
            first_name: dto.firstName,
            last_name: dto.lastName,
            country_id: countryId || '',
          },
        });

        await tx.user_preferences.create({
          data: {
            user_id: user.id,
          },
        });

        if (customerRoleId) {
          await tx.user_role_scopes.create({
            data: {
              user_id: user.id,
              role_id: customerRoleId,
              role_key: UserRole.Customer,
              scope_type: ScopeType.Platform,
            },
          });
        }

        try {
          await tx.customers.create({
            data: {
              user_id: user.id,
            },
          });
        } catch (customersErr) {
          this.logger.warn(
            `Failed to create customers row for user ${user.id}: ${customersErr}`,
          );
        }

        return this.generateTokens(user.id, {
          userAgent,
          ipAddress: reqIp,
        });
      });
    } catch (err) {
      if (err instanceof ConflictException || err instanceof BadRequestException) {
        throw err;
      }
      this.logger.error(`Registration failed: ${err}`);
      throw new InternalServerErrorException('Registration failed');
    }
  }

  async login(
    dto: LoginDto,
    ip?: string,
    ua?: string,
  ): Promise<TokenPair> {
    const identifier = dto.identifier.trim();

    const user = await this.prisma.users.findFirst({
      where: {
        OR: [
          { email: identifier.toLowerCase() },
          { phone: identifier },
        ],
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordValid = await this.verifyPassword(
      dto.password,
      user.password_hash,
    );
    if (!passwordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.is_active) {
      throw new UnauthorizedException('Account is disabled');
    }

    await this.prisma.users.update({
      where: { id: user.id },
      data: { last_login_at: new Date() },
    });

    return this.generateTokens(user.id, {
      userAgent: ua,
      ipAddress: ip,
      deviceName: dto.deviceName,
    });
  }

  async validateAccessToken(payload: {
    sub: string;
    jti?: string;
  }): Promise<AuthenticatedUser | null> {
    const user = await this.prisma.users.findUnique({
      where: { id: payload.sub },
      include: {
        role_scopes: {
          include: {
            role: {
              include: {
                role_permissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!user || !user.is_active) {
      return null;
    }

    const permissionsSet = new Set<PermissionKey>();
    const roleScopes: AuthenticatedUser['roleScopes'] = [];

    for (const rs of user.role_scopes) {
      roleScopes.push({
        id: rs.id,
        roleId: rs.role_id,
        roleKey: rs.role_key as AuthenticatedUser['roleScopes'][number]['roleKey'],
        scopeType: rs.scope_type as AuthenticatedUser['roleScopes'][number]['scopeType'],
        scopeId: rs.scope_id,
        companyId: rs.company_id,
        branchId: rs.branch_id,
      });

      if (rs.role?.role_permissions) {
        for (const rp of rs.role.role_permissions) {
          if (rp.permission?.key) {
            permissionsSet.add(rp.permission.key as PermissionKey);
          }
        }
      }
    }

    return {
      id: user.id,
      email: user.email,
      phone: user.phone,
      fullName: user.full_name,
      isActive: user.is_active,
      permissions: Array.from(permissionsSet),
      roleScopes,
    };
  }

  async refresh(
    refreshTokenPlain: string,
    deviceName?: string,
    ip?: string,
    ua?: string,
  ): Promise<TokenPair> {
    const tokenHash = this.hashToken(refreshTokenPlain);

    const session = await this.prisma.sessions.findUnique({
      where: { refresh_token_hash: tokenHash },
    });

    if (!session) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (session.revoked_at) {
      await this.prisma.sessions.updateMany({
        where: {
          user_id: session.user_id,
          family_id: session.family_id,
          revoked_at: null,
        },
        data: { revoked_at: new Date() },
      });
      throw new UnauthorizedException(
        'Refresh token reuse detected. All sessions revoked.',
      );
    }

    if (session.expires_at < new Date()) {
      throw new UnauthorizedException('Refresh token expired');
    }

    const now = new Date();
    await this.prisma.sessions.update({
      where: { id: session.id },
      data: { revoked_at: now },
    });

    const jti = this.generateCuid();
    const accessTtl = this.configService.get<string>('JWT_ACCESS_TTL', '15m');
    const refreshTtlDays = this.parseTtlToDays(
      this.configService.get<string>('JWT_REFRESH_TTL', '7d'),
    );

    const accessToken = await this.jwtService.signAsync(
      { sub: session.user_id, jti },
      { expiresIn: accessTtl },
    );

    const newRefreshTokenPlain = this.generateRandomHex(32);
    const newRefreshTokenHash = this.hashToken(newRefreshTokenPlain);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + refreshTtlDays);

    await this.prisma.sessions.create({
      data: {
        user_id: session.user_id,
        refresh_token_hash: newRefreshTokenHash,
        access_token_jti: jti,
        user_agent: ua,
        ip_address: ip,
        device_name: deviceName,
        device_type: session.device_type,
        family_id: session.family_id,
        expires_at: expiresAt,
      },
    });

    const expiresIn = this.parseTtlToSeconds(accessTtl);

    return {
      accessToken,
      refreshToken: newRefreshTokenPlain,
      expiresIn,
    };
  }


  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    if (currentPassword === newPassword) {
      throw new BadRequestException('New password must be different from the current password');
    }
    const user = await this.prisma.users.findUnique({ where: { id: userId } });
    if (!user || !user.is_active) throw new UnauthorizedException('Account is unavailable');
    const valid = await this.verifyPassword(currentPassword, user.password_hash);
    if (!valid) throw new UnauthorizedException('Current password is incorrect');
    const passwordHash = await this.hashPassword(newPassword);
    const now = new Date();
    await this.prisma.$transaction([
      this.prisma.users.update({ where: { id: userId }, data: { password_hash: passwordHash } }),
      this.prisma.sessions.updateMany({ where: { user_id: userId, revoked_at: null }, data: { revoked_at: now } }),
      this.prisma.password_reset_tokens.updateMany({ where: { user_id: userId, used_at: null }, data: { used_at: now } }),
    ]);
  }

  async logout(userId: string, refreshTokenPlain?: string): Promise<void> {
    if (refreshTokenPlain) {
      const tokenHash = this.hashToken(refreshTokenPlain);
      await this.prisma.sessions.updateMany({
        where: {
          user_id: userId,
          refresh_token_hash: tokenHash,
          revoked_at: null,
        },
        data: { revoked_at: new Date() },
      });
    } else {
      await this.prisma.sessions.updateMany({
        where: {
          user_id: userId,
          revoked_at: null,
        },
        data: { revoked_at: new Date() },
      });
    }
  }

  async logoutEverywhere(userId: string): Promise<void> {
    await this.prisma.sessions.updateMany({
      where: { user_id: userId },
      data: { revoked_at: new Date() },
    });
  }

  async getSessions(userId: string) {
    const sessions = await this.prisma.sessions.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' },
    });

    return sessions.map((s) => ({
      id: s.id,
      userId: s.user_id,
      userAgent: s.user_agent,
      ipAddress: s.ip_address,
      countryCode: s.country_code,
      city: s.city,
      deviceType: s.device_type,
      deviceName: s.device_name,
      familyId: s.family_id,
      expiresAt: s.expires_at,
      lastActiveAt: s.last_active_at,
      revokedAt: s.revoked_at,
      createdAt: s.created_at,
      updatedAt: s.updated_at,
    }));
  }

  async revokeSession(userId: string, sessionId: string): Promise<void> {
    const session = await this.prisma.sessions.findUnique({
      where: { id: sessionId },
    });

    if (!session || session.user_id !== userId) {
      throw new BadRequestException('Session not found');
    }

    await this.prisma.sessions.update({
      where: { id: sessionId },
      data: { revoked_at: new Date() },
    });
  }

  async forgotPassword(
    email: string,
    ip?: string,
    ua?: string,
  ): Promise<void> {
    const normalizedEmail = email.toLowerCase().trim();
    const user = await this.prisma.users.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      return;
    }

    const tokenPlain = this.generateRandomHex(24);
    const tokenHash = this.hashToken(tokenPlain);

    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 15);

    await this.prisma.password_reset_tokens.create({
      data: {
        user_id: user.id,
        token_hash: tokenHash,
        expires_at: expiresAt,
        ip_address: ip,
        user_agent: ua,
      },
    });

    const isDev = this.configService.get<string>('NODE_ENV') !== 'production';
    const publicCustomerWebUrl = this.configService.get<string>('PUBLIC_CUSTOMER_WEB_URL', 'http://localhost:3001').replace(/\/$/, '');
    const locale = user.locale || 'en';
    const resetUrl = `${publicCustomerWebUrl}/${encodeURIComponent(locale)}/reset-password?token=${encodeURIComponent(tokenPlain)}`;

    try {
      await this.emailQueue.add(
        'password-reset',
        {
          to: normalizedEmail,
          subject: 'Reset your Lookiva password',
          template: 'password-reset',
          vars: {
            resetUrl,
            expiresMinutes: 15,
            fullName: user.full_name,
          },
          text: `Reset your Lookiva password using this link: ${resetUrl}. This link expires in 15 minutes.`,
        },
        {
          jobId: `password-reset:${user.id}:${tokenHash.slice(0, 16)}`,
          attempts: 5,
          backoff: { type: 'exponential', delay: 2000 },
          removeOnComplete: 500,
          removeOnFail: 1000,
        },
      );
    } catch (error) {
      // Preserve a generic outward response to avoid account enumeration while
      // surfacing the operational failure in logs/queue monitoring.
      this.logger.error(`Unable to enqueue password reset email: ${(error as Error).message}`);
    }

    if (isDev) {
      this.logger.log(`[DEV PASSWORD RESET] email=${normalizedEmail} link=${resetUrl}`);
    }
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const tokenHash = this.hashToken(token);

    const tokenRow = await this.prisma.password_reset_tokens.findFirst({
      where: {
        token_hash: tokenHash,
        used_at: null,
        expires_at: { gt: new Date() },
      },
      orderBy: { created_at: 'desc' },
    });

    if (!tokenRow) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    const passwordHash = await this.hashPassword(newPassword);

    const now = new Date();
    await this.prisma.$transaction([
      this.prisma.users.update({
        where: { id: tokenRow.user_id },
        data: { password_hash: passwordHash },
      }),
      this.prisma.password_reset_tokens.updateMany({
        where: { user_id: tokenRow.user_id, used_at: null },
        data: { used_at: now },
      }),
      this.prisma.sessions.updateMany({
        where: { user_id: tokenRow.user_id, revoked_at: null },
        data: { revoked_at: now },
      }),
    ]);
  }

  async sendPhoneOtp(
    phone: string,
    purpose: string = 'verify',
    ip?: string,
  ): Promise<void> {
    // Avoid issuing login OTPs for disabled/nonexistent accounts while keeping the
    // controller response generic to reduce account-enumeration leakage.
    if (purpose === 'login') {
      const user = await this.prisma.users.findFirst({ where: { phone } });
      if (!user || !user.is_active) return;
    }

    const code = crypto.randomInt(100000, 1000000).toString();
    const codeHash = this.hashToken(code);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    await this.prisma.phone_otp_tokens.create({
      data: { phone, code_hash: codeHash, purpose, expires_at: expiresAt, ip_address: ip },
    });

    await this.deliverPhoneOtp(phone, code, purpose);
  }

  private async deliverPhoneOtp(phone: string, code: string, purpose: string): Promise<void> {
    const environment = this.configService.get<string>('NODE_ENV', 'development');
    const provider = this.configService.get<string>('SMS_PROVIDER', 'console').toLowerCase();
    if (environment !== 'production' && provider === 'console') {
      this.logger.log(`[DEV OTP] phone: ${phone} code: ${code} purpose: ${purpose}`);
      return;
    }

    if (provider === 'twilio') {
      const sid = this.configService.get<string>('TWILIO_ACCOUNT_SID');
      const token = this.configService.get<string>('TWILIO_AUTH_TOKEN');
      const from = this.configService.get<string>('TWILIO_FROM_NUMBER');
      if (!sid || !token || !from) throw new ServiceUnavailableException('SMS provider is not fully configured');
      const form = new URLSearchParams({ To: phone, From: from, Body: `Your LOOKIVA code is ${code}. It expires in 5 minutes.` });
      const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(sid)}/Messages.json`, {
        method: 'POST',
        headers: { Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString('base64')}`, 'Content-Type': 'application/x-www-form-urlencoded' },
        body: form.toString(),
      });
      if (!response.ok) {
        this.logger.error(`SMS delivery failed with status ${response.status}`);
        throw new ServiceUnavailableException('Unable to deliver OTP at this time');
      }
      return;
    }

    throw new ServiceUnavailableException('A production SMS provider must be configured before OTP can be used');
  }

  async verifyPhoneOtp(
    phone: string,
    code: string,
    userId?: string,
    purpose: string = 'verify',
  ): Promise<void> {
    const tokenRow = await this.prisma.phone_otp_tokens.findFirst({
      where: { phone, purpose },
      orderBy: { created_at: 'desc' },
    });

    if (!tokenRow) throw new BadRequestException('Invalid OTP');
    await this.prisma.phone_otp_tokens.update({ where: { id: tokenRow.id }, data: { attempt_count: { increment: 1 } } });
    if (tokenRow.verified_at) throw new BadRequestException('OTP already verified');
    if (tokenRow.attempt_count >= 5) throw new BadRequestException('Too many attempts');
    if (tokenRow.expires_at < new Date()) throw new BadRequestException('OTP expired');
    if (tokenRow.code_hash !== this.hashToken(code)) throw new BadRequestException('Invalid OTP code');

    if (userId) {
      await this.prisma.users.update({ where: { id: userId }, data: { phone_verified_at: new Date() } });
    }
    await this.prisma.phone_otp_tokens.update({ where: { id: tokenRow.id }, data: { verified_at: new Date() } });
  }

  async loginWithPhoneOtp(phone: string, code: string, ip?: string, ua?: string, deviceName?: string): Promise<TokenPair> {
    const user = await this.prisma.users.findFirst({ where: { phone } });
    if (!user || !user.is_active) throw new UnauthorizedException('Invalid or expired OTP');
    await this.verifyPhoneOtp(phone, code, user.id, 'login');
    await this.prisma.users.update({ where: { id: user.id }, data: { last_login_at: new Date(), phone_verified_at: user.phone_verified_at ?? new Date() } });
    return this.generateTokens(user.id, { userAgent: ua, ipAddress: ip, deviceName });
  }

  async verifyEmail(token: string): Promise<void> {
    const tokenHash = this.hashToken(token);

    const tokenRow = await this.prisma.email_verification_tokens.findFirst({
      where: {
        token_hash: tokenHash,
        verified_at: null,
        expires_at: { gt: new Date() },
      },
      orderBy: { created_at: 'desc' },
    });

    if (!tokenRow) {
      throw new BadRequestException('Invalid or expired verification token');
    }

    await this.prisma.$transaction([
      this.prisma.users.update({
        where: { id: tokenRow.user_id },
        data: { email_verified_at: new Date() },
      }),
      this.prisma.email_verification_tokens.update({
        where: { id: tokenRow.id },
        data: { verified_at: new Date() },
      }),
    ]);
  }
}
