import { Module, forwardRef } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { UsersRepository } from './repositories/users.repository';
import { FindUsersUseCase } from './use-cases/find-users.use-case';
import { FindUserByIdUseCase } from './use-cases/find-user-by-id.use-case';
import { CreateUserUseCase } from './use-cases/create-user.use-case';
import { ResetPasswordUseCase } from './use-cases/reset-password.use-case';
import { DeactivateUserUseCase } from './use-cases/deactivate-user.use-case';
import { DatabaseModule } from '../../database/database.module';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [DatabaseModule, AuditModule, forwardRef(() => AuthModule)],
  controllers: [UsersController],
  providers: [
    UsersRepository,
    FindUsersUseCase,
    FindUserByIdUseCase,
    CreateUserUseCase,
    ResetPasswordUseCase,
    DeactivateUserUseCase,
    UsersService,
  ],
  exports: [
    UsersService,
    UsersRepository,
    FindUsersUseCase,
    FindUserByIdUseCase,
    CreateUserUseCase,
    ResetPasswordUseCase,
    DeactivateUserUseCase,
  ],
})
export class UsersModule {}
