import { Injectable, NotFoundException } from '@nestjs/common';
import { UserItem } from '@titipin/shared';
import { UsersRepository } from '../repositories/users.repository';
import { mapUserToItem } from './find-users.use-case';

@Injectable()
export class FindUserByIdUseCase {
  constructor(private readonly usersRepository: UsersRepository) {}

  async execute(id: string): Promise<UserItem> {
    const user = await this.usersRepository.findById(id);

    if (!user) {
      throw new NotFoundException('Pengguna tidak ditemukan');
    }

    return mapUserToItem(user);
  }
}
