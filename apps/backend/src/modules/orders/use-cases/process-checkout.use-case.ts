import { Injectable, UnprocessableEntityException } from '@nestjs/common';
import {
  CreateOrderInput,
  CheckoutOrderInput,
  OrderDetailData,
  OrderActivityAction,
} from '@titipin/shared';
import { OrdersRepository } from '../repositories/orders.repository';
import { ProductsService } from '../../products/products.service';
import { CustomersRepository } from '../../customers/repositories/customers.repository';
import { AuditService } from '../../audit/audit.service';
import { DeductStockItemInput } from '../../products/use-cases/lock-and-deduct-stock.use-case';

export function isCustomerBirthdayToday(
  birthDateStr: string | null | undefined,
  date: Date = new Date(),
): boolean {
  if (!birthDateStr) return false;
  const parts = birthDateStr.split('-');
  if (parts.length < 3) return false;
  const birthMonth = parts[1].padStart(2, '0');
  const birthDay = parts[2].slice(0, 2).padStart(2, '0');

  const currentMonth = String(date.getMonth() + 1).padStart(2, '0');
  const currentDay = String(date.getDate()).padStart(2, '0');

  return birthMonth === currentMonth && birthDay === currentDay;
}

@Injectable()
export class ProcessCheckoutUseCase {
  constructor(
    private readonly ordersRepository: OrdersRepository,
    private readonly productsService: ProductsService,
    private readonly customersRepository: CustomersRepository,
    private readonly auditService: AuditService,
  ) {}

  async execute(
    dto: CreateOrderInput | CheckoutOrderInput,
    cashierId: string,
    metadata?: { ipAddress?: string; userAgent?: string },
  ): Promise<OrderDetailData> {
    if (!dto.items || dto.items.length === 0) {
      throw new UnprocessableEntityException('Item transaksi tidak boleh kosong');
    }

    const deductItems: DeductStockItemInput[] = dto.items.map((it) => {
      const pId = it.product_id ?? it.productId;
      if (!pId || pId <= 0) {
        throw new UnprocessableEntityException('ID produk harus valid');
      }
      if (!it.quantity || it.quantity <= 0) {
        throw new UnprocessableEntityException('Kuantitas minimal 1');
      }
      return {
        productId: pId,
        quantity: it.quantity,
      };
    });

    const targetCustomerId = dto.customer_id ?? dto.customerId ?? null;

    return this.ordersRepository.transaction(async (tx) => {
      let customer: Awaited<ReturnType<typeof this.customersRepository.findById>> = null;
      let isBirthday = false;

      if (targetCustomerId) {
        customer = await this.customersRepository.findById(targetCustomerId, false, tx);
        if (!customer || customer.deletedAt !== null) {
          throw new UnprocessableEntityException('Pelanggan tidak ditemukan atau sudah dinonaktifkan');
        }
        isBirthday = isCustomerBirthdayToday(customer.birthDate);
      }

      // Concurrency row-locking & atomic stock deduction (throws 422 on deficiency)
      const lockedProducts = await this.productsService.lockAndDeductStock(tx, deductItems);

      const subtotal = lockedProducts.reduce((acc, p) => acc + p.unitPrice * p.quantity, 0);

      // BR-006: 5% birthday discount capped at Rp 50.000
      const discount = isBirthday ? Math.min(50000, Math.round(subtotal * 0.05)) : 0;
      const totalAmount = Math.max(0, subtotal - discount);

      const transactionDate = new Date();
      const orderNumber = await this.ordersRepository.generateOrderNumber(tx, transactionDate);

      const order = await this.ordersRepository.createOrder(
        {
          orderNumber,
          customerId: customer ? customer.id : null,
          createdBy: cashierId,
          totalAmount: totalAmount.toFixed(2),
          orderDate: transactionDate,
        },
        tx,
      );

      const orderItemRecords = lockedProducts.map((p) => ({
        orderId: order.id,
        productId: p.id,
        quantity: p.quantity,
        unitPrice: p.unitPrice.toFixed(2),
        subtotal: (p.unitPrice * p.quantity).toFixed(2),
      }));

      await this.ordersRepository.createOrderItems(orderItemRecords, tx);

      await this.ordersRepository.createActivityLog(
        {
          orderId: order.id,
          action: OrderActivityAction.ORDER_CREATED,
          performedBy: cashierId,
          details: {
            subtotal,
            discount,
            totalAmount,
            isBirthdayDiscountApplied: discount > 0,
            itemsCount: deductItems.length,
          },
        },
        tx,
      );

      await this.auditService.log({
        action: OrderActivityAction.ORDER_CREATED,
        entityType: 'ORDER',
        entityId: String(order.id),
        userId: cashierId,
        newValues: {
          orderNumber,
          customerId: customer ? customer.id : null,
          totalAmount,
        },
        ipAddress: metadata?.ipAddress,
        userAgent: metadata?.userAgent,
      });

      const orderDetail = await this.ordersRepository.findById(order.id, tx);
      if (!orderDetail) {
        throw new UnprocessableEntityException('Gagal memuat detail transaksi setelah checkout');
      }

      return orderDetail;
    });
  }
}
