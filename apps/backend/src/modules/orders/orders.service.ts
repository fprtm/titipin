import { Injectable } from '@nestjs/common';
import {
  CreateOrderInput,
  CheckoutOrderInput,
  HoldOrderInput,
  OrderQueryInput,
  OrderDetailData,
  DraftOrderData,
} from '@titipin/shared';
import { ProcessCheckoutUseCase } from './use-cases/process-checkout.use-case';
import { HoldDraftOrderUseCase } from './use-cases/hold-draft-order.use-case';
import { GetDraftOrderUseCase } from './use-cases/get-draft-order.use-case';
import { DiscardDraftOrderUseCase } from './use-cases/discard-draft-order.use-case';
import { ResumeDraftOrderUseCase } from './use-cases/resume-draft-order.use-case';
import { FindOrdersUseCase } from './use-cases/find-orders.use-case';
import { GetOrderByIdUseCase } from './use-cases/get-order-by-id.use-case';

@Injectable()
export class OrdersService {
  constructor(
    private readonly processCheckoutUseCase: ProcessCheckoutUseCase,
    private readonly holdDraftOrderUseCase: HoldDraftOrderUseCase,
    private readonly getDraftOrderUseCase: GetDraftOrderUseCase,
    private readonly discardDraftOrderUseCase: DiscardDraftOrderUseCase,
    private readonly resumeDraftOrderUseCase: ResumeDraftOrderUseCase,
    private readonly findOrdersUseCase: FindOrdersUseCase,
    private readonly getOrderByIdUseCase: GetOrderByIdUseCase,
  ) {}

  async checkout(
    dto: CreateOrderInput | CheckoutOrderInput,
    cashierId: string,
    metadata?: { ipAddress?: string; userAgent?: string },
  ): Promise<OrderDetailData> {
    return this.processCheckoutUseCase.execute(dto, cashierId, metadata);
  }

  async hold(dto: HoldOrderInput, cashierId: string): Promise<DraftOrderData> {
    return this.holdDraftOrderUseCase.execute(dto, cashierId);
  }

  async getDraft(cashierId: string): Promise<DraftOrderData> {
    return this.getDraftOrderUseCase.execute(cashierId);
  }

  async discardDraft(cashierId: string): Promise<{ success: boolean; message: string }> {
    return this.discardDraftOrderUseCase.execute(cashierId);
  }

  async finalizeDraft(
    cashierId: string,
    dto?: CreateOrderInput,
    metadata?: { ipAddress?: string; userAgent?: string },
  ): Promise<OrderDetailData> {
    return this.resumeDraftOrderUseCase.execute(cashierId, dto, metadata);
  }

  async findAll(query: OrderQueryInput) {
    return this.findOrdersUseCase.execute(query);
  }

  async findById(id: number): Promise<OrderDetailData> {
    return this.getOrderByIdUseCase.execute(id);
  }
}
