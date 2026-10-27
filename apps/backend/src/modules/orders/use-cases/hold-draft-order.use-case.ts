import { Injectable, UnprocessableEntityException } from '@nestjs/common';
import {
  HoldOrderInput,
  DraftOrderData,
  OrderActivityAction,
} from '@titipin/shared';
import { OrdersRepository } from '../repositories/orders.repository';
import { CustomersRepository } from '../../customers/repositories/customers.repository';
import { AuditService } from '../../audit/audit.service';

@Injectable()
export class HoldDraftOrderUseCase {
  constructor(
    private readonly ordersRepository: OrdersRepository,
    private readonly customersRepository: CustomersRepository,
    private readonly auditService: AuditService,
  ) {}

  async execute(dto: HoldOrderInput, cashierId: string): Promise<DraftOrderData> {
    const existingDraft = await this.ordersRepository.findDraftByUserId(cashierId);
    if (existingDraft) {
      throw new UnprocessableEntityException(
        'Kasir sudah memiliki satu transaksi yang sedang di-hold. Selesaikan atau batalkan draft sebelumnya terlebih dahulu.',
      );
    }

    if (!dto.items || dto.items.length === 0) {
      throw new UnprocessableEntityException('Item transaksi tidak boleh kosong');
    }

    const normalizedItems = dto.items.map((it) => {
      const pId = it.product_id ?? it.productId;
      if (!pId || pId <= 0) {
        throw new UnprocessableEntityException('ID produk harus valid');
      }
      if (!it.quantity || it.quantity <= 0) {
        throw new UnprocessableEntityException('Kuantitas minimal 1');
      }
      return {
        product_id: pId,
        quantity: it.quantity,
      };
    });

    const targetCustomerId = dto.customer_id ?? dto.customerId ?? null;
    if (targetCustomerId) {
      const customer = await this.customersRepository.findById(targetCustomerId);
      if (!customer || customer.deletedAt !== null) {
        throw new UnprocessableEntityException('Pelanggan tidak ditemukan atau sudah dinonaktifkan');
      }
    }

    // Persist to draft_orders without decrementing physical stock (ADR-005)
    const draft = await this.ordersRepository.saveDraftOrder({
      userId: cashierId,
      customerId: targetCustomerId,
      items: normalizedItems,
    });

    await this.auditService.log({
      action: OrderActivityAction.ORDER_HELD,
      entityType: 'DRAFT_ORDER',
      entityId: String(draft.id),
      userId: cashierId,
      newValues: {
        userId: cashierId,
        customerId: targetCustomerId,
        itemsCount: normalizedItems.length,
      },
    });

    return {
      id: draft.id,
      userId: draft.userId,
      user_id: draft.userId,
      customerId: draft.customerId,
      customer_id: draft.customerId,
      items: draft.items,
      createdAt: draft.createdAt.toISOString(),
      created_at: draft.createdAt.toISOString(),
      updatedAt: draft.updatedAt.toISOString(),
      updated_at: draft.updatedAt.toISOString(),
    };
  }
}
