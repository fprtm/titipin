import { Injectable, NotFoundException } from '@nestjs/common';
import { CustomerItem } from '@titipin/shared';
import { CustomersRepository } from '../repositories/customers.repository';
import { mapCustomerToItem } from './find-customers.use-case';

@Injectable()
export class GetCustomerByIdUseCase {
  constructor(private readonly customersRepository: CustomersRepository) {}

  async execute(id: string): Promise<CustomerItem> {
    const customer = await this.customersRepository.findById(id);

    if (!customer) {
      throw new NotFoundException('Pelanggan tidak ditemukan');
    }

    return mapCustomerToItem(customer);
  }
}
