import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '@prisma/client';

interface DiscordProfile {
  id: string;
  username: string;
  discriminator?: string;
  avatar?: string;
  email?: string;
  accessToken: string;
  refreshToken: string;
}

interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private auditService: AuditService,
  ) {}

  async validateDiscordUser(profile: DiscordProfile): Promise<TokenPair> {
    let user = await this.prisma.user.findUnique({
      where: { discordId: profile.id },
    });

    if (user) {
      // Update existing user
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: {
          username: profile.username,
          discriminator: profile.discriminator,
          avatar: profile.avatar,
          email: profile.email,
          lastLoginAt: new Date(),
        },
      });
      
      this.logger.log(`User ${user.username} logged in`);
    } else {
      // Create new user
      user = await this.prisma.user.create({
        data: {
          discordId: profile.id,
          username: profile.username,
          discriminator: profile.discriminator,
          avatar: profile.avatar,
          email: profile.email,
          lastLoginAt: new Date(),
        },
      });
      
      this.logger.log(`New user ${user.username} registered`);
    }

    // Generate tokens
    const tokens = await this.generateTokens(user.id, user.discordId);
    
    // Store refresh token
    await this.storeRefreshToken(user.id, tokens.refreshToken);
    
    // Audit log
    await this.auditService.log({
      userId: user.id,
      action: AuditAction.USER_LOGIN,
      entityType: 'user',
      entityId: user.id,
    });

    return tokens;
  }

  async refreshTokens(userId: string, refreshToken: string): Promise<TokenPair> {
    // Verify refresh token exists and is valid
    const storedToken = await this.prisma.session.findUnique({
      where: { refreshToken },
    });

    if (!storedToken || storedToken.userId !== userId) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (storedToken.expiresAt < new Date()) {
      // Delete expired token
      await this.prisma.session.delete({
        where: { id: storedToken.id },
      });
      throw new UnauthorizedException('Refresh token expired');
    }

    // Generate new tokens
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const tokens = await this.generateTokens(user.id, user.discordId);

    // Delete old refresh token and store new one
    await this.prisma.session.delete({
      where: { id: storedToken.id },
    });
    await this.storeRefreshToken(user.id, tokens.refreshToken);

    return tokens;
  }

  async logout(userId: string, refreshToken: string): Promise<void> {
    // Delete refresh token
    await this.prisma.session.deleteMany({
      where: {
        userId,
        refreshToken,
      },
    });

    // Audit log
    await this.auditService.log({
      userId,
      action: AuditAction.USER_LOGOUT,
      entityType: 'user',
      entityId: userId,
    });
  }

  async logoutAll(userId: string): Promise<void> {
    // Delete all refresh tokens
    await this.prisma.session.deleteMany({
      where: { userId },
    });

    this.logger.log(`All sessions invalidated for user ${userId}`);
  }

  private async generateTokens(userId: string, discordId: string): Promise<TokenPair> {
    const payload = {
      sub: userId,
      discordId,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload),
      this.jwtService.signAsync(payload, {
        secret: this.configService.get('JWT_REFRESH_SECRET'),
        expiresIn: this.configService.get('JWT_REFRESH_EXPIRATION', '7d'),
      }),
    ]);

    return {
      accessToken,
      refreshToken,
    };
  }

  private async storeRefreshToken(userId: string, refreshToken: string): Promise<void> {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    await this.prisma.session.create({
      data: {
        userId,
        refreshToken,
        expiresAt,
      },
    });
  }
}
