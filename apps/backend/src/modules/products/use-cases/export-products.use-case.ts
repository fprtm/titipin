import { Injectable } from '@nestjs/common';
import ExcelJS from 'exceljs';
import { ProductsRepository } from '../repositories/products.repository';

@Injectable()
export class ExportProductsUseCase {
  constructor(private readonly productsRepository: ProductsRepository) {}

  async execute(): Promise<Buffer> {
    const activeProducts = await this.productsRepository.findAllActive();

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
}
