import { Module } from '@nestjs/common';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import { ProductsRepository } from './repositories/products.repository';
import { FindProductsUseCase } from './use-cases/find-products.use-case';
import { GetProductByIdUseCase } from './use-cases/get-product-by-id.use-case';
import { CreateProductUseCase } from './use-cases/create-product.use-case';
import { UpdateProductUseCase } from './use-cases/update-product.use-case';
import { DeleteProductUseCase } from './use-cases/delete-product.use-case';
import { ExportProductsUseCase } from './use-cases/export-products.use-case';
import { ImportProductsUseCase } from './use-cases/import-products.use-case';
import { LockAndDeductStockUseCase } from './use-cases/lock-and-deduct-stock.use-case';
import { DatabaseModule } from '../../database/database.module';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [DatabaseModule, AuditModule, AuthModule],
  controllers: [ProductsController],
  providers: [
    ProductsRepository,
    FindProductsUseCase,
    GetProductByIdUseCase,
    CreateProductUseCase,
    UpdateProductUseCase,
    DeleteProductUseCase,
    ExportProductsUseCase,
    ImportProductsUseCase,
    LockAndDeductStockUseCase,
    ProductsService,
  ],
  exports: [
    ProductsService,
    ProductsRepository,
    FindProductsUseCase,
    GetProductByIdUseCase,
    CreateProductUseCase,
    UpdateProductUseCase,
    DeleteProductUseCase,
    ExportProductsUseCase,
    ImportProductsUseCase,
    LockAndDeductStockUseCase,
  ],
})
export class ProductsModule {}
