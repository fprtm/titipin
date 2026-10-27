import { Injectable } from '@nestjs/common';
import { UserItem, Role } from '@titipin/shared';
import * as schema from '../../../database/schema';
import { UsersRepository } from '../repositories/users.repository';

export function mapUserToItem(user: typeof schema.users.$inferSelect): UserItem {
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

@Injectable()
export class FindUsersUseCase {
  constructor(private readonly usersRepository: UsersRepository) {}

  async execute(): Promise<UserItem[]> {
    const users = await this.usersRepository.findAll();
    return users.map(mapUserToItem);
  }
}
