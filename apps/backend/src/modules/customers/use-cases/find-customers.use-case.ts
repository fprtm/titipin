import { Injectable } from '@nestjs/common';
import { CustomerItem, CustomerQueryInput, Gender } from '@titipin/shared';
import * as schema from '../../../database/schema';
import { CustomersRepository } from '../repositories/customers.repository';

export function mapCustomerToItem(cust: typeof schema.customers.$inferSelect): CustomerItem {
  const createdAtStr = cust.createdAt.toISOString();
  const updatedAtStr = cust.updatedAt.toISOString();
  const deletedAtStr = cust.deletedAt ? cust.deletedAt.toISOString() : null;

  return {
    id: cust.id,
    customerName: cust.customerName,
    customerAddress: cust.customerAddress,
    gender: cust.gender as Gender,
    birthDate: cust.birthDate,
    phone: cust.phone,
    createdAt: createdAtStr,
    updatedAt: updatedAtStr,
    deletedAt: deletedAtStr,
    // snake_case aliases for client / OpenAPI / Vitest compatibility
    customer_name: cust.customerName,
    customer_address: cust.customerAddress,
    birth_date: cust.birthDate,
    created_at: createdAtStr,
    updated_at: updatedAtStr,
    deleted_at: deletedAtStr,
  };
}

@Injectable()
export class FindCustomersUseCase {
  constructor(private readonly customersRepository: CustomersRepository) {}

  async execute(query: CustomerQueryInput) {
    const page = Math.max(1, query.page || 1);
    const perPage = Math.max(1, Math.min(100, query.per_page || 10));

    const { items, total } = await this.customersRepository.findAll(query);
    const totalPages = Math.ceil(total / perPage) || 1;

    return {
      items: items.map(mapCustomerToItem),
      meta: {
        page,
        per_page: perPage,
        total_items: total,
        total_pages: totalPages,
      },
    };
  }
}
