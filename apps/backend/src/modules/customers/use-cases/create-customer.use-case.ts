import { Injectable } from '@nestjs/common';
import { AuditAction, CreateCustomerInput, CustomerItem } from '@titipin/shared';
import { CustomersRepository } from '../repositories/customers.repository';
import { AuditService } from '../../audit/audit.service';
import { mapCustomerToItem } from './find-customers.use-case';

@Injectable()
export class CreateCustomerUseCase {
  constructor(
    private readonly customersRepository: CustomersRepository,
    private readonly auditService: AuditService,
  ) {}

  async execute(
    dto: CreateCustomerInput,
    actorId?: string,
    metadata?: { ipAddress?: string; userAgent?: string },
  ): Promise<CustomerItem> {
    const name = (dto.customer_name || dto.customerName || '').trim();
    const address = (dto.customer_address || dto.customerAddress || '').trim();
    const gender = dto.gender;
    const birthDate = dto.birth_date || dto.birthDate || null;
    const phone = dto.phone ? dto.phone.trim() : null;

    const newCustomer = await this.customersRepository.create({
      customerName: name,
      customerAddress: address,
      gender,
      birthDate,
      phone,
    });

    if (actorId) {
      await this.auditService.log({
        userId: actorId,
        action: AuditAction.CUSTOMER_CREATED,
        entityType: 'CUSTOMER',
        entityId: newCustomer.id,
        newValues: {
          id: newCustomer.id,
          customerName: newCustomer.customerName,
          customerAddress: newCustomer.customerAddress,
          gender: newCustomer.gender,
          birthDate: newCustomer.birthDate,
          phone: newCustomer.phone,
        },
        ipAddress: metadata?.ipAddress,
        userAgent: metadata?.userAgent,
      });
    }

    return mapCustomerToItem(newCustomer);
  }
}
