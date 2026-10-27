import { Injectable, NotFoundException } from '@nestjs/common';
import { AuditAction, ProductItem, UpdateProductSchemaInput } from '@titipin/shared';
import * as schema from '../../../database/schema';
import { ProductsRepository } from '../repositories/products.repository';
import { AuditService } from '../../audit/audit.service';
import { mapProductToItem } from './find-products.use-case';

@Injectable()
export class UpdateProductUseCase {
  constructor(
    private readonly productsRepository: ProductsRepository,
    private readonly auditService: AuditService,
  ) {}

  async execute(
    id: number,
    dto: UpdateProductSchemaInput,
    actorId?: string,
    metadata?: { ipAddress?: string; userAgent?: string },
  ): Promise<ProductItem> {
    const existing = await this.productsRepository.findById(id);

    if (!existing) {
      throw new NotFoundException('Produk tidak ditemukan');
    }

    const updateValues: Partial<typeof schema.products.$inferInsert> = {
      updatedAt: new Date(),
    };

    if (dto.product_name !== undefined) {
      updateValues.productName = dto.product_name.trim();
    }
    if (dto.stock !== undefined) {
      updateValues.stock = dto.stock;
    }
    if (dto.price !== undefined) {
      updateValues.price = dto.price.toFixed(2);
    }

    const updated = await this.productsRepository.update(id, updateValues);

    if (!updated) {
      throw new NotFoundException('Produk tidak ditemukan');
    }

    if (actorId) {
      await this.auditService.log({
        userId: actorId,
        action: AuditAction.PRODUCT_UPDATED,
        entityType: 'PRODUCT',
        entityId: String(id),
        oldValues: {
          productName: existing.productName,
          stock: existing.stock,
          price: existing.price,
        },
        newValues: {
          productName: updated.productName,
          stock: updated.stock,
          price: updated.price,
        },
        ipAddress: metadata?.ipAddress,
        userAgent: metadata?.userAgent,
      });
    }

    return mapProductToItem(updated);
  }
}
