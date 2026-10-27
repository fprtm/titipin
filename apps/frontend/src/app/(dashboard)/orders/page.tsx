'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Receipt,
  Search,
  Calendar,
  User,
  ChevronLeft,
  ChevronRight,
  Eye,
  RefreshCw,
} from 'lucide-react';
import { apiClient } from '../../../lib/api-client';
import { formatCurrency, formatDate } from '../../../lib/utils';
import { Badge } from '../../../components/ui/badge';
import type { OrderDetailData, CustomerItem } from '@titipin/shared';

export default function OrdersHistoryPage() {
  const [orders, setOrders] = useState<OrderDetailData[]>([]);
  const [customers, setCustomers] = useState<CustomerItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  // Fetch customers for filter dropdown
  useEffect(() => {
    async function loadCustomers() {
      try {
        const res = await apiClient.get('/customers?per_page=100');
        const data = res.data?.data?.items || res.data?.data || [];
        setCustomers(Array.isArray(data) ? data : []);
      } catch {
        // Fallback
        setCustomers([]);
      }
    }
    loadCustomers();
  }, []);

  // Fetch orders from API
  const fetchOrders = useCallback(async () => {
    setIsLoading(true);
    try {
      const params: Record<string, string | number> = {
        page: currentPage,
        per_page: perPage,
      };

      if (fromDate) params.from = fromDate;
      if (toDate) params.to = toDate;
      if (selectedCustomerId) params.customer_id = selectedCustomerId;
      if (searchQuery.trim()) params.search = searchQuery.trim();

      const res = await apiClient.get('/orders', { params });
      const items = res.data?.data?.items || (Array.isArray(res.data?.data) ? res.data?.data : []);
      const meta = res.data?.data?.meta || res.data?.meta || {};

      setOrders(items);
      setTotalRecords(meta.total || items.length);
      setTotalPages(meta.totalPages || meta.total_pages || Math.ceil((meta.total || items.length) / perPage) || 1);
    } catch (err) {
      console.error('Failed to load orders', err);
      setOrders([]);
      setTotalRecords(0);
      setTotalPages(1);
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, perPage, fromDate, toDate, selectedCustomerId, searchQuery]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Reset pagination on filter change
  const handleFilterChange = (setter: (val: string) => void, val: string) => {
    setter(val);
    setCurrentPage(1);
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setFromDate('');
    setToDate('');
    setSelectedCustomerId('');
    setCurrentPage(1);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl flex items-center gap-2">
            <Receipt className="h-6 w-6 text-emerald-700" />
            <span>Riwayat Transaksi Penjualan</span>
          </h1>
          <p className="text-xs text-slate-500 sm:text-sm">
            Daftar lengkap nota invoice dan riwayat transaksi kasir Titipin POS.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchOrders}
          disabled={isLoading}
          className="glass-button flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 self-start sm:self-auto"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Segarkan</span>
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="glass-panel p-4 rounded-2xl space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search order number */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Cari No. Order..."
              value={searchQuery}
              onChange={(e) => handleFilterChange(setSearchQuery, e.target.value)}
              className="glass-input pl-9 pr-3 py-2 text-xs w-full"
            />
          </div>

          {/* Date from */}
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            <input
              type="date"
              aria-label="Dari Tanggal"
              value={fromDate}
              onChange={(e) => handleFilterChange(setFromDate, e.target.value)}
              className="glass-input pl-9 pr-3 py-2 text-xs w-full"
            />
          </div>

          {/* Date to */}
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            <input
              type="date"
              aria-label="Sampai Tanggal"
              value={toDate}
              onChange={(e) => handleFilterChange(setToDate, e.target.value)}
              className="glass-input pl-9 pr-3 py-2 text-xs w-full"
            />
          </div>

          {/* Customer filter */}
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            <select
              aria-label="Filter Pelanggan"
              value={selectedCustomerId}
              onChange={(e) => handleFilterChange(setSelectedCustomerId, e.target.value)}
              className="glass-input pl-9 pr-3 py-2 text-xs w-full appearance-none bg-white"
            >
              <option value="">Semua Pelanggan</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.customerName || c.customer_name} ({c.phone})
                </option>
              ))}
            </select>
          </div>
        </div>

        {(searchQuery || fromDate || toDate || selectedCustomerId) && (
          <div className="flex items-center justify-end pt-1">
            <button
              type="button"
              onClick={handleResetFilters}
              className="text-xs text-rose-600 hover:text-rose-800 font-medium transition-colors"
            >
              Reset Filter
            </button>
          </div>
        )}
      </div>

      {/* Orders Table */}
      <div className="glass-panel rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200/80 bg-slate-50/75 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">No. Order</th>
                <th className="py-3 px-4">Tanggal & Waktu</th>
                <th className="py-3 px-4">Pelanggan</th>
                <th className="py-3 px-4">Kasir</th>
                <th className="py-3 px-4 text-right">Total Transaksi</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-emerald-600" />
                    <span>Memuat riwayat transaksi...</span>
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <Receipt className="h-10 w-10 mx-auto mb-2 text-slate-300" />
                    <p className="font-semibold text-slate-600">Belum ada data transaksi</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Transaksi yang telah dibayar akan muncul di sini.
                    </p>
                  </td>
                </tr>
              ) : (
                orders.map((ord) => {
                  const orderNum = ord.orderNumber || ord.order_number || `INV-${ord.id}`;
                  const orderDt = ord.orderDate || ord.order_date || ord.createdAt || '';
                  const custName = ord.customerName || ord.customer_name || 'Pelanggan Umum';
                  const cashier = ord.cashierName || ord.createdByName || ord.created_by_name || 'Kasir';
                  const total = Number(ord.totalAmount || ord.total_amount || 0);

                  return (
                    <tr
                      key={ord.id}
                      className="hover:bg-emerald-50/30 transition-colors group"
                    >
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                        {orderNum}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">
                        {orderDt ? formatDate(orderDt) : '-'}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`font-medium ${
                            custName === 'Pelanggan Umum'
                              ? 'text-slate-500 italic'
                              : 'text-emerald-800'
                          }`}
                        >
                          {custName}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">{cashier}</td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900">
                        {formatCurrency(total)}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <Badge variant="success" className="px-2 py-0.5 text-[10px]">
                          Lunas
                        </Badge>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <Link
                          href={`/orders/${ord.id}`}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-semibold text-[11px] transition-colors"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          <span>Buka Nota</span>
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {!isLoading && orders.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-slate-100 bg-white/50 text-xs text-slate-500">
            <div>
              Menampilkan{' '}
              <span className="font-semibold text-slate-700">
                {(currentPage - 1) * perPage + 1}
              </span>{' '}
              -{' '}
              <span className="font-semibold text-slate-700">
                {Math.min(totalRecords, currentPage * perPage)}
              </span>{' '}
              dari{' '}
              <span className="font-semibold text-slate-700">{totalRecords}</span> transaksi
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="glass-button p-1.5 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:text-slate-900"
                aria-label="Halaman Sebelumnya"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 font-bold text-xs">
                {currentPage} / {Math.max(1, totalPages)}
              </span>

              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="glass-button p-1.5 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:text-slate-900"
                aria-label="Halaman Selanjutnya"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
