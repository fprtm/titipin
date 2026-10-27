import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { AuditAction } from '@titipin/shared';
import { UsersRepository } from '../repositories/users.repository';
import { AuditService } from '../../audit/audit.service';

@Injectable()
export class DeactivateUserUseCase {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly auditService: AuditService,
  ) {}

  async execute(
    targetId: string,
    actorId: string,
    metadata?: { ipAddress?: string; userAgent?: string },
  ): Promise<{ success: boolean; message: string }> {
    if (targetId === actorId) {
      throw new ForbiddenException(
        'Admin tidak dapat menonaktifkan akun sendiri',
      );
    }

    const user = await this.usersRepository.findById(targetId);

    if (!user) {
      throw new NotFoundException('Pengguna tidak ditemukan');
    }

    await this.usersRepository.deactivate(targetId);

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
