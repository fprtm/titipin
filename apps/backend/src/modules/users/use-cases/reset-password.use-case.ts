import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  UnprocessableEntityException,
} from '@nestjs/common';
import bcrypt from 'bcryptjs';
import { AuditAction } from '@titipin/shared';
import { UsersRepository } from '../repositories/users.repository';
import { AuditService } from '../../audit/audit.service';
import { ResetPasswordDto } from '../dto/reset-password.dto';

@Injectable()
export class ResetPasswordUseCase {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly auditService: AuditService,
  ) {}

  async execute(
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

    const user = await this.usersRepository.findById(targetId);

    if (!user) {
      throw new NotFoundException('Pengguna tidak ditemukan');
    }

    if (user.deletedAt !== null) {
      throw new UnprocessableEntityException('Pengguna telah dinonaktifkan');
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(dto.new_password, salt);

    await this.usersRepository.updatePassword(targetId, hashedPassword);

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
}
