import { Injectable } from '@nestjs/common';
import { UserItem } from '@titipin/shared';
import { CreateUserDto } from './dto/create-user.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { FindUsersUseCase } from './use-cases/find-users.use-case';
import { FindUserByIdUseCase } from './use-cases/find-user-by-id.use-case';
import { CreateUserUseCase } from './use-cases/create-user.use-case';
import { ResetPasswordUseCase } from './use-cases/reset-password.use-case';
import { DeactivateUserUseCase } from './use-cases/deactivate-user.use-case';

@Injectable()
export class UsersService {
  constructor(
    private readonly findUsersUseCase: FindUsersUseCase,
    private readonly findUserByIdUseCase: FindUserByIdUseCase,
    private readonly createUserUseCase: CreateUserUseCase,
    private readonly resetPasswordUseCase: ResetPasswordUseCase,
    private readonly deactivateUserUseCase: DeactivateUserUseCase,
  ) {}

  async findAll(): Promise<UserItem[]> {
    return this.findUsersUseCase.execute();
  }

  async findById(id: string): Promise<UserItem> {
    return this.findUserByIdUseCase.execute(id);
  }

  async create(
    dto: CreateUserDto,
    actorId: string,
    metadata?: { ipAddress?: string; userAgent?: string },
  ): Promise<UserItem> {
    return this.createUserUseCase.execute(dto, actorId, metadata);
  }

  async resetPassword(
    targetId: string,
    dto: ResetPasswordDto,
    actorId: string,
    metadata?: { ipAddress?: string; userAgent?: string },
  ): Promise<{ success: boolean; message: string }> {
    return this.resetPasswordUseCase.execute(targetId, dto, actorId, metadata);
  }

  async deactivate(
    targetId: string,
    actorId: string,
    metadata?: { ipAddress?: string; userAgent?: string },
  ): Promise<{ success: boolean; message: string }> {
    return this.deactivateUserUseCase.execute(targetId, actorId, metadata);
  }
}
