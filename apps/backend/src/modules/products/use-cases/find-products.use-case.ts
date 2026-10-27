import { Injectable } from '@nestjs/common';
import { ProductItem, ProductQueryInput } from '@titipin/shared';
import * as schema from '../../../database/schema';
import { ProductsRepository } from '../repositories/products.repository';

export function mapProductToItem(prod: typeof schema.products.$inferSelect): ProductItem {
  const createdAtStr = prod.createdAt.toISOString();
  const updatedAtStr = prod.updatedAt.toISOString();
  const deletedAtStr = prod.deletedAt ? prod.deletedAt.toISOString() : null;

  return {
    id: prod.id,
    productCode: prod.productCode,
    productName: prod.productName,
    stock: prod.stock,
    price: prod.price,
    createdAt: createdAtStr,
    updatedAt: updatedAtStr,
    deletedAt: deletedAtStr,
    product_code: prod.productCode,
    product_name: prod.productName,
    created_at: createdAtStr,
    updated_at: updatedAtStr,
    deleted_at: deletedAtStr,
  };
}

@Injectable()
export class FindProductsUseCase {
  constructor(private readonly productsRepository: ProductsRepository) {}

  async execute(query: ProductQueryInput) {
    const page = Math.max(1, query.page || 1);
    const perPage = Math.max(1, Math.min(100, query.per_page || 10));

    const { items, total } = await this.productsRepository.findAll(query);
    const totalPages = Math.ceil(total / perPage) || 1;

    return {
      items: items.map(mapProductToItem),
      meta: {
        page,
        per_page: perPage,
        total_items: total,
        total_pages: totalPages,
      },
    };
  }
}
