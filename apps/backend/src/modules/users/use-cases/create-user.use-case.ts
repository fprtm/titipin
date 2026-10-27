import { Injectable, UnprocessableEntityException } from '@nestjs/common';
import bcrypt from 'bcryptjs';
import { AuditAction, UserItem } from '@titipin/shared';
import { UsersRepository } from '../repositories/users.repository';
import { AuditService } from '../../audit/audit.service';
import { CreateUserDto } from '../dto/create-user.dto';
import { mapUserToItem } from './find-users.use-case';

@Injectable()
export class CreateUserUseCase {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly auditService: AuditService,
  ) {}

  async execute(
    dto: CreateUserDto,
    actorId: string,
    metadata?: { ipAddress?: string; userAgent?: string },
  ): Promise<UserItem> {
    const existing = await this.usersRepository.findByEmail(dto.email);

    if (existing) {
      throw new UnprocessableEntityException('Email sudah terdaftar');
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(dto.password, salt);

    const newUser = await this.usersRepository.create({
      name: dto.name.trim(),
      email: dto.email.toLowerCase().trim(),
      password: hashedPassword,
      role: dto.role,
    });

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

    return mapUserToItem(newUser);
  }
}
