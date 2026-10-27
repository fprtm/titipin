import { Injectable } from '@nestjs/common';
import { OrdersRepository } from '../repositories/orders.repository';
import { AuditService } from '../../audit/audit.service';

@Injectable()
export class DiscardDraftOrderUseCase {
  constructor(
    private readonly ordersRepository: OrdersRepository,
    private readonly auditService: AuditService,
  ) {}

  async execute(cashierId: string): Promise<{ success: boolean; message: string }> {
    const draft = await this.ordersRepository.findDraftByUserId(cashierId);
    if (draft) {
      await this.ordersRepository.deleteDraftByUserId(cashierId);

      await this.auditService.log({
        action: 'DRAFT_DISCARDED',
        entityType: 'DRAFT_ORDER',
        entityId: String(draft.id),
        userId: cashierId,
        newValues: {
          status: 'DISCARDED',
        },
      });
    }

    return {
      success: true,
      message: 'Draft order berhasil dibatalkan',
    };
  }
}
