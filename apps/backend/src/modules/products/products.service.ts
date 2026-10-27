import {
  Injectable,
  Inject,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { eq, and, isNull, or, ilike, asc, desc, count } from 'drizzle-orm';
import ExcelJS from 'exceljs';
import stream from 'node:stream';
import { DRIZZLE_ORM, DrizzleDatabase } from '../../database/database.module';
import * as schema from '../../database/schema';
import { AuditService } from '../audit/audit.service';
import {
  AuditAction,
  ProductItem,
  CreateProductSchemaInput,
  UpdateProductSchemaInput,
  ProductQueryInput,
  ImportSummaryData,
} from '@titipin/shared';

@Injectable()
export class ProductsService {
  constructor(
    @Inject(DRIZZLE_ORM) private readonly db: DrizzleDatabase,
    private readonly auditService: AuditService,
  ) {}

  private mapProduct(prod: typeof schema.products.$inferSelect): ProductItem {
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

  async findAll(query: ProductQueryInput) {
    const page = Math.max(1, query.page || 1);
    const perPage = Math.max(1, Math.min(100, query.per_page || 10));
    const offset = (page - 1) * perPage;

    const conditions = [isNull(schema.products.deletedAt)];

    if (query.search && query.search.trim() !== '') {
      const searchTerm = `%${query.search.trim()}%`;
      conditions.push(
        or(
          ilike(schema.products.productName, searchTerm),
          ilike(schema.products.productCode, searchTerm),
        )!,
      );
    }

    const whereClause = and(...conditions);

    // Sorting
    let orderByExpression;
    const isDesc = query.order === 'desc';
    if (query.sort === 'price') {
      orderByExpression = isDesc ? desc(schema.products.price) : asc(schema.products.price);
    } else if (query.sort === 'stock') {
      orderByExpression = isDesc ? desc(schema.products.stock) : asc(schema.products.stock);
    } else {
      orderByExpression = isDesc ? desc(schema.products.productName) : asc(schema.products.productName);
    }

    const [totalRecord] = await this.db
      .select({ count: count() })
      .from(schema.products)
      .where(whereClause);

    const totalItems = totalRecord?.count ? Number(totalRecord.count) : 0;
    const totalPages = Math.ceil(totalItems / perPage) || 1;

    const productRecords = await this.db
      .select()
      .from(schema.products)
      .where(whereClause)
      .orderBy(orderByExpression)
      .limit(perPage)
      .offset(offset);

    const items = productRecords.map((p) => this.mapProduct(p));

    return {
      items,
      meta: {
        page,
        per_page: perPage,
        total_items: totalItems,
        total_pages: totalPages,
      },
    };
  }

  async findById(id: number): Promise<ProductItem> {
    const [product] = await this.db
      .select()
      .from(schema.products)
      .where(and(eq(schema.products.id, id), isNull(schema.products.deletedAt)))
      .limit(1);

    if (!product) {
      throw new NotFoundException('Produk tidak ditemukan');
    }

    return this.mapProduct(product);
  }

  async create(
    dto: CreateProductSchemaInput,
    actorId?: string,
    metadata?: { ipAddress?: string; userAgent?: string },
  ): Promise<ProductItem> {
    const code = dto.product_code.trim().toUpperCase();

    const existing = await this.db
      .select({ id: schema.products.id })
      .from(schema.products)
      .where(eq(schema.products.productCode, code))
      .limit(1);

    if (existing.length > 0) {
      throw new UnprocessableEntityException('Kode produk sudah terdaftar');
    }

    const [newProduct] = await this.db
      .insert(schema.products)
      .values({
        productCode: code,
        productName: dto.product_name.trim(),
        stock: dto.stock,
        price: dto.price.toFixed(2),
      })
      .returning();

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

    return this.mapProduct(newProduct);
  }

  async update(
    id: number,
    dto: UpdateProductSchemaInput,
    actorId?: string,
    metadata?: { ipAddress?: string; userAgent?: string },
  ): Promise<ProductItem> {
    const [existing] = await this.db
      .select()
      .from(schema.products)
      .where(and(eq(schema.products.id, id), isNull(schema.products.deletedAt)))
      .limit(1);

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

    const [updated] = await this.db
      .update(schema.products)
      .set(updateValues)
      .where(eq(schema.products.id, id))
      .returning();

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

    return this.mapProduct(updated);
  }

  async delete(
    id: number,
    actorId?: string,
    metadata?: { ipAddress?: string; userAgent?: string },
  ): Promise<{ success: boolean; message: string }> {
    const [existing] = await this.db
      .select()
      .from(schema.products)
      .where(and(eq(schema.products.id, id), isNull(schema.products.deletedAt)))
      .limit(1);

    if (!existing) {
      throw new NotFoundException('Produk tidak ditemukan');
    }

    await this.db
      .update(schema.products)
      .set({
        deletedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(schema.products.id, id));

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

  async exportToExcel(): Promise<Buffer> {
    const activeProducts = await this.db
      .select()
      .from(schema.products)
      .where(isNull(schema.products.deletedAt))
      .orderBy(asc(schema.products.productName));

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Titipin POS';
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet('Katalog Produk');

    worksheet.columns = [
      { header: 'Kode Produk', key: 'product_code', width: 16 },
      { header: 'Nama Produk', key: 'product_name', width: 35 },
      { header: 'Harga (Rp)', key: 'price', width: 18 },
      { header: 'Sisa Stok', key: 'stock', width: 14 },
    ];

    // Style the header row
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF047857' }, // Emerald-700
    };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
    headerRow.height = 24;

    for (const prod of activeProducts) {
      const row = worksheet.addRow({
        product_code: prod.productCode,
        product_name: prod.productName,
        price: Number(prod.price),
        stock: prod.stock,
      });

      row.alignment = { vertical: 'middle' };
      row.getCell('price').numFmt = '#,##0.00';
      row.getCell('stock').alignment = { horizontal: 'right', vertical: 'middle' };
    }

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  async importFromSpreadsheet(
    fileBuffer: Buffer,
    actorId?: string,
    metadata?: { ipAddress?: string; userAgent?: string },
  ): Promise<ImportSummaryData> {
    const workbook = new ExcelJS.Workbook();
    try {
      await workbook.xlsx.load(
        fileBuffer as unknown as Parameters<typeof workbook.xlsx.load>[0],
      );
    } catch {
      // If xlsx load fails, try CSV
      try {
        const bufferStream = new stream.PassThrough();
        bufferStream.end(fileBuffer);
        await workbook.csv.read(bufferStream);
      } catch {
        throw new UnprocessableEntityException(
          'Format file tidak valid. Unggah file spreadsheet berekstensi .xlsx atau .csv',
        );
      }
    }

    const worksheet = workbook.worksheets[0];
    if (!worksheet || worksheet.rowCount < 2) {
      throw new UnprocessableEntityException(
        'Berkas spreadsheet kosong atau tidak memiliki baris data.',
      );
    }

    interface ParsedRow {
      code: string;
      name: string;
      price: number;
      stock: number;
    }

    const parsedRows: ParsedRow[] = [];

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // Skip header

      const rawCode = row.getCell(1).text || String(row.getCell(1).value || '');
      const rawName = row.getCell(2).text || String(row.getCell(2).value || '');
      const rawPrice = Number(row.getCell(3).value || 0);
      const rawStock = Number(row.getCell(4).value || 0);

      const code = rawCode.trim().toUpperCase();
      const name = rawName.trim();

      if (!code || !name) {
        return; // skip empty rows
      }

      if (isNaN(rawPrice) || rawPrice <= 0) {
        throw new UnprocessableEntityException(
          `Baris ke-${rowNumber}: Harga (${rawPrice}) harus berupa angka lebih besar dari 0`,
        );
      }

      if (isNaN(rawStock) || rawStock < 0 || !Number.isInteger(rawStock)) {
        throw new UnprocessableEntityException(
          `Baris ke-${rowNumber}: Stok (${rawStock}) harus berupa bilangan bulat >= 0`,
        );
      }

      parsedRows.push({
        code,
        name,
        price: rawPrice,
        stock: rawStock,
      });
    });

    if (parsedRows.length === 0) {
      throw new UnprocessableEntityException('Tidak ada data produk yang valid untuk diimpor.');
    }

    let inserted = 0;
    let updated = 0;

    // Idempotent execution
    for (const item of parsedRows) {
      const [existing] = await this.db
        .select()
        .from(schema.products)
        .where(eq(schema.products.productCode, item.code))
        .limit(1);

      if (existing) {
        await this.db
          .update(schema.products)
          .set({
            productName: item.name,
            price: item.price.toFixed(2),
            stock: item.stock,
            deletedAt: null, // restore if previously soft-deleted
            updatedAt: new Date(),
          })
          .where(eq(schema.products.id, existing.id));
        updated++;
      } else {
        await this.db.insert(schema.products).values({
          productCode: item.code,
          productName: item.name,
          price: item.price.toFixed(2),
          stock: item.stock,
        });
        inserted++;
      }
    }

    if (actorId) {
      await this.auditService.log({
        userId: actorId,
        action: AuditAction.PRODUCT_UPDATED,
        entityType: 'PRODUCT',
        entityId: 'BATCH_IMPORT',
        newValues: {
          totalRows: parsedRows.length,
          inserted,
          updated,
        },
        ipAddress: metadata?.ipAddress,
        userAgent: metadata?.userAgent,
      });
    }

    return {
      total_rows: parsedRows.length,
      inserted,
      updated,
      failed: 0,
    };
  }
}
