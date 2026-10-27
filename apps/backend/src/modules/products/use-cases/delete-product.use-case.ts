import { Injectable, NotFoundException } from '@nestjs/common';
import { AuditAction } from '@titipin/shared';
import { ProductsRepository } from '../repositories/products.repository';
import { AuditService } from '../../audit/audit.service';

@Injectable()
export class DeleteProductUseCase {
  constructor(
    private readonly productsRepository: ProductsRepository,
    private readonly auditService: AuditService,
  ) {}

  async execute(
    id: number,
    actorId?: string,
    metadata?: { ipAddress?: string; userAgent?: string },
  ): Promise<{ success: boolean; message: string }> {
    const existing = await this.productsRepository.findById(id);

    if (!existing) {
      throw new NotFoundException('Produk tidak ditemukan');
    }

    await this.productsRepository.softDelete(id);

    if (actorId) {
      await this.auditService.log({
        userId: actorId,
        action: AuditAction.PRODUCT_DELETED,
        entityType: 'PRODUCT',
        entityId: String(id),
        oldValues: {
          productCode: existing.productCode,
          productName: existing.productName,
          deletedAt: existing.deletedAt,
        },
        newValues: {
          deletedAt: new Date().toISOString(),
        },
        ipAddress: metadata?.ipAddress,
        userAgent: metadata?.userAgent,
      });
    }

    return {
      success: true,
      message: 'Produk berhasil dihapus',
    };
  }
}
