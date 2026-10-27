import { Injectable } from '@nestjs/common';
import { OrderQueryInput, OrderDetailData, PaginationMeta } from '@titipin/shared';
import { OrdersRepository } from '../repositories/orders.repository';

@Injectable()
export class FindOrdersUseCase {
  constructor(private readonly ordersRepository: OrdersRepository) {}

  async execute(query: OrderQueryInput): Promise<{
    items: OrderDetailData[];
    meta: PaginationMeta & { total_items: number };
  }> {
    const page = Math.max(1, query.page || 1);
    const perPage = Math.max(1, Math.min(100, query.per_page || 10));

    const { items, total } = await this.ordersRepository.findAll(query);
    const totalPages = Math.ceil(total / perPage) || 1;

    return {
      items,
      meta: {
        page,
        per_page: perPage,
        total,
        total_items: total,
        total_pages: totalPages,
      },
    };
  }
}
