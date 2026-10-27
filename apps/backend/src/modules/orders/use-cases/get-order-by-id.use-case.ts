import { Injectable, NotFoundException } from '@nestjs/common';
import { OrderDetailData } from '@titipin/shared';
import { OrdersRepository } from '../repositories/orders.repository';

@Injectable()
export class GetOrderByIdUseCase {
  constructor(private readonly ordersRepository: OrdersRepository) {}

  async execute(id: number): Promise<OrderDetailData> {
    const order = await this.ordersRepository.findById(id);
    if (!order) {
      throw new NotFoundException(`Pesanan dengan ID ${id} tidak ditemukan`);
    }

    return order;
  }
}
