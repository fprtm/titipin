import { Injectable, NotFoundException } from '@nestjs/common';
import { DraftOrderData } from '@titipin/shared';
import { OrdersRepository } from '../repositories/orders.repository';
import { CustomersRepository } from '../../customers/repositories/customers.repository';

@Injectable()
export class GetDraftOrderUseCase {
  constructor(
    private readonly ordersRepository: OrdersRepository,
    private readonly customersRepository: CustomersRepository,
  ) {}

  async execute(cashierId: string): Promise<DraftOrderData> {
    const draft = await this.ordersRepository.findDraftByUserId(cashierId);
    if (!draft) {
      throw new NotFoundException('Tidak ada transaksi tertahan untuk kasir ini');
    }

    let customerName = draft.customerId ? undefined : 'Pelanggan Umum';
    if (draft.customerId) {
      const customer = await this.customersRepository.findById(draft.customerId);
      if (customer) {
        customerName = customer.customerName;
      }
    }

    return {
      id: draft.id,
      userId: draft.userId,
      user_id: draft.userId,
      customerId: draft.customerId,
      customer_id: draft.customerId,
      customerName,
      customer_name: customerName,
      items: draft.items.map((it) => ({
        productId: it.product_id,
        product_id: it.product_id,
        quantity: it.quantity,
      })),
      createdAt: draft.createdAt.toISOString(),
      created_at: draft.createdAt.toISOString(),
      updatedAt: draft.updatedAt.toISOString(),
      updated_at: draft.updatedAt.toISOString(),
    };
  }
}
