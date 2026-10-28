import { Injectable } from '@nestjs/common';
import ExcelJS from 'exceljs';
import { OrdersRepository } from '../repositories/orders.repository';

interface ExportOrdersQuery {
  from?: string;
  to?: string;
  customer_id?: string;
  search?: string;
}

@Injectable()
export class ExportOrdersUseCase {
  constructor(private readonly ordersRepository: OrdersRepository) {}

  async execute(query: ExportOrdersQuery): Promise<Buffer> {
    const data = await this.ordersRepository.findAllForExport(query);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Titipin POS';
    workbook.created = new Date();

    // ==========================================
    // SHEET 1: REKAP TRANSAKSI & OMSET
    // ==========================================
    const ws1 = workbook.addWorksheet('Rekap Transaksi');

    // Title & Info
    ws1.mergeCells('A1:F1');
    const titleCell = ws1.getCell('A1');
    titleCell.value = 'TITIPIN POS — LAPORAN REKAP TRANSAKSI PENJUALAN';
    titleCell.font = { bold: true, size: 14, color: { argb: 'FF047857' } };
    titleCell.alignment = { vertical: 'middle' };

    ws1.getCell('A2').value = `Waktu Ekspor: ${new Date().toLocaleString('id-ID')}`;
    ws1.getCell('A2').font = { italic: true, size: 10, color: { argb: 'FF64748B' } };

    const filterDesc = [
      query.from ? `Dari: ${query.from}` : null,
      query.to ? `Sampai: ${query.to}` : null,
      query.search ? `Cari: "${query.search}"` : null,
    ]
      .filter(Boolean)
      .join(' | ');

    if (filterDesc) {
      ws1.getCell('A3').value = `Filter Diterapkan: ${filterDesc}`;
      ws1.getCell('A3').font = { size: 10, color: { argb: 'FF475569' } };
    }

    // Header Columns
    const headerRowIdx = filterDesc ? 5 : 4;
    const headerRow = ws1.getRow(headerRowIdx);
    headerRow.values = [
      'No.',
      'No. Invoice',
      'Tanggal & Waktu',
      'Kasir',
      'Pelanggan',
      'Total Belanja (Rp)',
    ];

    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF047857' }, // Emerald-700
    };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
    headerRow.height = 24;

    ws1.columns = [
      { key: 'no', width: 6 },
      { key: 'orderNumber', width: 24 },
      { key: 'orderDate', width: 22 },
      { key: 'cashierName', width: 20 },
      { key: 'customerName', width: 25 },
      { key: 'totalAmount', width: 22 },
    ];

    let totalOmset = 0;
    let currentRowIdx = headerRowIdx + 1;

    data.orders.forEach((ord, index) => {
      totalOmset += ord.totalAmount;
      const row = ws1.getRow(currentRowIdx);
      row.values = [
        index + 1,
        ord.orderNumber,
        new Date(ord.orderDate).toLocaleString('id-ID'),
        ord.cashierName,
        ord.customerName,
        ord.totalAmount,
      ];

      row.getCell(1).alignment = { horizontal: 'center' };
      row.getCell(6).numFmt = '#,##0';
      row.getCell(6).alignment = { horizontal: 'right' };
      currentRowIdx++;
    });

    // Summary Total Row
    const totalRow = ws1.getRow(currentRowIdx);
    totalRow.values = ['TOTAL', '', '', '', `${data.orders.length} Transaksi`, totalOmset];
    totalRow.font = { bold: true, color: { argb: 'FF065F46' } };
    totalRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFD1FAE5' }, // Emerald-100
    };
    totalRow.getCell(6).numFmt = '#,##0';
    totalRow.getCell(6).alignment = { horizontal: 'right' };
    totalRow.height = 22;

    // ==========================================
    // SHEET 2: RINCIAN PRODUK TERJUAL
    // ==========================================
    const ws2 = workbook.addWorksheet('Rincian Produk Terjual');

    ws2.mergeCells('A1:H1');
    const titleCell2 = ws2.getCell('A1');
    titleCell2.value = 'TITIPIN POS — RINCIAN ITEM PRODUK TERJUAL';
    titleCell2.font = { bold: true, size: 14, color: { argb: 'FF0F766E' } }; // Teal-700
    titleCell2.alignment = { vertical: 'middle' };

    const header2Row = ws2.getRow(3);
    header2Row.values = [
      'No.',
      'No. Invoice',
      'Tanggal Transaksi',
      'Kode Produk',
      'Nama Produk',
      'Qty Terjual',
      'Harga Satuan (Rp)',
      'Subtotal (Rp)',
    ];

    header2Row.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    header2Row.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF0F766E' }, // Teal-700
    };
    header2Row.alignment = { vertical: 'middle', horizontal: 'center' };
    header2Row.height = 24;

    ws2.columns = [
      { key: 'no', width: 6 },
      { key: 'orderNumber', width: 24 },
      { key: 'orderDate', width: 22 },
      { key: 'productCode', width: 18 },
      { key: 'productName', width: 32 },
      { key: 'quantity', width: 14 },
      { key: 'unitPrice', width: 18 },
      { key: 'subtotal', width: 20 },
    ];

    let rowIdx2 = 4;
    let totalQty = 0;
    let totalItemSubtotal = 0;

    data.items.forEach((item, index) => {
      totalQty += item.quantity;
      totalItemSubtotal += item.subtotal;

      const row = ws2.getRow(rowIdx2);
      row.values = [
        index + 1,
        item.orderNumber,
        new Date(item.orderDate).toLocaleString('id-ID'),
        item.productCode,
        item.productName,
        item.quantity,
        item.unitPrice,
        item.subtotal,
      ];

      row.getCell(1).alignment = { horizontal: 'center' };
      row.getCell(6).alignment = { horizontal: 'center' };
      row.getCell(7).numFmt = '#,##0';
      row.getCell(7).alignment = { horizontal: 'right' };
      row.getCell(8).numFmt = '#,##0';
      row.getCell(8).alignment = { horizontal: 'right' };

      rowIdx2++;
    });

    // Summary Total Row for Sheet 2
    const totalRow2 = ws2.getRow(rowIdx2);
    totalRow2.values = ['TOTAL', '', '', '', `${data.items.length} Baris Produk`, totalQty, '', totalItemSubtotal];
    totalRow2.font = { bold: true, color: { argb: 'FF115E59' } };
    totalRow2.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFCCFBF1' }, // Teal-100
    };
    totalRow2.getCell(6).alignment = { horizontal: 'center' };
    totalRow2.getCell(8).numFmt = '#,##0';
    totalRow2.getCell(8).alignment = { horizontal: 'right' };
    totalRow2.height = 22;

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }
}
