'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  TrendingUp,
  ShoppingBag,
  Trophy,
  AlertTriangle,
  RefreshCw,
  Calendar,
  Flame,
  Snowflake,
  Package,
  ArrowRight,
} from 'lucide-react';
import { apiClient } from '../../../lib/api-client';
import { formatCurrency } from '../../../lib/utils';
import { Badge } from '../../../components/ui/badge';
import type {
  DashboardPeriod,
  DashboardSummaryData,
  DashboardTrendItem,
} from '@titipin/shared';

const PERIOD_OPTIONS: Array<{ label: string; value: DashboardPeriod }> = [
  { label: 'Hari Ini', value: 'daily' },
  { label: 'Bulan Ini', value: 'monthly' },
  { label: 'Kuartal Ini', value: 'quarterly' },
];

export default function DashboardPage() {
  const [period, setPeriod] = useState<DashboardPeriod>('daily');
  const [summary, setSummary] = useState<DashboardSummaryData | null>(null);
  const [trend, setTrend] = useState<DashboardTrendItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchDashboardData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [summaryRes, trendRes] = await Promise.all([
        apiClient.get('/dashboard/summary', { params: { period } }),
        apiClient.get('/dashboard/trend', { params: { period } }),
      ]);

      setSummary(summaryRes.data?.data || null);
      setTrend(Array.isArray(trendRes.data?.data) ? trendRes.data.data : []);
    } catch (err) {
      console.error('Failed to load dashboard data', err);
    } finally {
      setIsLoading(false);
    }
  }, [period]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Computed values
  const totalSales = Number(
    summary?.total_sales_amount ?? summary?.totalSalesAmount ?? 0,
  );
  const totalOrders = Number(
    summary?.total_transactions ?? summary?.totalTransactions ?? 0,
  );
  const topProducts = summary?.top_products ?? summary?.topProducts ?? [];
  const slowProducts = summary?.slow_products ?? summary?.slowProducts ?? [];
  const lowStockProducts =
    summary?.low_stock_products ?? summary?.lowStockProducts ?? [];

  const topProduct = topProducts[0] || null;
  const criticalStockCount = lowStockProducts.length;

  // Max revenue for trend chart normalization
  const maxRevenue = Math.max(...trend.map((t) => Number(t.revenue || 0)), 1);

  return (
    <div className="space-y-6">
      {/* Page Header & Period Switcher */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl flex items-center gap-2">
            <TrendingUp className="h-6 w-6 text-emerald-700" />
            <span>Dashboard Performa Penjualan</span>
          </h1>
          <p className="text-xs text-slate-500 sm:text-sm">
            Ringkasan performa finansial, volume transaksi, dan pergerakan inventaris toko.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {/* Period Selector Tabs */}
          <div className="glass-panel flex rounded-full p-1 border border-slate-200/80 shadow-xs">
            {PERIOD_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setPeriod(opt.value)}
                className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all ${
                  period === opt.value
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={fetchDashboardData}
            disabled={isLoading}
            className="glass-button p-2 text-slate-700 hover:text-slate-900"
            aria-label="Segarkan Dashboard"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* 1. Total Omset */}
        <div className="glass-card p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Total Omset
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
              <TrendingUp className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <p className="font-mono text-2xl font-black tabular-nums text-slate-900">
              {formatCurrency(totalSales)}
            </p>
            <p className="text-[11px] text-emerald-600 font-medium mt-0.5">
              Periode {period === 'daily' ? 'Hari Ini' : period === 'monthly' ? 'Bulan Ini' : 'Kuartal Ini'}
            </p>
          </div>
        </div>

        {/* 2. Total Transaksi */}
        <div className="glass-card p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Total Order
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-100 text-teal-700">
              <ShoppingBag className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <p className="font-mono text-2xl font-black tabular-nums text-slate-900">
              {totalOrders}{' '}
              <span className="text-xs font-semibold text-slate-500">Transaksi</span>
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">Transaksi lunas tercatat</p>
          </div>
        </div>

        {/* 3. Produk Juara */}
        <div className="glass-card p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Produk Juara
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
              <Trophy className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <p className="font-bold text-base text-slate-900 truncate" title={topProduct?.productName || topProduct?.product_name || 'Belum ada data'}>
              {topProduct?.productName || topProduct?.product_name || 'Belum ada data'}
            </p>
            <p className="text-[11px] text-amber-700 font-semibold mt-0.5">
              {topProduct
                ? `${topProduct.totalSold || topProduct.total_sold || 0} Unit Terjual`
                : 'Belum ada penjualan'}
            </p>
          </div>
        </div>

        {/* 4. Stok Kritis (<5) */}
        <Link
          href="/products"
          className="glass-card p-5 flex flex-col justify-between transition-all hover:border-rose-400 group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 group-hover:text-rose-600 transition-colors">
              Stok Kritis (&lt;5)
            </span>
            <div
              className={`flex h-9 w-9 items-center justify-center rounded-xl ${
                criticalStockCount > 0
                  ? 'bg-rose-100 text-rose-600 animate-pulse'
                  : 'bg-slate-100 text-slate-600'
              }`}
            >
              <AlertTriangle className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <div>
              <p
                className={`font-mono text-2xl font-black tabular-nums ${
                  criticalStockCount > 0 ? 'text-rose-600' : 'text-slate-900'
                }`}
              >
                {criticalStockCount}{' '}
                <span className="text-xs font-semibold text-slate-500">Item</span>
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {criticalStockCount > 0 ? 'Perlu restok segera' : 'Inventaris aman'}
              </p>
            </div>
            <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-rose-600 transition-colors" />
          </div>
        </Link>
      </div>

      {/* Sales Trend Chart (Zero inline SVG, pure tactile CSS bars) */}
      <div className="glass-panel p-6 rounded-3xl space-y-4 shadow-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-emerald-700" />
            <h2 className="text-sm font-bold text-slate-900">
              Tren Penjualan Harian
            </h2>
          </div>
          <span className="text-xs text-slate-500">Nominal Omset & Volume Transaksi</span>
        </div>

        {trend.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs">
            Belum ada data grafik penjualan pada periode ini.
          </div>
        ) : (
          <div className="space-y-2 pt-4">
            {/* Chart Area */}
            <div className="h-48 flex items-end gap-2 sm:gap-4 border-b border-slate-200 pb-2 overflow-x-auto">
              {trend.map((item, idx) => {
                const rev = Number(item.revenue || 0);
                const heightPercent = Math.max(10, Math.round((rev / maxRevenue) * 100));

                return (
                  <div
                    key={item.date || idx}
                    className="flex-1 min-w-[32px] sm:min-w-[48px] flex flex-col items-center gap-1 group relative"
                  >
                    {/* Tooltip on hover */}
                    <div className="absolute -top-12 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 glass-card px-2.5 py-1 rounded-lg text-center whitespace-nowrap shadow-md">
                      <p className="text-[10px] font-bold text-slate-900">{formatCurrency(rev)}</p>
                      <p className="text-[9px] text-slate-500">{item.transactions} Transaksi</p>
                    </div>

                    {/* Bar */}
                    <div
                      style={{ height: `${heightPercent}%` }}
                      className="w-full rounded-t-lg bg-linear-to-t from-emerald-600 to-teal-400 transition-all duration-300 group-hover:brightness-110 shadow-xs"
                    />

                    {/* Date label */}
                    <span className="text-[10px] text-slate-500 font-mono truncate w-full text-center">
                      {item.date?.slice(-5) || idx + 1}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Top 5 Best Selling vs Bottom 5 Slow Moving Comparative Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top 5 Best Sellers */}
        <div className="glass-panel p-5 rounded-2xl space-y-3 shadow-xs">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Flame className="h-4 w-4 text-amber-500" />
            <h3 className="text-sm font-bold text-slate-900">
              Top 5 Produk Terlaris
            </h3>
          </div>

          {topProducts.length === 0 ? (
            <p className="py-6 text-center text-xs text-slate-400">
              Belum ada penjualan produk pada periode ini.
            </p>
          ) : (
            <div className="space-y-2">
              {topProducts.slice(0, 5).map((prod, idx) => (
                <div
                  key={prod.productId || prod.product_id || idx}
                  className="flex items-center justify-between p-2.5 rounded-xl hover:bg-emerald-50/50 transition-colors text-xs"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-[10px] font-bold text-emerald-800">
                      {idx + 1}
                    </span>
                    <div>
                      <p className="font-semibold text-slate-800">
                        {prod.productName || prod.product_name}
                      </p>
                      <p className="text-[10px] text-slate-400 font-mono">
                        {formatCurrency(Number(prod.revenue || 0))}
                      </p>
                    </div>
                  </div>

                  <Badge variant="success" className="px-2 py-0.5 text-[10px]">
                    {prod.totalSold || prod.total_sold || 0} Terjual
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Bottom 5 Slow Moving */}
        <div className="glass-panel p-5 rounded-2xl space-y-3 shadow-xs">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Snowflake className="h-4 w-4 text-sky-500" />
            <h3 className="text-sm font-bold text-slate-900">
              Bottom 5 Produk Perlu Perhatian
            </h3>
          </div>

          {slowProducts.length === 0 ? (
            <p className="py-6 text-center text-xs text-slate-400">
              Semua produk memiliki pergerakan penjualan yang baik.
            </p>
          ) : (
            <div className="space-y-2">
              {slowProducts.slice(0, 5).map((prod, idx) => {
                const sold = prod.totalSold ?? prod.total_sold ?? 0;
                return (
                  <div
                    key={prod.productId || prod.product_id || idx}
                    className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 transition-colors text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <Package className="h-4 w-4 text-slate-400" />
                      <div>
                        <p className="font-semibold text-slate-800">
                          {prod.productName || prod.product_name}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          Stok Tersisa: {prod.currentStock ?? '-'} unit
                        </p>
                      </div>
                    </div>

                    <Badge
                      variant={sold === 0 ? 'destructive' : 'warning'}
                      className="px-2 py-0.5 text-[10px]"
                    >
                      {sold === 0 ? '0 Terjual' : `${sold} Terjual`}
                    </Badge>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
