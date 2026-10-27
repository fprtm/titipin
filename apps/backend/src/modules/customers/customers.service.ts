import { Injectable } from '@nestjs/common';
import {
  CustomerItem,
  CreateCustomerInput,
  UpdateCustomerInput,
  CustomerQueryInput,
} from '@titipin/shared';
import { FindCustomersUseCase } from './use-cases/find-customers.use-case';
import { GetCustomerByIdUseCase } from './use-cases/get-customer-by-id.use-case';
import { CreateCustomerUseCase } from './use-cases/create-customer.use-case';
import { UpdateCustomerUseCase } from './use-cases/update-customer.use-case';
import { DeleteCustomerUseCase } from './use-cases/delete-customer.use-case';

@Injectable()
export class CustomersService {
  constructor(
    private readonly findCustomersUseCase: FindCustomersUseCase,
    private readonly getCustomerByIdUseCase: GetCustomerByIdUseCase,
    private readonly createCustomerUseCase: CreateCustomerUseCase,
    private readonly updateCustomerUseCase: UpdateCustomerUseCase,
    private readonly deleteCustomerUseCase: DeleteCustomerUseCase,
  ) {}

  async findAll(query: CustomerQueryInput) {
    return this.findCustomersUseCase.execute(query);
  }

  async findById(id: string): Promise<CustomerItem> {
    return this.getCustomerByIdUseCase.execute(id);
  }

  async create(
    dto: CreateCustomerInput,
    actorId?: string,
    metadata?: { ipAddress?: string; userAgent?: string },
  ): Promise<CustomerItem> {
    return this.createCustomerUseCase.execute(dto, actorId, metadata);
  }

  async update(
    id: string,
    dto: UpdateCustomerInput,
    actorId?: string,
    metadata?: { ipAddress?: string; userAgent?: string },
  ): Promise<CustomerItem> {
    return this.updateCustomerUseCase.execute(id, dto, actorId, metadata);
  }

  async delete(
    id: string,
    actorId?: string,
    metadata?: { ipAddress?: string; userAgent?: string },
  ): Promise<{ success: boolean; message: string }> {
    return this.deleteCustomerUseCase.execute(id, actorId, metadata);
  }
}
