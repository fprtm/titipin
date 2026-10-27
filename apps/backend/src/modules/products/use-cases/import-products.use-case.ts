import { Injectable, UnprocessableEntityException } from '@nestjs/common';
import ExcelJS from 'exceljs';
import stream from 'node:stream';
import { AuditAction, ImportSummaryData } from '@titipin/shared';
import { ProductsRepository } from '../repositories/products.repository';
import { AuditService } from '../../audit/audit.service';

interface ParsedRow {
  code: string;
  name: string;
  price: number;
  stock: number;
}

@Injectable()
export class ImportProductsUseCase {
  constructor(
    private readonly productsRepository: ProductsRepository,
    private readonly auditService: AuditService,
  ) {}

  async execute(
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
      const existing = await this.productsRepository.findByCode(item.code);

      if (existing) {
        await this.productsRepository.update(existing.id, {
          productName: item.name,
          price: item.price.toFixed(2),
          stock: item.stock,
          deletedAt: null, // restore if previously soft-deleted
        });
        updated++;
      } else {
        await this.productsRepository.create({
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
