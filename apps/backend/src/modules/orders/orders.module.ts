import { Module } from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { OrdersRepository } from './repositories/orders.repository';
import { ProcessCheckoutUseCase } from './use-cases/process-checkout.use-case';
import { HoldDraftOrderUseCase } from './use-cases/hold-draft-order.use-case';
import { GetDraftOrderUseCase } from './use-cases/get-draft-order.use-case';
import { DiscardDraftOrderUseCase } from './use-cases/discard-draft-order.use-case';
import { ResumeDraftOrderUseCase } from './use-cases/resume-draft-order.use-case';
import { FindOrdersUseCase } from './use-cases/find-orders.use-case';
import { GetOrderByIdUseCase } from './use-cases/get-order-by-id.use-case';
import { DatabaseModule } from '../../database/database.module';
import { ProductsModule } from '../products/products.module';
import { CustomersModule } from '../customers/customers.module';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    DatabaseModule,
    ProductsModule,
    CustomersModule,
    AuditModule,
    AuthModule,
  ],
  controllers: [OrdersController],
  providers: [
    OrdersRepository,
    ProcessCheckoutUseCase,
    HoldDraftOrderUseCase,
    GetDraftOrderUseCase,
    DiscardDraftOrderUseCase,
    ResumeDraftOrderUseCase,
    FindOrdersUseCase,
    GetOrderByIdUseCase,
    OrdersService,
  ],
  exports: [
    OrdersService,
    OrdersRepository,
    ProcessCheckoutUseCase,
    HoldDraftOrderUseCase,
    GetDraftOrderUseCase,
    DiscardDraftOrderUseCase,
    ResumeDraftOrderUseCase,
    FindOrdersUseCase,
    GetOrderByIdUseCase,
  ],
})
export class OrdersModule {}
