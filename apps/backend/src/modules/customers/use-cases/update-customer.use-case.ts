import { Injectable, NotFoundException } from '@nestjs/common';
import { AuditAction, CustomerItem, UpdateCustomerInput } from '@titipin/shared';
import * as schema from '../../../database/schema';
import { CustomersRepository } from '../repositories/customers.repository';
import { AuditService } from '../../audit/audit.service';
import { mapCustomerToItem } from './find-customers.use-case';

@Injectable()
export class UpdateCustomerUseCase {
  constructor(
    private readonly customersRepository: CustomersRepository,
    private readonly auditService: AuditService,
  ) {}

  async execute(
    id: string,
    dto: UpdateCustomerInput,
    actorId?: string,
    metadata?: { ipAddress?: string; userAgent?: string },
  ): Promise<CustomerItem> {
    const existing = await this.customersRepository.findById(id);

    if (!existing) {
      throw new NotFoundException('Pelanggan tidak ditemukan');
    }

    const updateValues: Partial<typeof schema.customers.$inferInsert> = {
      updatedAt: new Date(),
    };

    if (dto.customer_name !== undefined || dto.customerName !== undefined) {
      updateValues.customerName = (dto.customer_name ?? dto.customerName)!.trim();
    }
    if (dto.customer_address !== undefined || dto.customerAddress !== undefined) {
      updateValues.customerAddress = (dto.customer_address ?? dto.customerAddress)!.trim();
    }
    if (dto.gender !== undefined) {
      updateValues.gender = dto.gender;
    }
    if (dto.birth_date !== undefined || dto.birthDate !== undefined) {
      updateValues.birthDate = (dto.birth_date ?? dto.birthDate)!;
    }
    if (dto.phone !== undefined) {
      updateValues.phone = dto.phone ? dto.phone.trim() : null;
    }

    const updated = await this.customersRepository.update(id, updateValues);

    if (!updated) {
      throw new NotFoundException('Pelanggan tidak ditemukan');
    }

    if (actorId) {
      await this.auditService.log({
        userId: actorId,
        action: AuditAction.CUSTOMER_UPDATED,
        entityType: 'CUSTOMER',
        entityId: id,
        oldValues: {
          customerName: existing.customerName,
          customerAddress: existing.customerAddress,
          gender: existing.gender,
          birthDate: existing.birthDate,
          phone: existing.phone,
        },
        newValues: {
          customerName: updated.customerName,
          customerAddress: updated.customerAddress,
          gender: updated.gender,
          birthDate: updated.birthDate,
          phone: updated.phone,
        },
        ipAddress: metadata?.ipAddress,
        userAgent: metadata?.userAgent,
      });
    }

    return mapCustomerToItem(updated);
  }
}
