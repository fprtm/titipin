/**
 * Helper to generate and download a plain-text 80mm-formatted thermal receipt.
 */

export interface ReceiptData {
  orderNumber?: string;
  invoiceNumber?: string;
  orderDate?: string | Date;
  cashierName?: string;
  customerName?: string;
  customer?: {
    customerName?: string;
    customer_name?: string;
  } | null;
  items: {
    productName?: string;
    product_name?: string;
    product?: {
      productName?: string;
      product_name?: string;
      price?: string | number;
    };
    quantity: number;
    unitPrice?: string | number;
    subtotal?: string | number;
  }[];
  subtotal?: number | string;
  birthday_discount?: number;
  discount?: number | string;
  totalAmount?: number | string;
  total_amount?: number | string;
  total_paid?: number | string;
  change_amount?: number | string;
}

function padRight(str: string, length: number): string {
  if (str.length >= length) return str.slice(0, length);
  return str + ' '.repeat(length - str.length);
}

function padLeft(str: string, length: number): string {
  if (str.length >= length) return str.slice(0, length);
  return ' '.repeat(length - str.length) + str;
}

function formatRupiah(num: number | string | undefined): string {
  const n = Number(num || 0);
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
}

export function generateReceiptText(order: ReceiptData): string {
  const WIDTH = 40;
  const divider = '='.repeat(WIDTH);
  const thinDivider = '-'.repeat(WIDTH);

  const orderNum = order.orderNumber || order.invoiceNumber || 'INV-UNKNOWN';
  const orderDt = order.orderDate ? new Date(order.orderDate).toLocaleString('id-ID') : new Date().toLocaleString('id-ID');
  const cashier = order.cashierName || 'Kasir';
  const customer =
    order.customerName ||
    order.customer?.customerName ||
    order.customer?.customer_name ||
    'Pelanggan Umum';

  const lines: string[] = [];

  // Header
  lines.push(divider);
  lines.push(centerText('TITIPIN POS', WIDTH));
  lines.push(centerText('Sistem Kasir & Titip Jual Resmi', WIDTH));
  lines.push(centerText('Jl. Pajajaran No. 128, Bogor', WIDTH));
  lines.push(centerText('Telp: 0251-888999', WIDTH));
  lines.push(divider);

  // Meta
  lines.push(`No. Invoice : ${orderNum}`);
  lines.push(`Tanggal     : ${orderDt}`);
  lines.push(`Kasir       : ${cashier}`);
  lines.push(`Pelanggan   : ${customer}`);
  lines.push(thinDivider);

  // Items Header
  lines.push(padRight('ITEM', 22) + padRight('QTY', 6) + padLeft('TOTAL', 12));
  lines.push(thinDivider);

  // Items
  let calculatedSubtotal = 0;
  for (const it of order.items || []) {
    const name = it.productName || it.product_name || it.product?.productName || it.product?.product_name || 'Produk';
    const qty = it.quantity || 1;
    const price = Number(it.unitPrice || it.product?.price || 0);
    const subtotal = Number(it.subtotal || price * qty);
    calculatedSubtotal += subtotal;

    lines.push(name);
    const qtyPriceStr = `  ${qty} x ${formatRupiah(price)}`;
    const subtotalStr = formatRupiah(subtotal);
    lines.push(padRight(qtyPriceStr, 25) + padLeft(subtotalStr, 15));
  }

  lines.push(thinDivider);

  // Totals
  const subtotalVal = order.subtotal !== undefined ? Number(order.subtotal) : calculatedSubtotal;
  const discountVal = Number(order.birthday_discount || order.discount || 0);
  const totalVal = Number(order.totalAmount || order.total_amount || Math.max(0, subtotalVal - discountVal));

  lines.push(padRight('Subtotal', 25) + padLeft(formatRupiah(subtotalVal), 15));

  if (discountVal > 0) {
    lines.push(padRight('Diskon Ultah (5%)', 25) + padLeft(`-${formatRupiah(discountVal)}`, 15));
  }

  lines.push(padRight('TOTAL AKHIR', 25) + padLeft(formatRupiah(totalVal), 15));

  if (order.total_paid !== undefined && Number(order.total_paid) > 0) {
    lines.push(padRight('Tunai Diterima', 25) + padLeft(formatRupiah(order.total_paid), 15));
    const change = Number(order.change_amount || Math.max(0, Number(order.total_paid) - totalVal));
    lines.push(padRight('Kembalian', 25) + padLeft(formatRupiah(change), 15));
  }

  // Footer
  lines.push(divider);
  lines.push(centerText('Terima kasih atas kunjungan Anda!', WIDTH));
  lines.push(centerText('Barang yang sudah dibeli tidak dapat', WIDTH));
  lines.push(centerText('ditukar / dikembalikan.', WIDTH));
  lines.push(divider);

  return lines.join('\n');
}

function centerText(text: string, width: number): string {
  if (text.length >= width) return text;
  const pad = Math.floor((width - text.length) / 2);
  return ' '.repeat(pad) + text;
}

export function downloadReceiptAsText(order: ReceiptData): void {
  const textContent = generateReceiptText(order);
  const invoice = order.orderNumber || order.invoiceNumber || 'INV-0000';
  const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `struk-${invoice}.txt`);
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
