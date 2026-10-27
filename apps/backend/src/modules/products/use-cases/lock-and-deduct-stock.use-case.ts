import { Injectable, UnprocessableEntityException } from '@nestjs/common';
import { DrizzleClient } from '../../../database/database.module';
import { ProductsRepository } from '../repositories/products.repository';

export interface DeductStockItemInput {
  productId: number;
  quantity: number;
}

export interface LockedProductResult {
  id: number;
  productName: string;
  unitPrice: number;
  quantity: number;
}

@Injectable()
export class LockAndDeductStockUseCase {
  constructor(private readonly productsRepository: ProductsRepository) {}

  async execute(
    tx: DrizzleClient,
    items: DeductStockItemInput[],
  ): Promise<LockedProductResult[]> {
    if (!items || items.length === 0) {
      throw new UnprocessableEntityException('Daftar item belanja tidak boleh kosong');
    }

    const productIds = items.map((item) => item.productId);

    // 1. Acquire pessimistic row locks sorted by product ID ASC to prevent deadlock
    const lockedRecords = await this.productsRepository.lockProductsForUpdate(productIds, tx);

    const recordMap = new Map<number, (typeof lockedRecords)[0]>();
    for (const record of lockedRecords) {
      recordMap.set(record.id, record);
    }

    // 2. Validate stock availability and active status for each item
    for (const item of items) {
      const product = recordMap.get(item.productId);

      if (!product || product.deletedAt !== null) {
        throw new UnprocessableEntityException(
          `Produk dengan ID ${item.productId} tidak ditemukan atau sudah tidak aktif`,
        );
      }

      if (product.stock < item.quantity) {
        throw new UnprocessableEntityException(
          `Stok produk ${product.productName} tidak mencukupi (tersedia: ${product.stock}, diminta: ${item.quantity})`,
        );
      }
    }

    // 3. Atomically deduct stock and prepare result snapshot
    const results: LockedProductResult[] = [];

    for (const item of items) {
      const product = recordMap.get(item.productId)!;

      await this.productsRepository.deductStock(item.productId, item.quantity, tx);

      results.push({
        id: product.id,
        productName: product.productName,
        unitPrice: Number(product.price),
        quantity: item.quantity,
      });
    }

    return results;
  }
}
