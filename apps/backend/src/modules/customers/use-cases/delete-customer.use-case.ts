import { Injectable, NotFoundException } from '@nestjs/common';
import { AuditAction } from '@titipin/shared';
import { CustomersRepository } from '../repositories/customers.repository';
import { AuditService } from '../../audit/audit.service';

@Injectable()
export class DeleteCustomerUseCase {
  constructor(
    private readonly customersRepository: CustomersRepository,
    private readonly auditService: AuditService,
  ) {}

  async execute(
    id: string,
    actorId?: string,
    metadata?: { ipAddress?: string; userAgent?: string },
  ): Promise<{ success: boolean; message: string }> {
    const existing = await this.customersRepository.findById(id);

    if (!existing) {
      throw new NotFoundException('Pelanggan tidak ditemukan');
    }

    await this.customersRepository.softDelete(id);

    if (actorId) {
      await this.auditService.log({
        userId: actorId,
        action: AuditAction.CUSTOMER_DELETED,
        entityType: 'CUSTOMER',
        entityId: id,
        oldValues: {
          customerName: existing.customerName,
          deletedAt: existing.deletedAt,
        },
        newValues: {
          deletedAt: new Date().toISOString(),
        },
        ipAddress: metadata?.ipAddress,
        userAgent: metadata?.userAgent,
      });
    }

    return {
      success: true,
      message: 'Data pelanggan berhasil dihapus',
    };
  }
}
