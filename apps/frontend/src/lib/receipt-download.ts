/**
 * Receipt Generation & Download Utilities (PDF, Image PNG, Text)
 * Standard 80mm Thermal Receipt format for Titipin POS.
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

export function formatRupiah(num: number | string | undefined): string {
  const n = Number(num || 0);
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
}

// ============================================================================
// 1. TEXT RECEIPT GENERATOR (Fallback & Pure text)
// ============================================================================

export function generateReceiptText(order: ReceiptData): string {
  const WIDTH = 40;
  const divider = '='.repeat(WIDTH);
  const thinDivider = '-'.repeat(WIDTH);

  const orderNum = order.orderNumber || order.invoiceNumber || 'INV-UNKNOWN';
  const orderDt = order.orderDate
    ? new Date(order.orderDate).toLocaleString('id-ID')
    : new Date().toLocaleString('id-ID');
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
    const name =
      it.productName ||
      it.product_name ||
      it.product?.productName ||
      it.product?.product_name ||
      'Produk';
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
  const totalVal = Number(
    order.totalAmount || order.total_amount || Math.max(0, subtotalVal - discountVal),
  );

  lines.push(padRight('Subtotal', 25) + padLeft(formatRupiah(subtotalVal), 15));

  if (discountVal > 0) {
    lines.push(padRight('Diskon Ultah (5%)', 25) + padLeft(`-${formatRupiah(discountVal)}`, 15));
  }

  lines.push(padRight('TOTAL AKHIR', 25) + padLeft(formatRupiah(totalVal), 15));

  if (order.total_paid !== undefined && Number(order.total_paid) > 0) {
    lines.push(padRight('Tunai Diterima', 25) + padLeft(formatRupiah(order.total_paid), 15));
    const change = Number(
      order.change_amount || Math.max(0, Number(order.total_paid) - totalVal),
    );
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

function padRight(str: string, length: number): string {
  if (str.length >= length) return str.slice(0, length);
  return str + ' '.repeat(length - str.length);
}

function padLeft(str: string, length: number): string {
  if (str.length >= length) return str.slice(0, length);
  return ' '.repeat(length - str.length) + str;
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
  triggerDownload(blob, `struk-${invoice}.txt`);
}

// ============================================================================
// 2. HTML5 CANVAS THERMAL RECEIPT RENDERER (Image & PDF Base)
// ============================================================================

export function renderReceiptToCanvas(
  order: ReceiptData,
  paperSize: '58mm' | '80mm' = '80mm',
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context not available');

  const width = paperSize === '58mm' ? 320 : 420; // 58mm vs 80mm thermal receipt width
  const scale = 2; // Retina 2x scale for sharp text

  // Extract order fields
  const orderNum = order.orderNumber || order.invoiceNumber || 'INV-UNKNOWN';
  const orderDt = order.orderDate
    ? new Date(order.orderDate).toLocaleString('id-ID')
    : new Date().toLocaleString('id-ID');
  const cashier = order.cashierName || 'Kasir';
  const customer =
    order.customerName ||
    order.customer?.customerName ||
    order.customer?.customer_name ||
    'Pelanggan Umum';

  const items = order.items || [];
  let calculatedSubtotal = 0;
  items.forEach((it) => {
    const qty = it.quantity || 1;
    const price = Number(it.unitPrice || it.product?.price || 0);
    calculatedSubtotal += Number(it.subtotal || price * qty);
  });

  const subtotalVal = order.subtotal !== undefined ? Number(order.subtotal) : calculatedSubtotal;
  const discountVal = Number(order.birthday_discount || order.discount || 0);
  const totalVal = Number(
    order.totalAmount || order.total_amount || Math.max(0, subtotalVal - discountVal),
  );
  const hasPayment = order.total_paid !== undefined && Number(order.total_paid) > 0;

  // Calculate dynamic canvas height
  const baseHeaderHeight = 160;
  const metaHeight = 90;
  const tableHeaderHeight = 35;
  const itemsHeight = items.length * 44;
  const totalsHeight = 110 + (discountVal > 0 ? 25 : 0) + (hasPayment ? 45 : 0);
  const barcodeHeight = 70;
  const footerHeight = 90;
  const totalHeight =
    baseHeaderHeight +
    metaHeight +
    tableHeaderHeight +
    itemsHeight +
    totalsHeight +
    barcodeHeight +
    footerHeight +
    40;

  canvas.width = width * scale;
  canvas.height = totalHeight * scale;

  // Scale all drawing operations by 2x for high DPI
  ctx.scale(scale, scale);

  // Background
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, width, totalHeight);

  // Border outline
  ctx.strokeStyle = '#E2E8F0';
  ctx.lineWidth = 1;
  ctx.strokeRect(0, 0, width, totalHeight);

  let y = 30;

  // Helper functions
  const drawDashedLine = (currY: number) => {
    ctx.beginPath();
    ctx.setLineDash([4, 3]);
    ctx.strokeStyle = '#94A3B8';
    ctx.lineWidth = 1;
    ctx.moveTo(20, currY);
    ctx.lineTo(width - 20, currY);
    ctx.stroke();
    ctx.setLineDash([]);
  };

  const drawSolidLine = (currY: number, strokeWidth = 1) => {
    ctx.beginPath();
    ctx.setLineDash([]);
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = strokeWidth;
    ctx.moveTo(20, currY);
    ctx.lineTo(width - 20, currY);
    ctx.stroke();
  };

  // 1. Store Header
  ctx.fillStyle = '#0F172A';
  ctx.textAlign = 'center';
  ctx.font = 'bold 20px "Courier New", Courier, monospace';
  ctx.fillText('TITIPIN POS', width / 2, y);

  y += 20;
  ctx.font = '12px "Courier New", Courier, monospace';
  ctx.fillStyle = '#475569';
  ctx.fillText('Sistem Kasir & Titip Jual Resmi', width / 2, y);

  y += 16;
  ctx.fillText('Jl. Pajajaran No. 128, Bogor', width / 2, y);

  y += 16;
  ctx.fillText('Telp: 0251-888999', width / 2, y);

  y += 20;
  drawDashedLine(y);

  // 2. Transaction Metadata
  y += 20;
  ctx.textAlign = 'left';
  ctx.font = '11px "Courier New", Courier, monospace';
  ctx.fillStyle = '#334155';

  ctx.fillText(`No. Nota  : ${orderNum}`, 20, y);
  y += 16;
  ctx.fillText(`Tanggal   : ${orderDt}`, 20, y);
  y += 16;
  ctx.fillText(`Kasir     : ${cashier}`, 20, y);
  y += 16;
  ctx.fillText(`Pelanggan : ${customer}`, 20, y);

  y += 18;
  drawSolidLine(y, 1.5);

  // 3. Table Header
  y += 18;
  ctx.font = 'bold 11px "Courier New", Courier, monospace';
  ctx.fillStyle = '#0F172A';
  ctx.fillText('ITEM', 20, y);
  ctx.textAlign = 'center';
  ctx.fillText('QTY', paperSize === '58mm' ? 175 : 230, y);
  ctx.textAlign = 'right';
  ctx.fillText('TOTAL', width - 20, y);

  y += 10;
  drawDashedLine(y);

  // 4. Item List
  y += 18;
  for (const it of items) {
    const name =
      it.productName ||
      it.product_name ||
      it.product?.productName ||
      it.product?.product_name ||
      'Produk';
    const qty = it.quantity || 1;
    const price = Number(it.unitPrice || it.product?.price || 0);
    const subtotal = Number(it.subtotal || price * qty);

    // Product title (truncate if too long)
    ctx.textAlign = 'left';
    ctx.font = 'bold 12px "Courier New", Courier, monospace';
    ctx.fillStyle = '#0F172A';
    const maxChars = paperSize === '58mm' ? 18 : 28;
    const displayName = name.length > maxChars ? `${name.slice(0, maxChars - 2)}..` : name;
    ctx.fillText(displayName, 20, y);

    // Price details & subtotal row
    y += 16;
    ctx.font = '11px "Courier New", Courier, monospace';
    ctx.fillStyle = '#64748B';
    ctx.fillText(`  ${qty} x ${formatRupiah(price)}`, 20, y);

    ctx.textAlign = 'right';
    ctx.font = 'bold 11px "Courier New", Courier, monospace';
    ctx.fillStyle = '#0F172A';
    ctx.fillText(formatRupiah(subtotal), width - 20, y);

    y += 18;
  }

  drawDashedLine(y);

  // 5. Monetary Summary
  y += 20;
  ctx.font = '12px "Courier New", Courier, monospace';
  ctx.fillStyle = '#334155';

  ctx.textAlign = 'left';
  ctx.fillText('Subtotal', 20, y);
  ctx.textAlign = 'right';
  ctx.fillText(formatRupiah(subtotalVal), width - 20, y);

  if (discountVal > 0) {
    y += 18;
    ctx.textAlign = 'left';
    ctx.fillStyle = '#059669'; // Green accent
    ctx.fillText('Diskon Ultah (5%)', 20, y);
    ctx.textAlign = 'right';
    ctx.fillText(`-${formatRupiah(discountVal)}`, width - 20, y);
    ctx.fillStyle = '#334155';
  }

  y += 12;
  drawSolidLine(y, 2);

  // Total Akhir prominent box
  y += 24;
  ctx.textAlign = 'left';
  ctx.font = 'bold 15px "Courier New", Courier, monospace';
  ctx.fillStyle = '#0F172A';
  ctx.fillText('TOTAL AKHIR', 20, y);

  ctx.textAlign = 'right';
  ctx.font = 'bold 16px "Courier New", Courier, monospace';
  ctx.fillText(formatRupiah(totalVal), width - 20, y);

  if (hasPayment) {
    y += 22;
    ctx.font = '11px "Courier New", Courier, monospace';
    ctx.fillStyle = '#475569';
    ctx.textAlign = 'left';
    ctx.fillText('Tunai Diterima', 20, y);
    ctx.textAlign = 'right';
    ctx.fillText(formatRupiah(order.total_paid), width - 20, y);

    const change = Number(
      order.change_amount || Math.max(0, Number(order.total_paid) - totalVal),
    );
    y += 16;
    ctx.textAlign = 'left';
    ctx.fillText('Kembalian', 20, y);
    ctx.textAlign = 'right';
    ctx.fillText(formatRupiah(change), width - 20, y);
  }

  y += 20;
  drawDashedLine(y);

  // 6. Thermal Barcode graphic
  y += 20;
  ctx.fillStyle = '#0F172A';
  const barcodeX = width / 2 - 100;
  const barcodeWidth = 200;
  const barcodeHeightPx = 30;

  // Draw randomized pseudo-barcode pattern seeded by invoice number
  const seed = orderNum.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  let curX = barcodeX;
  for (let i = 0; i < 48; i++) {
    const barW = ((seed + i * 7) % 3) + 1;
    const isBar = (seed + i * 13) % 4 !== 0;
    if (isBar && curX + barW <= barcodeX + barcodeWidth) {
      ctx.fillRect(curX, y, barW, barcodeHeightPx);
    }
    curX += barW + ((i % 3 === 0) ? 2 : 1);
  }

  y += barcodeHeightPx + 14;
  ctx.textAlign = 'center';
  ctx.font = '10px "Courier New", Courier, monospace';
  ctx.fillStyle = '#64748B';
  ctx.fillText(`* ${orderNum} *`, width / 2, y);

  // 7. Footer
  y += 20;
  drawDashedLine(y);

  y += 20;
  ctx.textAlign = 'center';
  ctx.font = 'bold 11px "Courier New", Courier, monospace';
  ctx.fillStyle = '#0F172A';
  ctx.fillText('TERIMA KASIH ATAS KUNJUNGAN ANDA!', width / 2, y);

  y += 16;
  ctx.font = '10px "Courier New", Courier, monospace';
  ctx.fillStyle = '#64748B';
  ctx.fillText('Barang yang sudah dibeli tidak dapat ditukar', width / 2, y);

  y += 14;
  ctx.fillText('Simpan struk ini sebagai bukti transaksi sah', width / 2, y);

  y += 14;
  ctx.fillText('www.titipin.id', width / 2, y);

  return canvas;
}

// ============================================================================
// 3. IMAGE (PNG) DOWNLOADER
// ============================================================================

export function downloadReceiptAsImage(
  order: ReceiptData,
  optionsOrFilename?: string | { paperSize?: '58mm' | '80mm'; filename?: string },
): void {
  const paperSize = typeof optionsOrFilename === 'object' ? optionsOrFilename.paperSize || '80mm' : '80mm';
  const customFilename = typeof optionsOrFilename === 'string' ? optionsOrFilename : optionsOrFilename?.filename;
  const canvas = renderReceiptToCanvas(order, paperSize);
  const invoice = order.orderNumber || order.invoiceNumber || 'INV-0000';
  const targetFilename = customFilename || `struk-${invoice}.png`;

  canvas.toBlob((blob) => {
    if (!blob) return;
    triggerDownload(blob, targetFilename);
  }, 'image/png');
}

// ============================================================================
// 4. NATIVE EMBEDDED PDF DOWNLOADER (Adobe PDF 1.4 DCT/JPEG standard)
// ============================================================================

export function buildReceiptPdfBytes(
  jpegBytes: Uint8Array,
  imgWidth: number,
  imgHeight: number,
  widthPt: number,
  heightPt: number,
): Uint8Array {
  const chunks: Uint8Array[] = [];
  const offsets: number[] = [];
  let currentLength = 0;

  function write(str: string) {
    const encoder = new TextEncoder();
    const encoded = encoder.encode(str);
    chunks.push(encoded);
    currentLength += encoded.length;
  }

  function writeBytes(bytes: Uint8Array) {
    chunks.push(bytes);
    currentLength += bytes.length;
  }

  // PDF Header (binary marker ensures binary mode)
  write('%PDF-1.4\n%\xe2\xe3\xcf\xd3\n');

  // Obj 1: Catalog
  offsets[1] = currentLength;
  write('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');

  // Obj 2: Pages
  offsets[2] = currentLength;
  write('2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n');

  // Obj 3: Page (MediaBox matching receipt dimensions in points)
  offsets[3] = currentLength;
  write(
    `3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${widthPt.toFixed(2)} ${heightPt.toFixed(2)}] /Resources << /XObject << /Img 5 0 R >> >> /Contents 4 0 R >>\nendobj\n`,
  );

  // Obj 4: Content stream (paints /Img filling the entire page)
  const contentStream = `q\n${widthPt.toFixed(2)} 0 0 ${heightPt.toFixed(2)} 0 0 cm\n/Img Do\nQ\n`;
  offsets[4] = currentLength;
  write(
    `4 0 obj\n<< /Length ${contentStream.length} >>\nstream\n${contentStream}endstream\nendobj\n`,
  );

  // Obj 5: Image XObject (JPEG stream via native DCTDecode)
  offsets[5] = currentLength;
  write(
    `5 0 obj\n<< /Type /XObject /Subtype /Image /Width ${imgWidth} /Height ${imgHeight} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpegBytes.length} >>\nstream\n`,
  );
  writeBytes(jpegBytes);
  write('\nendstream\nendobj\n');

  // Xref table
  const startXref = currentLength;
  write('xref\n0 6\n0000000000 65535 f \n');
  for (let i = 1; i <= 5; i++) {
    const off = String(offsets[i]).padStart(10, '0');
    write(`${off} 00000 n \n`);
  }

  // Trailer
  write(`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${startXref}\n%%EOF\n`);

  // Concatenate all chunks into a single contiguous Uint8Array
  const totalBytes = new Uint8Array(currentLength);
  let pos = 0;
  for (const chunk of chunks) {
    totalBytes.set(chunk, pos);
    pos += chunk.length;
  }
  return totalBytes;
}

export function buildReceiptPdfBlob(
  jpegBytes: Uint8Array,
  imgWidth: number,
  imgHeight: number,
  widthPt: number,
  heightPt: number,
): Blob {
  const bytes = buildReceiptPdfBytes(jpegBytes, imgWidth, imgHeight, widthPt, heightPt);
  return new Blob([bytes.buffer as ArrayBuffer], { type: 'application/pdf' });
}

export function downloadReceiptAsPdf(
  order: ReceiptData,
  optionsOrFilename?: string | { paperSize?: '58mm' | '80mm'; filename?: string },
): void {
  const paperSize = typeof optionsOrFilename === 'object' ? optionsOrFilename.paperSize || '80mm' : '80mm';
  const customFilename = typeof optionsOrFilename === 'string' ? optionsOrFilename : optionsOrFilename?.filename;
  const canvas = renderReceiptToCanvas(order, paperSize);
  const invoice = order.orderNumber || order.invoiceNumber || 'INV-0000';
  const targetFilename = customFilename || `struk-${invoice}.pdf`;

  // Export as high-quality JPEG
  const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
  const base64 = dataUrl.split(',')[1];
  const binaryString = atob(base64);
  const len = binaryString.length;
  const jpegBytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    jpegBytes[i] = binaryString.charCodeAt(i);
  }

  // Paper width in points (72 pt/inch, 25.4 mm/inch): 58mm -> 164.41 pt, 80mm -> 226.77 pt
  const widthPt = paperSize === '58mm' ? 164.41 : 226.77;
  const heightPt = (canvas.height / canvas.width) * widthPt;

  const pdfBlob = buildReceiptPdfBlob(jpegBytes, canvas.width, canvas.height, widthPt, heightPt);
  triggerDownload(pdfBlob, targetFilename);
}

// Helper to trigger browser file download
function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
