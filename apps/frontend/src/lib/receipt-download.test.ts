import { describe, it, expect } from 'vitest';
import {
  generateReceiptText,
  buildReceiptPdfBytes,
  buildReceiptPdfBlob,
  formatRupiah,
  type ReceiptData,
} from './receipt-download';

describe('Receipt Download Utilities', () => {
  const sampleOrder: ReceiptData = {
    orderNumber: 'INV-20261028-0001',
    orderDate: '2026-10-28T08:00:00Z',
    cashierName: 'Budi Santoso',
    customerName: 'Siti Rahma',
    items: [
      {
        productName: 'Aqua Air Mineral 600ml',
        quantity: 2,
        unitPrice: 3500,
        subtotal: 7000,
      },
      {
        productName: 'Indomie Goreng Spesial 85g',
        quantity: 3,
        unitPrice: 3500,
        subtotal: 10500,
      },
    ],
    subtotal: 17500,
    birthday_discount: 875,
    totalAmount: 16625,
    total_paid: 20000,
    change_amount: 3375,
  };

  it('formats Rupiah currency consistently', () => {
    const formatted = formatRupiah(15000);
    expect(formatted).toContain('15.000');
  });

  it('generates structured receipt text with store header and items', () => {
    const text = generateReceiptText(sampleOrder);
    expect(text).toContain('TITIPIN POS');
    expect(text).toContain('INV-20261028-0001');
    expect(text).toContain('Budi Santoso');
    expect(text).toContain('Siti Rahma');
    expect(text).toContain('Aqua Air Mineral 600ml');
    expect(text).toContain('Diskon Ultah (5%)');
    expect(text).toContain('TOTAL AKHIR');
  });

  it('builds a valid Adobe PDF 1.4 binary byte array embedding JPEG stream', () => {
    const dummyJpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]);
    const pdfBytes = buildReceiptPdfBytes(dummyJpeg, 400, 800, 226.77, 453.54);

    expect(pdfBytes).toBeInstanceOf(Uint8Array);
    expect(pdfBytes.length).toBeGreaterThan(100);

    const text = new TextDecoder('latin1').decode(pdfBytes);
    expect(text.startsWith('%PDF-1.4')).toBe(true);
    expect(text).toContain('/Type /Catalog');
    expect(text).toContain('/Type /Page');
    expect(text).toContain('/Filter /DCTDecode');
    expect(text).toContain('%%EOF');
  });

  it('builds a Blob wrapper with application/pdf mime type', () => {
    const dummyJpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]);
    const pdfBlob = buildReceiptPdfBlob(dummyJpeg, 400, 800, 226.77, 453.54);

    expect(pdfBlob).toBeInstanceOf(Blob);
    expect(pdfBlob.type).toBe('application/pdf');
    expect(pdfBlob.size).toBeGreaterThan(100);
  });
});
