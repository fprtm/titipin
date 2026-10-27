import { Injectable, Inject, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService, type JwtSignOptions } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { eq } from 'drizzle-orm';

type JwtExpiresIn = NonNullable<JwtSignOptions['expiresIn']>;
import { DRIZZLE_ORM, DrizzleDatabase } from '../../database/database.module';
import * as schema from '../../database/schema';
import { envConfig } from '../../config/env.config';
import { AuditService } from '../audit/audit.service';
import { AuditAction, UserItem, Role } from '@titipin/shared';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class AuthService {
  constructor(
    @Inject(DRIZZLE_ORM) private readonly db: DrizzleDatabase,
    private readonly jwtService: JwtService,
    private readonly auditService: AuditService,
  ) {}

  private mapUserToItem(user: typeof schema.users.$inferSelect): UserItem {
    const createdAtStr = user.createdAt.toISOString();
    const updatedAtStr = user.updatedAt.toISOString();
    const deletedAtStr = user.deletedAt ? user.deletedAt.toISOString() : null;

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role as Role,
      createdAt: createdAtStr,
      updatedAt: updatedAtStr,
      deletedAt: deletedAtStr,
      created_at: createdAtStr,
      updated_at: updatedAtStr,
      deleted_at: deletedAtStr,
    };
  }

  private hashTokenForStorage(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  async login(loginDto: LoginDto, ipAddress?: string, userAgent?: string) {
    const [user] = await this.db
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, loginDto.email))
      .limit(1);

    if (!user || user.deletedAt !== null) {
      throw new UnauthorizedException('Email atau kata sandi tidak valid. Silakan coba kembali.');
    }

    const isPasswordValid = await bcrypt.compare(loginDto.password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Email atau kata sandi tidak valid. Silakan coba kembali.');
    }

    const accessToken = await this.jwtService.signAsync(
      {
        sub: user.id,
        email: user.email,
        role: user.role,
        name: user.name,
      },
      {
        secret: envConfig.JWT_SECRET,
        expiresIn: envConfig.JWT_EXPIRES_IN as JwtExpiresIn,
      },
    );

    const refreshToken = await this.jwtService.signAsync(
      {
        jti: crypto.randomUUID(),
        sub: user.id,
        email: user.email,
      },
      {
        secret: envConfig.JWT_REFRESH_SECRET,
        expiresIn: envConfig.JWT_REFRESH_EXPIRES_IN as JwtExpiresIn,
      },
    );

    const tokenDigest = this.hashTokenForStorage(refreshToken);
    const refreshTokenHash = await bcrypt.hash(tokenDigest, 10);

    await this.db
      .update(schema.users)
      .set({
        refreshTokenHash,
        updatedAt: new Date(),
      })
      .where(eq(schema.users.id, user.id));

    await this.auditService.log({
      userId: user.id,
      action: AuditAction.AUTH_LOGIN,
      entityType: 'users',
      entityId: user.id,
      payload: {
        after: {
          email: user.email,
          role: user.role,
        },
      },
      ipAddress,
      userAgent,
    });

    return {
      accessToken,
      refreshToken,
      user: this.mapUserToItem(user),
    };
  }

  async refresh(refreshToken: string) {
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token tidak ditemukan');
    }

    let payload: { sub: string; email: string };
    try {
      payload = await this.jwtService.verifyAsync<{ sub: string; email: string }>(refreshToken, {
        secret: envConfig.JWT_REFRESH_SECRET,
      });
    } catch {
      throw new UnauthorizedException('Refresh token kadaluarsa atau tidak valid');
    }

    const [user] = await this.db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, payload.sub))
      .limit(1);

    if (!user || user.deletedAt !== null || !user.refreshTokenHash) {
      throw new UnauthorizedException('Sesi tidak valid atau telah dicabut');
    }

    const tokenDigest = this.hashTokenForStorage(refreshToken);
    const isMatch = await bcrypt.compare(tokenDigest, user.refreshTokenHash);
    if (!isMatch) {
      throw new UnauthorizedException('Refresh token hash tidak cocok');
    }

    const newAccessToken = await this.jwtService.signAsync(
      {
        sub: user.id,
        email: user.email,
        role: user.role,
        name: user.name,
      },
      {
        secret: envConfig.JWT_SECRET,
        expiresIn: envConfig.JWT_EXPIRES_IN as JwtExpiresIn,
      },
    );

    const newRefreshToken = await this.jwtService.signAsync(
      {
        jti: crypto.randomUUID(),
        sub: user.id,
        email: user.email,
      },
      {
        secret: envConfig.JWT_REFRESH_SECRET,
        expiresIn: envConfig.JWT_REFRESH_EXPIRES_IN as JwtExpiresIn,
      },
    );

    const newRefreshTokenHash = await bcrypt.hash(this.hashTokenForStorage(newRefreshToken), 10);

    await this.db
      .update(schema.users)
      .set({
        refreshTokenHash: newRefreshTokenHash,
        updatedAt: new Date(),
      })
      .where(eq(schema.users.id, user.id));

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    };
  }

  async logout(userId: string, ipAddress?: string, userAgent?: string) {
    await this.db
      .update(schema.users)
      .set({
        refreshTokenHash: null,
        updatedAt: new Date(),
      })
      .where(eq(schema.users.id, userId));

    await this.auditService.log({
      userId,
      action: AuditAction.AUTH_LOGOUT,
      entityType: 'users',
      entityId: userId,
      ipAddress,
      userAgent,
    });

    return { message: 'Logout berhasil' };
  }

  async getProfile(userId: string) {
    const [user] = await this.db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, userId))
      .limit(1);

    if (!user || user.deletedAt !== null) {
      throw new UnauthorizedException('Pengguna tidak ditemukan atau telah dinonaktifkan');
    }

    return this.mapUserToItem(user);
  }

  async updateProfile(
    userId: string,
    dto: UpdateProfileDto,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const [existing] = await this.db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, userId))
      .limit(1);

    if (!existing || existing.deletedAt !== null) {
      throw new UnauthorizedException('Pengguna tidak ditemukan atau telah dinonaktifkan');
    }

    const [updated] = await this.db
      .update(schema.users)
      .set({
        name: dto.name,
        updatedAt: new Date(),
      })
      .where(eq(schema.users.id, userId))
      .returning();

    await this.auditService.log({
      userId,
      action: 'USER_UPDATED',
      entityType: 'users',
      entityId: userId,
      payload: {
        before: { name: existing.name },
        after: { name: updated.name },
      },
      ipAddress,
      userAgent,
    });

    return this.mapUserToItem(updated);
  }

  async changePassword(
    userId: string,
    dto: ChangePasswordDto,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const [user] = await this.db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, userId))
      .limit(1);

    if (!user || user.deletedAt !== null) {
      throw new UnauthorizedException('Pengguna tidak ditemukan atau telah dinonaktifkan');
    }

    const isCurrentValid = await bcrypt.compare(dto.current_password, user.password);
    if (!isCurrentValid) {
      throw new BadRequestException('Kata sandi saat ini tidak cocok');
    }

    const newPasswordHash = await bcrypt.hash(dto.new_password, 10);

    await this.db
      .update(schema.users)
      .set({
        password: newPasswordHash,
        updatedAt: new Date(),
      })
      .where(eq(schema.users.id, userId));

    await this.auditService.log({
      userId,
      action: AuditAction.AUTH_PASSWORD_CHANGED,
      entityType: 'users',
      entityId: userId,
      ipAddress,
      userAgent,
    });

    return { message: 'Kata sandi berhasil diperbarui' };
  }
}
