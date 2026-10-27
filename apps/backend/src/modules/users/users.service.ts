import {
  Injectable,
  Inject,
  NotFoundException,
  ForbiddenException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { eq, desc } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { DRIZZLE_ORM, DrizzleDatabase } from '../../database/database.module';
import * as schema from '../../database/schema';
import { AuditService } from '../audit/audit.service';
import { AuditAction, Role, UserItem } from '@titipin/shared';
import { CreateUserDto } from './dto/create-user.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

@Injectable()
export class UsersService {
  constructor(
    @Inject(DRIZZLE_ORM) private readonly db: DrizzleDatabase,
    private readonly auditService: AuditService,
  ) {}

  private mapUser(user: typeof schema.users.$inferSelect): UserItem {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role as Role,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
      deletedAt: user.deletedAt ? user.deletedAt.toISOString() : null,
      created_at: user.createdAt.toISOString(),
      updated_at: user.updatedAt.toISOString(),
      deleted_at: user.deletedAt ? user.deletedAt.toISOString() : null,
    };
  }

  async findAll(): Promise<UserItem[]> {
    const userRecords = await this.db
      .select()
      .from(schema.users)
      .orderBy(desc(schema.users.createdAt));

    return userRecords.map((user) => this.mapUser(user));
  }

  async findById(id: string): Promise<UserItem> {
    const [user] = await this.db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, id))
      .limit(1);

    if (!user) {
      throw new NotFoundException('Pengguna tidak ditemukan');
    }

    return this.mapUser(user);
  }

  async create(
    dto: CreateUserDto,
    actorId: string,
    metadata?: { ipAddress?: string; userAgent?: string },
  ): Promise<UserItem> {
    const existing = await this.db
      .select({ id: schema.users.id })
      .from(schema.users)
      .where(eq(schema.users.email, dto.email.toLowerCase().trim()))
      .limit(1);

    if (existing.length > 0) {
      throw new UnprocessableEntityException('Email sudah terdaftar');
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(dto.password, salt);

    const [newUser] = await this.db
      .insert(schema.users)
      .values({
        name: dto.name.trim(),
        email: dto.email.toLowerCase().trim(),
        password: hashedPassword,
        role: dto.role,
      })
      .returning();

    await this.auditService.log({
      userId: actorId,
      action: AuditAction.USER_CREATED,
      entityType: 'USER',
      entityId: newUser.id,
      newValues: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
      },
      ipAddress: metadata?.ipAddress,
      userAgent: metadata?.userAgent,
    });

    return this.mapUser(newUser);
  }

  async resetPassword(
    targetId: string,
    dto: ResetPasswordDto,
    actorId: string,
    metadata?: { ipAddress?: string; userAgent?: string },
  ): Promise<{ success: boolean; message: string }> {
    if (targetId === actorId) {
      throw new ForbiddenException(
        'Admin tidak dapat mereset kata sandi sendiri melalui menu ini',
      );
    }

    const [user] = await this.db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, targetId))
      .limit(1);

    if (!user) {
      throw new NotFoundException('Pengguna tidak ditemukan');
    }

    if (user.deletedAt !== null) {
      throw new UnprocessableEntityException('Pengguna telah dinonaktifkan');
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(dto.new_password, salt);

    await this.db
      .update(schema.users)
      .set({
        password: hashedPassword,
        refreshTokenHash: null,
        updatedAt: new Date(),
      })
      .where(eq(schema.users.id, targetId));

    await this.auditService.log({
      userId: actorId,
      action: AuditAction.USER_RESET_PASSWORD,
      entityType: 'USER',
      entityId: targetId,
      oldValues: {
        targetUserId: targetId,
        email: user.email,
      },
      newValues: {
        targetUserId: targetId,
        email: user.email,
        revokedSessions: true,
      },
      ipAddress: metadata?.ipAddress,
      userAgent: metadata?.userAgent,
    });

    return {
      success: true,
      message: 'Kata sandi pengguna berhasil direset dan seluruh sesi telah dicabut',
    };
  }

  async deactivate(
    targetId: string,
    actorId: string,
    metadata?: { ipAddress?: string; userAgent?: string },
  ): Promise<{ success: boolean; message: string }> {
    if (targetId === actorId) {
      throw new ForbiddenException(
        'Admin tidak dapat menonaktifkan akun sendiri',
      );
    }

    const [user] = await this.db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, targetId))
      .limit(1);

    if (!user) {
      throw new NotFoundException('Pengguna tidak ditemukan');
    }

    await this.db
      .update(schema.users)
      .set({
        deletedAt: new Date(),
        refreshTokenHash: null,
        updatedAt: new Date(),
      })
      .where(eq(schema.users.id, targetId));

    await this.auditService.log({
      userId: actorId,
      action: AuditAction.USER_DEACTIVATED,
      entityType: 'USER',
      entityId: targetId,
      oldValues: {
        targetUserId: targetId,
        name: user.name,
        email: user.email,
        deletedAt: user.deletedAt,
      },
      newValues: {
        targetUserId: targetId,
        name: user.name,
        email: user.email,
        deletedAt: new Date().toISOString(),
        revokedSessions: true,
      },
      ipAddress: metadata?.ipAddress,
      userAgent: metadata?.userAgent,
    });

    return {
      success: true,
      message: 'Akun pengguna berhasil dinonaktifkan dan seluruh sesi aktif telah dicabut',
    };
  }
}
