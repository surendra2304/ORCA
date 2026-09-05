import { Injectable, UnauthorizedException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AppCacheService } from '../common/cache/cache.service';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { VerifyEmailCodeDto } from './dto/verify-email-code.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { EmailCodeService } from './email-code.service';
import * as argon2 from 'argon2';
import { randomBytes, createHash } from 'crypto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private emailCodeService: EmailCodeService,
    private cacheService: AppCacheService,
  ) {}

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private formatAuthResponse(user: any, workspace: any) {
    return {
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
      workspace: { id: workspace.id, name: workspace.name, publicKey: workspace.publicKey },
    };
  }

  private async generateTokens(userId: string, workspaceId: string, role: string) {
    const accessSecret = this.configService.get<string>('JWT_ACCESS_SECRET');
    const refreshSecret = this.configService.get<string>('JWT_REFRESH_SECRET');
    const accessTtl = this.configService.get<number>('ACCESS_TTL', 900);
    const refreshTtl = this.configService.get<number>('REFRESH_TTL', 2592000);

    const payload = { sub: userId, workspaceId, role };
    const accessToken = this.jwtService.sign(payload, {
      secret: accessSecret,
      expiresIn: `${accessTtl}s`,
    });

    const refreshPayload = { sub: userId, jti: randomBytes(16).toString('hex') };
    const rawRefreshToken = this.jwtService.sign(refreshPayload, {
      secret: refreshSecret,
      expiresIn: `${refreshTtl}s`,
    });

    const refreshTokenHash = this.hashToken(rawRefreshToken);
    const expiresAt = new Date(Date.now() + refreshTtl * 1000);

    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash: refreshTokenHash,
        expiresAt,
      },
    });

    return {
      accessToken,
      refreshToken: rawRefreshToken,
    };
  }

  async signup(dto: SignupDto) {
    const email = dto.email.toLowerCase();

    // Check if email already registered
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });
    if (existingUser) {
      throw new ConflictException('Email address is already registered');
    }

    // Generate workspace public key: 'ws_' + 24 hex chars
    const publicKey = `ws_${randomBytes(12).toString('hex')}`;

    // Hashes password
    const passwordHash = await argon2.hash(dto.password);

    await this.emailCodeService.issueCode(email, 'signup', {
      companyName: dto.companyName,
      websiteUrl: dto.websiteUrl ?? null,
      passwordHash,
      publicKey,
    });

    return { message: 'Verification code sent to email' };
  }

  async verifySignup(dto: VerifyEmailCodeDto & { companyName?: string; websiteUrl?: string; password?: string }) {
    const email = dto.email.toLowerCase();
    const existingUser = await this.prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      throw new ConflictException('Email address is already registered');
    }
    const codeRecord = await this.emailCodeService.verifyCode(email, 'signup', dto.code);
    if (!codeRecord) {
      throw new BadRequestException('Invalid or expired verification code');
    }
    await this.emailCodeService.consumeCode(codeRecord.id);
    const payload = (codeRecord.payload as any) || {};
    if (!payload.passwordHash || !payload.publicKey || !payload.companyName) {
      throw new BadRequestException('Verification session is incomplete');
    }
    const result = await this.prisma.$transaction(async (tx) => {
      const workspace = await tx.workspace.create({
        data: {
          name: payload.companyName,
          websiteUrl: payload.websiteUrl ?? undefined,
          publicKey: payload.publicKey,
        },
      });
      const user = await tx.user.create({
        data: {
          workspaceId: workspace.id,
          email,
          passwordHash: payload.passwordHash,
          role: 'owner',
        },
      });
      return { workspace, user };
    });
    const tokens = await this.generateTokens(result.user.id, result.workspace.id, result.user.role);
    return {
      ...tokens,
      ...this.formatAuthResponse(result.user, result.workspace),
    };
  }

  async login(dto: LoginDto) {
    const email = dto.email.toLowerCase();

    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { workspace: true },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const passwordMatches = await argon2.verify(user.passwordHash, dto.password);
    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const tokens = await this.generateTokens(user.id, user.workspaceId, user.role);

    return {
      ...tokens,
      ...this.formatAuthResponse(user, user.workspace),
    };
  }

  async refresh(refreshToken: string) {
    const refreshSecret = this.configService.get<string>('JWT_REFRESH_SECRET');

    let payload: any;
    try {
      payload = this.jwtService.verify(refreshToken, { secret: refreshSecret });
    } catch (err) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const tokenHash = this.hashToken(refreshToken);
    const tokenRecord = await this.prisma.refreshToken.findFirst({
      where: { tokenHash, revokedAt: null },
      include: { user: true },
    });

    if (!tokenRecord || tokenRecord.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid or expired session');
    }

    // Refresh token rotation: delete / revoke old token
    await this.prisma.refreshToken.delete({
      where: { id: tokenRecord.id },
    });

    // Generate new tokens
    return this.generateTokens(tokenRecord.userId, tokenRecord.user.workspaceId, tokenRecord.user.role);
  }

  async logout(refreshToken: string) {
    const tokenHash = this.hashToken(refreshToken);
    // Delete the token hash from the DB
    await this.prisma.refreshToken.deleteMany({
      where: { tokenHash },
    });
  }

  async forgotPassword(email: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });
    if (!user) {
      throw new BadRequestException('No account found with this email address');
    }
    await this.emailCodeService.issueCode(email, 'reset-password', { userId: user.id });
    return { ok: true };
  }

  async verifyResetCode(dto: VerifyEmailCodeDto) {
    const email = dto.email.toLowerCase();
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    const codeRecord = await this.emailCodeService.verifyCode(email, 'reset-password', dto.code);
    if (!codeRecord) {
      throw new BadRequestException('Invalid or expired verification code');
    }
    return { ok: true };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const email = dto.email.toLowerCase();
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    const codeRecord = await this.emailCodeService.verifyCode(email, 'reset-password', dto.code);
    if (!codeRecord) {
      throw new BadRequestException('Invalid or expired verification code');
    }
    await this.emailCodeService.consumeCode(codeRecord.id);
    const passwordHash = await argon2.hash(dto.newPassword);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });
    return { ok: true };
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const currentMatches = await argon2.verify(user.passwordHash, dto.currentPassword);
    if (!currentMatches) {
      throw new BadRequestException('Current password is incorrect');
    }

    const passwordHash = await argon2.hash(dto.newPassword);
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });
  }

  async getMe(userId: string) {
    const cacheKey = `auth:me:${userId}`;
    return this.cacheService.getOrSet(cacheKey, 60, async () => {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        include: { workspace: true },
      });
      if (!user) {
        throw new UnauthorizedException('User not found');
      }
      return this.formatAuthResponse(user, user.workspace);
    });
  }

  async updateMe(userId: string, data: { name?: string; email?: string }) {
    this.cacheService.delete(`auth:me:${userId}`);
    this.cacheService.delete(`auth:user:${userId}`);
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.email !== undefined ? { email: data.email.toLowerCase() } : {}),
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });
  }
}
