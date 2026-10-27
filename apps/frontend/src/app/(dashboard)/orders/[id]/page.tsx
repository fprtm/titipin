'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Printer,
  Receipt,
  Calendar,
  User,
  ShoppingBag,
  Clock,
  AlertCircle,
} from 'lucide-react';
import { apiClient } from '../../../../lib/api-client';
import { formatCurrency, formatDate } from '../../../../lib/utils';
import { Badge } from '../../../../components/ui/badge';
import type { OrderDetailData } from '@titipin/shared';

interface OrderDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function OrderDetailPage({ params }: OrderDetailPageProps) {
  const resolvedParams = use(params);
  const orderId = resolvedParams.id;

  const [order, setOrder] = useState<OrderDetailData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    async function loadOrderDetail() {
      setIsLoading(true);
      try {
        const res = await apiClient.get(`/orders/${orderId}`);
        const data = res.data?.data;
        if (data) {
          setOrder(data);
        } else {
          setErrorMessage('Data pesanan tidak ditemukan.');
        }
      } catch (err: unknown) {
        console.error('Failed to load order detail', err);
        setErrorMessage('Gagal memuat detail nota pesanan.');
      } finally {
        setIsLoading(false);
      }
    }
    loadOrderDetail();
  }, [orderId]);

  const handlePrint = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-slate-500">
        <Receipt className="h-10 w-10 animate-bounce text-emerald-600 mb-3" />
        <p className="text-sm font-semibold">Memuat data nota transaksi...</p>
      </div>
    );
  }

  if (errorMessage || !order) {
    return (
      <div className="max-w-xl mx-auto my-12 p-6 glass-panel rounded-2xl text-center space-y-4">
        <AlertCircle className="h-10 w-10 text-rose-500 mx-auto" />
        <h2 className="text-lg font-bold text-slate-800">Nota Tidak Ditemukan</h2>
        <p className="text-xs text-slate-500">{errorMessage || 'Pesanan dengan ID ini tidak ada.'}</p>
        <Link
          href="/orders"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white font-semibold text-xs hover:bg-emerald-700 transition-colors shadow-xs"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Kembali ke Riwayat Transaksi</span>
        </Link>
      </div>
    );
  }

  const orderNum = order.orderNumber || order.order_number || `INV-${order.id}`;
  const orderDt = order.orderDate || order.order_date || order.createdAt || '';
  const custName = order.customerName || order.customer_name || 'Pelanggan Umum';
  const cashier = order.cashierName || order.createdByName || order.created_by_name || 'Kasir';
  const items = order.items || [];
  const total = Number(order.totalAmount || order.total_amount || 0);
  const activityLogs = order.activityLogs || order.activity_logs || [];

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Top action bar (hidden on print) */}
      <div className="flex items-center justify-between gap-4 print:hidden">
        <Link
          href="/orders"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Kembali ke Riwayat Transaksi</span>
        </Link>

        <button
          type="button"
          onClick={handlePrint}
          className="flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2 text-xs font-bold text-white shadow-md hover:bg-emerald-800 active:scale-95 transition-all"
        >
          <Printer className="h-4 w-4" />
          <span>Cetak Nota (Print)</span>
        </button>
      </div>

      {/* Official Receipt Card (screen view + 80mm thermal print view) */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl space-y-6 shadow-sm border border-slate-200/80 bg-white/90 print:p-0 print:border-none print:shadow-none print:bg-white print:max-w-[80mm] print:mx-auto">
        {/* Receipt Header */}
        <div className="border-b border-slate-200 pb-5 text-center sm:text-left print:text-center space-y-1">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between print:flex-col gap-2">
            <div>
              <h2 className="text-xl font-black tracking-tight text-emerald-800 print:text-black">
                TITIPIN RETAIL POS
              </h2>
              <p className="text-[11px] text-slate-500 print:text-black">
                Sistem Kasir & Manajemen Titip Jual Resmi
              </p>
            </div>

            <div className="flex items-center justify-center sm:justify-end gap-2 print:justify-center">
              <Badge variant="success" className="px-2.5 py-0.5 text-xs font-bold">
                Lunas
              </Badge>
            </div>
          </div>

          <div className="pt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-600 print:grid-cols-1 print:text-[11px] print:text-black">
            <div className="flex items-center gap-1.5 justify-center sm:justify-start print:justify-start">
              <Receipt className="h-3.5 w-3.5 text-slate-400 print:hidden" />
              <span className="font-semibold text-slate-500">No. Invoice:</span>
              <span className="font-mono font-bold text-slate-900 print:text-black">{orderNum}</span>
            </div>

            <div className="flex items-center gap-1.5 justify-center sm:justify-end print:justify-start">
              <Calendar className="h-3.5 w-3.5 text-slate-400 print:hidden" />
              <span className="font-semibold text-slate-500">Tanggal:</span>
              <span className="font-medium text-slate-800 print:text-black">
                {orderDt ? formatDate(orderDt) : '-'}
              </span>
            </div>

            <div className="flex items-center gap-1.5 justify-center sm:justify-start print:justify-start">
              <User className="h-3.5 w-3.5 text-slate-400 print:hidden" />
              <span className="font-semibold text-slate-500">Pelanggan:</span>
              <span className="font-medium text-slate-800 print:text-black">{custName}</span>
            </div>

            <div className="flex items-center gap-1.5 justify-center sm:justify-end print:justify-start">
              <ShoppingBag className="h-3.5 w-3.5 text-slate-400 print:hidden" />
              <span className="font-semibold text-slate-500">Kasir:</span>
              <span className="font-medium text-slate-800 print:text-black">{cashier}</span>
            </div>
          </div>
        </div>

        {/* Item details table with price snapshots */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 print:text-black">
            Rincian Item Belanja (Snapshot Harga)
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 font-semibold text-[11px] print:text-black">
                  <th className="py-2 pr-2">Kode</th>
                  <th className="py-2 pr-2">Nama Barang</th>
                  <th className="py-2 px-2 text-center">Qty</th>
                  <th className="py-2 px-2 text-right">Harga Snapshot</th>
                  <th className="py-2 pl-2 text-right">Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 print:divide-slate-300">
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-4 text-center text-slate-400">
                      Tidak ada detail item yang tersimpan.
                    </td>
                  </tr>
                ) : (
                  items.map((it, idx) => {
                    const code = it.productCode || it.product_code || `P${idx + 1}`;
                    const name = it.productName || it.product_name || 'Produk';
                    const unitPrice = Number(it.unitPrice || it.unit_price || 0);
                    const subtotal = Number(it.subtotal || unitPrice * it.quantity);

                    return (
                      <tr key={it.id || idx} className="hover:bg-slate-50/50 print:hover:bg-transparent">
                        <td className="py-2.5 pr-2 font-mono text-[11px] text-slate-500 print:text-black">
                          {code}
                        </td>
                        <td className="py-2.5 pr-2 font-medium text-slate-800 print:text-black">
                          {name}
                        </td>
                        <td className="py-2.5 px-2 text-center font-mono text-slate-700 print:text-black">
                          {it.quantity}
                        </td>
                        <td className="py-2.5 px-2 text-right font-mono text-slate-600 print:text-black">
                          {formatCurrency(unitPrice)}
                        </td>
                        <td className="py-2.5 pl-2 text-right font-mono font-bold text-slate-900 print:text-black">
                          {formatCurrency(subtotal)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Monetary Total Summary */}
          <div className="border-t-2 border-slate-900/80 pt-3 flex flex-col items-end gap-1 text-xs">
            <div className="flex items-center justify-between w-full sm:w-64 print:w-full font-bold text-slate-900 print:text-black text-sm pt-1">
              <span>TOTAL PEMBAYARAN:</span>
              <span className="font-mono text-base">{formatCurrency(total)}</span>
            </div>
          </div>
        </div>

        {/* Order Activity Timeline (Audit Trail) - hidden on print */}
        <div className="border-t border-slate-200 pt-5 space-y-3 print:hidden">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-600">
            <Clock className="h-4 w-4 text-emerald-700" />
            <span>Kronologi Aktivitas Transaksi (Audit Trail)</span>
          </div>

          {activityLogs.length === 0 ? (
            <p className="text-xs text-slate-400 italic">
              Tidak ada log aktivitas lanjutan untuk transaksi ini.
            </p>
          ) : (
            <div className="space-y-3 pl-2 border-l-2 border-emerald-200">
              {activityLogs.map((log) => {
                const actionText = log.action || 'Aktivitas';
                const performer = log.performedByName || log.performed_by_name || 'Sistem';
                const logTime = log.createdAt || log.created_at || '';

                return (
                  <div key={log.id} className="relative pl-4 text-xs space-y-0.5">
                    <div className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-emerald-600 border-2 border-white ring-1 ring-emerald-400" />
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-800">{actionText}</span>
                      <span className="text-[10px] text-slate-400">
                        {logTime ? formatDate(logTime) : ''}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Oleh <span className="font-medium text-slate-700">{performer}</span>
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Print Footer note */}
        <div className="hidden print:block text-center pt-6 text-[10px] text-black border-t border-dashed border-black">
          <p>Terima kasih atas kunjungan Anda!</p>
          <p>Barang yang sudah dibeli tidak dapat ditukar atau dikembalikan.</p>
        </div>
      </div>
    </div>
  );
}
