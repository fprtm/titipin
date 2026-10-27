import { Injectable, UnprocessableEntityException } from '@nestjs/common';
import { AuditAction, CreateProductSchemaInput, ProductItem } from '@titipin/shared';
import { ProductsRepository } from '../repositories/products.repository';
import { AuditService } from '../../audit/audit.service';
import { mapProductToItem } from './find-products.use-case';

@Injectable()
export class CreateProductUseCase {
  constructor(
    private readonly productsRepository: ProductsRepository,
    private readonly auditService: AuditService,
  ) {}

  async execute(
    dto: CreateProductSchemaInput,
    actorId?: string,
    metadata?: { ipAddress?: string; userAgent?: string },
  ): Promise<ProductItem> {
    const code = dto.product_code.trim().toUpperCase();

    const existing = await this.productsRepository.findByCode(code);

    if (existing) {
      throw new UnprocessableEntityException('Kode produk sudah terdaftar');
    }

    const newProduct = await this.productsRepository.create({
      productCode: code,
      productName: dto.product_name.trim(),
      stock: dto.stock,
      price: dto.price.toFixed(2),
    });

    if (actorId) {
      await this.auditService.log({
        userId: actorId,
        action: AuditAction.PRODUCT_CREATED,
        entityType: 'PRODUCT',
        entityId: String(newProduct.id),
        newValues: {
          id: newProduct.id,
          productCode: newProduct.productCode,
          productName: newProduct.productName,
          stock: newProduct.stock,
          price: newProduct.price,
        },
        ipAddress: metadata?.ipAddress,
        userAgent: metadata?.userAgent,
      });
    }

    return mapProductToItem(newProduct);
  }
}
