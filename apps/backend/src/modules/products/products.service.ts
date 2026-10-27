import { Injectable } from '@nestjs/common';
import {
  ProductItem,
  CreateProductSchemaInput,
  UpdateProductSchemaInput,
  ProductQueryInput,
  ImportSummaryData,
} from '@titipin/shared';
import { DrizzleClient } from '../../database/database.module';
import { FindProductsUseCase } from './use-cases/find-products.use-case';
import { GetProductByIdUseCase } from './use-cases/get-product-by-id.use-case';
import { CreateProductUseCase } from './use-cases/create-product.use-case';
import { UpdateProductUseCase } from './use-cases/update-product.use-case';
import { DeleteProductUseCase } from './use-cases/delete-product.use-case';
import { ExportProductsUseCase } from './use-cases/export-products.use-case';
import { ImportProductsUseCase } from './use-cases/import-products.use-case';
import {
  LockAndDeductStockUseCase,
  DeductStockItemInput,
  LockedProductResult,
} from './use-cases/lock-and-deduct-stock.use-case';

@Injectable()
export class ProductsService {
  constructor(
    private readonly findProductsUseCase: FindProductsUseCase,
    private readonly getProductByIdUseCase: GetProductByIdUseCase,
    private readonly createProductUseCase: CreateProductUseCase,
    private readonly updateProductUseCase: UpdateProductUseCase,
    private readonly deleteProductUseCase: DeleteProductUseCase,
    private readonly exportProductsUseCase: ExportProductsUseCase,
    private readonly importProductsUseCase: ImportProductsUseCase,
    private readonly lockAndDeductStockUseCase: LockAndDeductStockUseCase,
  ) {}

  async findAll(query: ProductQueryInput) {
    return this.findProductsUseCase.execute(query);
  }

  async findById(id: number): Promise<ProductItem> {
    return this.getProductByIdUseCase.execute(id);
  }

  async create(
    dto: CreateProductSchemaInput,
    actorId?: string,
    metadata?: { ipAddress?: string; userAgent?: string },
  ): Promise<ProductItem> {
    return this.createProductUseCase.execute(dto, actorId, metadata);
  }

  async update(
    id: number,
    dto: UpdateProductSchemaInput,
    actorId?: string,
    metadata?: { ipAddress?: string; userAgent?: string },
  ): Promise<ProductItem> {
    return this.updateProductUseCase.execute(id, dto, actorId, metadata);
  }

  async delete(
    id: number,
    actorId?: string,
    metadata?: { ipAddress?: string; userAgent?: string },
  ): Promise<{ success: boolean; message: string }> {
    return this.deleteProductUseCase.execute(id, actorId, metadata);
  }

  async exportToExcel(): Promise<Buffer> {
    return this.exportProductsUseCase.execute();
  }

  async importFromSpreadsheet(
    fileBuffer: Buffer,
    actorId?: string,
    metadata?: { ipAddress?: string; userAgent?: string },
  ): Promise<ImportSummaryData> {
    return this.importProductsUseCase.execute(fileBuffer, actorId, metadata);
  }

  async lockAndDeductStock(
    tx: DrizzleClient,
    items: DeductStockItemInput[],
  ): Promise<LockedProductResult[]> {
    return this.lockAndDeductStockUseCase.execute(tx, items);
  }
}
