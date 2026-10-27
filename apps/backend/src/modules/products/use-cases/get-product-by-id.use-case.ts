import { Injectable, NotFoundException } from '@nestjs/common';
import { ProductItem } from '@titipin/shared';
import { ProductsRepository } from '../repositories/products.repository';
import { mapProductToItem } from './find-products.use-case';

@Injectable()
export class GetProductByIdUseCase {
  constructor(private readonly productsRepository: ProductsRepository) {}

  async execute(id: number): Promise<ProductItem> {
    const product = await this.productsRepository.findById(id);

    if (!product) {
      throw new NotFoundException('Produk tidak ditemukan');
    }

    return mapProductToItem(product);
  }
}
