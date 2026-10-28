'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  BarChart3,
  TrendingUp,
  ShoppingBag,
  Clock,
  Users,
  Lightbulb,
  Layers,
  Zap,
  UserCheck,
  Calendar,
  RefreshCw,
  ArrowRight,
  ShieldAlert,
  Loader2,
  Gift,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { apiClient } from '../../../lib/api-client';
import { formatCurrency } from '../../../lib/utils';
import { Badge } from '../../../components/ui/badge';
import { InfoTooltip } from '../../../components/ui/info-tooltip';
import { useAuth } from '../../../hooks/use-auth';
import type {
  DashboardPeriod,
  AnalyticsOverviewData,
  SalesTrendPoint,
} from '@titipin/shared';

const PERIOD_OPTIONS: Array<{ label: string; value: DashboardPeriod }> = [
  { label: 'Hari Ini', value: 'daily' },
  { label: 'Bulan Ini', value: 'monthly' },
  { label: 'Kuartal Ini', value: 'quarterly' },
  { label: 'Tahun Ini', value: 'yearly' },
];

function formatCompactRupiah(value: number): string {
  if (value >= 1_000_000) {
    return `Rp ${(value / 1_000_000).toFixed(1).replace(/\.0$/, '')}jt`;
  }
  if (value >= 1_000) {
    return `Rp ${(value / 1_000).toFixed(0)}rb`;
  }
  return `Rp ${value}`;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    value: number;
    dataKey: string;
    payload: SalesTrendPoint;
  }>;
  label?: string;
}

function GlassChartTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload || !payload.length) return null;
  const point = payload[0].payload;

  return (
    <div className="glass-panel min-w-[200px] rounded-xl border border-slate-200/80 bg-white/95 p-3 shadow-xl backdrop-blur-md">
      <div className="mb-2 border-b border-slate-100 pb-1.5 font-bold text-slate-800 text-xs">
        {point.label || label}
      </div>
      <div className="space-y-1.5 text-xs">
        <div className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5 text-slate-600">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-600" />
            Omset Penjualan:
          </span>
          <span className="font-bold text-emerald-700">
            {formatCurrency(point.revenue)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5 text-slate-600">
            <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
            Total Transaksi:
          </span>
          <span className="font-bold text-amber-700">
            {point.transactions} transaksi
          </span>
        </div>
        <div className="flex items-center justify-between gap-4 border-t border-slate-100 pt-1 text-[11px]">
          <span className="text-slate-500">Rata-rata Keranjang (AOV):</span>
          <span className="font-semibold text-slate-700">
            {formatCurrency(point.aov)}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  const [period, setPeriod] = useState<DashboardPeriod>('monthly');
  const [data, setData] = useState<AnalyticsOverviewData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const fetchAnalytics = useCallback(async (isManual = false) => {
    if (isManual) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    try {
      const res = await apiClient.get('/analytics/overview', {
        params: { period, _t: isManual ? Date.now() : undefined },
      });
      if (res.data?.success && res.data?.data) {
        setData(res.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch analytics overview:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [period]);

  useEffect(() => {
    if (isAdmin) {
      fetchAnalytics();
    } else {
      setIsLoading(false);
    }
  }, [isAdmin, fetchAnalytics]);

  // Cashier Access Denied View
  if (!isAdmin && user) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center p-6 text-center">
        <div className="glass-panel mx-auto max-w-md rounded-2xl border border-slate-200/80 bg-white/80 p-8 shadow-lg">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-100 text-rose-600">
            <ShieldAlert className="h-8 w-8" />
          </div>
          <h2 className="mb-2 text-xl font-bold text-slate-900">Akses Khusus Admin</h2>
          <p className="mb-6 text-sm text-slate-600">
            Halaman Analisis Penjualan &amp; Intelijen Bisnis hanya dapat diakses oleh Administrator toko untuk keperluan perencanaan strategis dan pelaporan omset.
          </p>
          <div className="flex justify-center gap-3">
            <Link
              href="/pos"
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-800"
            >
              <ShoppingBag className="h-4 w-4" />
              Kembali ke Kasir POS
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header & Filter Controls */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-700">
            <BarChart3 className="h-4 w-4" />
            <span>Business Intelligence &amp; Sales Insights</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Analisis Penjualan
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Eksplorasi tren pendapatan, pola waktu belanja, analisis keranjang produk, dan segmentasi pelanggan.
          </p>
        </div>

        {/* Period Selector & Refresh */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center rounded-xl border border-slate-200 bg-white/80 p-1 shadow-xs backdrop-blur-md">
            <Calendar className="ml-2 mr-1 h-4 w-4 text-slate-400" />
            {PERIOD_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setPeriod(opt.value)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                  period === opt.value
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => fetchAnalytics(true)}
            disabled={isRefreshing || isLoading}
            className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl border border-slate-200 bg-white/80 text-slate-600 shadow-xs transition hover:bg-slate-100 disabled:opacity-50"
            title="Muat ulang data"
          >
            <RefreshCw
              className={`h-4 w-4 ${isRefreshing ? 'animate-spin text-emerald-700' : ''}`}
            />
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex min-h-[400px] items-center justify-center">
          <div className="flex flex-col items-center gap-3 text-slate-500">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
            <p className="text-sm font-medium">Memproses data analitik penjualan...</p>
          </div>
        </div>
      ) : data ? (
        <>
          {/* Section 1: KPI Summary Glass Cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Total Revenue */}
            <div className="glass-panel relative overflow-visible rounded-2xl border border-emerald-100/80 bg-white/80 p-5 shadow-sm transition hover:shadow-md">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Total Omset
                  </span>
                  <InfoTooltip
                    title="Total Omset Penjualan"
                    source="PostgreSQL orders.total_amount"
                    formula="SUM(total_amount) WHERE deleted_at IS NULL"
                    description="Akumulasi seluruh nilai belanja dari transaksi berstatus final (COMPLETED) pada periode terpilih. Tidak memperhitungkan draft (held order)."
                    align="left"
                  />
                </div>
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                  <TrendingUp className="h-5 w-5" />
                </div>
              </div>
              <div className="mt-3 text-2xl font-black tracking-tight text-slate-900">
                {formatCurrency(data.totalRevenue)}
              </div>
              <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
                <span>Periode:</span>
                <span className="font-semibold text-emerald-700">
                  {PERIOD_OPTIONS.find((o) => o.value === period)?.label}
                </span>
              </div>
            </div>

            {/* Total Transactions & AOV */}
            <div className="glass-panel relative overflow-visible rounded-2xl border border-blue-100/80 bg-white/80 p-5 shadow-sm transition hover:shadow-md">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Volume &amp; AOV
                  </span>
                  <InfoTooltip
                    title="Volume Transaksi & Rata-rata Keranjang (AOV)"
                    source="PostgreSQL orders.id & total_amount"
                    formula="COUNT(orders.id) & SUM(total_amount) / COUNT(orders.id)"
                    description="Volume mengukur total nota yang berhasil diproses kasir. Average Order Value (AOV) mengukur rata-rata rupiah yang dibelanjakan pelanggan per kunjungan toko."
                    align="left"
                  />
                </div>
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
                  <ShoppingBag className="h-5 w-5" />
                </div>
              </div>
              <div className="mt-3 text-2xl font-black tracking-tight text-slate-900">
                {data.totalTransactions}{' '}
                <span className="text-sm font-normal text-slate-500">Transaksi</span>
              </div>
              <div className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                <span>Rata-rata:</span>
                <span className="font-bold text-blue-700">
                  {formatCurrency(data.averageOrderValue)} / struk
                </span>
              </div>
            </div>

            {/* Peak Hour */}
            <div className="glass-panel relative overflow-visible rounded-2xl border border-amber-100/80 bg-white/80 p-5 shadow-sm transition hover:shadow-md">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Jam Paling Sibuk
                  </span>
                  <InfoTooltip
                    title="Waktu Puncak Transaksi (Peak Hour)"
                    source="PostgreSQL orders.order_date"
                    formula="MAX(COUNT(*)) GROUP BY EXTRACT(HOUR FROM order_date)"
                    description="Mengidentifikasi jam operasional dengan kepadatan antrean kasir tertinggi. Bermanfaat untuk menyusun jadwal shift kasir dan pembukaan kasir tambahan."
                    align="right"
                  />
                </div>
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                  <Clock className="h-5 w-5" />
                </div>
              </div>
              <div className="mt-3 text-2xl font-black tracking-tight text-slate-900">
                {data.peakHour}
              </div>
              <div className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                <span>Hari Terbaik:</span>
                <span className="font-bold text-amber-700">{data.topDay}</span>
              </div>
            </div>

            {/* Member Revenue Share */}
            <div className="glass-panel relative overflow-visible rounded-2xl border border-indigo-100/80 bg-white/80 p-5 shadow-sm transition hover:shadow-md">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Pangsa Member
                  </span>
                  <InfoTooltip
                    title="Pangsa Kontribusi Omset Member"
                    source="PostgreSQL orders.customer_id & total_amount"
                    formula="(SUM(total_amount WHERE customer_id IS NOT NULL) / Total Omset) * 100%"
                    description="Menghitung porsi rupiah belanja yang disumbangkan oleh pelanggan terdaftar dibandingkan pelanggan umum (walk-in) untuk mengukur efektivitas program loyalitas."
                    align="right"
                  />
                </div>
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700">
                  <Users className="h-5 w-5" />
                </div>
              </div>
              <div className="mt-3 text-2xl font-black tracking-tight text-slate-900">
                {data.customerSegmentation.memberRevenueSharePercent}%{' '}
                <span className="text-xs font-normal text-slate-500">Omset</span>
              </div>
              <div className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                <span>Member AOV:</span>
                <span className="font-bold text-indigo-700">
                  {formatCurrency(data.customerSegmentation.memberAov)}
                </span>
              </div>
            </div>
          </div>

          {/* Section 2: Visualisasi Tren Penjualan (Multi-Axis Dual Chart) */}
          <div className="glass-panel relative overflow-visible rounded-2xl border border-slate-200/80 bg-white/80 p-6 shadow-sm">
            <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-slate-900">
                    Dinamika Tren Omset vs Volume Transaksi
                  </h3>
                  <InfoTooltip
                    title="Grafik Multi-Axis Tren Penjualan"
                    source="PostgreSQL orders.total_amount & order_date"
                    formula="Sumbu Kiri (Area Hijau): Omset (Rp); Sumbu Kanan (Garis Oranye): Frekuensi Transaksi"
                    description="Menampilkan korelasi antara nominal omset dan volume transaksi per titik waktu. Membantu mendeteksi apakah pertumbuhan omset didorong oleh kenaikan jumlah pembeli atau peningkatan nilai belanja per struk."
                    align="left"
                  />
                </div>
                <p className="text-xs text-slate-500">
                  Visualisasi berkesinambungan antara nominal omset harian/bulanan (area hijau) dan frekuensi transaksi kasir (garis oranye).
                </p>
              </div>
              <div className="flex items-center gap-4 text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded-full bg-emerald-600" />
                  <span className="font-medium text-slate-700">Omset (Rp)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded-full bg-amber-500" />
                  <span className="font-medium text-slate-700">Volume Transaksi</span>
                </div>
              </div>
            </div>

            {data.trend && data.trend.length > 0 && isMounted ? (
              <div className="h-[320px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={data.trend}
                    margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#059669" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#059669" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis
                      dataKey="label"
                      stroke="#94a3b8"
                      fontSize={11}
                      tickLine={false}
                      axisLine={{ stroke: '#e2e8f0' }}
                    />
                    <YAxis
                      yAxisId="left"
                      stroke="#94a3b8"
                      fontSize={11}
                      tickLine={false}
                      axisLine={{ stroke: '#e2e8f0' }}
                      tickFormatter={formatCompactRupiah}
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      stroke="#94a3b8"
                      fontSize={11}
                      tickLine={false}
                      axisLine={{ stroke: '#e2e8f0' }}
                      tickFormatter={(val) => `${val} tx`}
                    />
                    <Tooltip content={<GlassChartTooltip />} />
                    <Area
                      yAxisId="left"
                      type="monotone"
                      dataKey="revenue"
                      name="Omset"
                      stroke="#059669"
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#revenueGradient)"
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="transactions"
                      name="Transaksi"
                      stroke="#f59e0b"
                      strokeWidth={2}
                      dot={{ r: 3, fill: '#f59e0b', strokeWidth: 1, stroke: '#fff' }}
                      activeDot={{ r: 5 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex h-56 items-center justify-center text-sm text-slate-400">
                Belum ada transaksi tercatat untuk periode ini.
              </div>
            )}
          </div>

          {/* Section 3: Peak Traffic & Day of Week Grid */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* 24-Hour Traffic Intensity */}
            <div className="glass-panel relative overflow-visible rounded-2xl border border-slate-200/80 bg-white/80 p-6 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-slate-900">
                      Intensitas Jam Belanja (24 Jam)
                    </h3>
                    <InfoTooltip
                      title="Distribusi Trafik Transaksi 24 Jam"
                      source="PostgreSQL orders.order_date"
                      formula="COUNT(*) & SUM(total_amount) GROUP BY EXTRACT(HOUR FROM order_date)"
                      description="Mengelompokkan transaksi sepanjang 24 jam sehari (00:00 - 23:00) untuk memetakan lonjakan jam sibuk (peak hours), jam makan siang, dan jam pulang kantor untuk penjadwalan staf kasir."
                      align="left"
                    />
                  </div>
                  <p className="text-xs text-slate-500">
                    Distribusi transaksi untuk mengoptimalkan jadwal kasir dan persiapan stok.
                  </p>
                </div>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
                  <Clock className="h-4 w-4" />
                </div>
              </div>

              {data.hourlyTraffic && data.hourlyTraffic.length > 0 ? (
                <div className="space-y-2.5">
                  {data.hourlyTraffic.slice(0, 6).map((h) => {
                    const isPeak = `Pukul ${h.hour}` === data.peakHour;
                    return (
                      <div key={h.hour} className="space-y-1">
                        <div className="flex items-center justify-between text-xs font-medium">
                          <span className="flex items-center gap-1.5 text-slate-700">
                            {isPeak && <Zap className="h-3.5 w-3.5 text-amber-500" />}
                            Pukul {h.hour}
                            {isPeak && (
                              <Badge variant="warning" className="text-[10px] py-0 px-1.5">
                                Jam Tersibuk
                              </Badge>
                            )}
                          </span>
                          <span className="text-slate-600">
                            {h.transactions} tx ({h.percentage}%) •{' '}
                            <span className="font-semibold text-emerald-700">
                              {formatCurrency(h.revenue)}
                            </span>
                          </span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              isPeak ? 'bg-amber-500' : 'bg-emerald-600'
                            }`}
                            style={{ width: `${Math.max(h.percentage * 2, 4)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-8 text-center text-xs text-slate-400">
                  Data jam belanja belum tersedia.
                </div>
              )}
            </div>

            {/* Day of Week Traffic */}
            <div className="glass-panel relative overflow-visible rounded-2xl border border-slate-200/80 bg-white/80 p-6 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-slate-900">
                      Pola Belanja Hari dalam Seminggu
                    </h3>
                    <InfoTooltip
                      title="Pola Belanja Hari dalam Seminggu"
                      source="PostgreSQL orders.order_date"
                      formula="Agregasi per hari: EXTRACT(DOW FROM order_date)"
                      description="Menganalisis hari-hari dengan omset dan nilai keranjang (AOV) tertinggi guna menentukan waktu promo mingguan dan persiapan restock barang."
                      align="right"
                    />
                  </div>
                  <p className="text-xs text-slate-500">
                    Performa transaksi dan rata-rata belanja (AOV) dari Minggu hingga Sabtu.
                  </p>
                </div>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 text-blue-700">
                  <Calendar className="h-4 w-4" />
                </div>
              </div>

              {data.dayOfWeekTraffic && data.dayOfWeekTraffic.length > 0 ? (
                <div className="space-y-2.5">
                  {data.dayOfWeekTraffic.map((d) => {
                    const isTopDay = d.dayName === data.topDay;
                    return (
                      <div
                        key={d.dayIndex}
                        className={`flex items-center justify-between rounded-xl p-2.5 text-xs transition ${
                          isTopDay
                            ? 'border border-emerald-200 bg-emerald-50/60 font-semibold'
                            : 'border border-transparent bg-slate-50/70 hover:bg-slate-100/60'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-16 text-slate-800">{d.dayName}</span>
                          {isTopDay && (
                            <Badge variant="success" className="text-[10px] py-0 px-1.5">
                              Omset Tertinggi
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-right">
                          <span className="text-slate-500">{d.transactions} tx</span>
                          <span className="w-24 font-bold text-slate-900">
                            {formatCurrency(d.revenue)}
                          </span>
                          <span className="w-24 text-[11px] text-slate-500">
                            AOV: {formatCurrency(d.avgOrderValue)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-8 text-center text-xs text-slate-400">
                  Data hari belanja belum tersedia.
                </div>
              )}
            </div>
          </div>

          {/* Section 4: Market Basket Intelligence & Rekomendasi Bundling */}
          <div className="glass-panel relative overflow-visible rounded-2xl border border-slate-200/80 bg-white/80 p-6 shadow-sm">
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 uppercase tracking-wider">
                  <Layers className="h-4 w-4" />
                  <span>Market Basket Analysis (Cross-Selling)</span>
                </div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-slate-900">
                    Rekomendasi Paket Bundling Hemat
                  </h3>
                  <InfoTooltip
                    title="Market Basket Analysis (Cross-Selling)"
                    source="PostgreSQL order_items (order_id, product_id)"
                    formula="Self-join order_items WHERE A.product_id < B.product_id HAVING COUNT(*) >= 2"
                    description="Algoritma afinitas frekuensi kemunculan bersama (co-occurrence) dua produk dalam satu invoice. Merekomendasikan paket kombo hemat diskon 5%-10% untuk menaikkan nilai rata-rata belanja pelanggan (basket size)."
                    align="left"
                  />
                </div>
                <p className="text-xs text-slate-500">
                  Pasangan produk yang paling sering dibeli bersamaan oleh pelanggan dalam 1 struk. Buat promo kombo bundling untuk menaikkan nilai keranjang belanja.
                </p>
              </div>
            </div>

            {data.bundlingSuggestions && data.bundlingSuggestions.length > 0 ? (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {data.bundlingSuggestions.map((item, idx) => (
                  <div
                    key={`${item.productAId}-${item.productBId}`}
                    className="relative flex flex-col justify-between rounded-xl border border-slate-200 bg-white/90 p-4 shadow-xs transition hover:border-emerald-300 hover:shadow-md"
                  >
                    <div>
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-[11px] font-bold text-slate-400">
                          KOMBO PILIHAN #{idx + 1}
                        </span>
                        <Badge variant="success" className="text-[10px]">
                          Diskon {item.suggestedDiscountPercent}%
                        </Badge>
                      </div>

                      <div className="space-y-1.5">
                        <div className="text-sm font-bold text-slate-900">
                          {item.productAName}
                        </div>
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600">
                          <span>+</span>
                          <span>{item.productBName}</span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 border-t border-slate-100 pt-3">
                      <div className="flex items-center justify-between text-xs text-slate-600">
                        <span>Frekuensi Bersama:</span>
                        <span className="font-bold text-slate-900">
                          {item.coOccurrenceCount} kali
                        </span>
                      </div>
                      <div className="mt-1 flex items-center justify-between text-xs text-slate-600">
                        <span>Total Nilai Gabungan:</span>
                        <span className="font-bold text-emerald-700">
                          {formatCurrency(item.combinedRevenue)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-slate-400">
                Belum ada data asosiasi keranjang produk yang signifikan.
              </div>
            )}
          </div>

          {/* Section 5: Customer Loyalty & Segmentation */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Member vs Walk-in Cards */}
            <div className="glass-panel relative overflow-visible col-span-1 rounded-2xl border border-slate-200/80 bg-white/80 p-6 shadow-sm lg:col-span-2">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-slate-900">
                      Segmentasi: Pelanggan Terdaftar (Member) vs Umum
                    </h3>
                    <InfoTooltip
                      title="Segmentasi Pembeli (Member vs Walk-in)"
                      source="PostgreSQL orders.customer_id & customers"
                      formula="Group by (customer_id IS NOT NULL) -> Member vs Walk-in"
                      description="Mengukur perbandingan kontribusi omset dan kebiasaan belanja antara pelanggan terdaftar (member) dan pembeli umum (walk-in) untuk mengukur efektivitas program loyalitas toko."
                      align="left"
                    />
                  </div>
                  <p className="text-xs text-slate-500">
                    Perbandingan daya beli antara member terdaftar dan pelanggan non-member.
                  </p>
                </div>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700">
                  <UserCheck className="h-4 w-4" />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {/* Member Stats */}
                <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-4">
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-xs font-bold text-indigo-900">
                      Pelanggan Member
                    </span>
                    <Badge variant="info" className="bg-indigo-600 text-white text-[10px]">
                      Prioritas Loyalitas
                    </Badge>
                  </div>
                  <div className="mt-2 text-xl font-black text-indigo-950">
                    {formatCurrency(data.customerSegmentation.memberRevenue)}
                  </div>
                  <div className="mt-1 text-xs text-indigo-800">
                    {data.customerSegmentation.memberOrders} Pesanan ({data.customerSegmentation.memberRevenueSharePercent}% dari total omset)
                  </div>
                  <div className="mt-3 border-t border-indigo-100 pt-2 text-xs">
                    <span className="text-indigo-700">AOV Belanja:</span>{' '}
                    <span className="font-bold text-indigo-950">
                      {formatCurrency(data.customerSegmentation.memberAov)}
                    </span>
                  </div>
                </div>

                {/* Walk-in Stats */}
                <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700">
                      Pelanggan Umum (Walk-in)
                    </span>
                    <Badge variant="neutral" className="text-[10px]">
                      Non-Member
                    </Badge>
                  </div>
                  <div className="mt-2 text-xl font-black text-slate-900">
                    {formatCurrency(data.customerSegmentation.walkInRevenue)}
                  </div>
                  <div className="mt-1 text-xs text-slate-600">
                    {data.customerSegmentation.walkInOrders} Pesanan ({100 - data.customerSegmentation.memberRevenueSharePercent}% dari total omset)
                  </div>
                  <div className="mt-3 border-t border-slate-200 pt-2 text-xs">
                    <span className="text-slate-600">AOV Belanja:</span>{' '}
                    <span className="font-bold text-slate-900">
                      {formatCurrency(data.customerSegmentation.walkInAov)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Conversion Highlight */}
              {data.customerSegmentation.memberAov > data.customerSegmentation.walkInAov && (
                <div className="mt-4 flex items-center justify-between rounded-xl bg-emerald-50 px-4 py-3 text-xs text-emerald-900">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-emerald-700" />
                    <span>
                      Member belanja rata-rata{' '}
                      <strong>
                        {Math.round(
                          (data.customerSegmentation.memberAov /
                            Math.max(data.customerSegmentation.walkInAov, 1)) *
                            10,
                        ) / 10}
                        x lipat
                      </strong>{' '}
                      lebih besar dibanding pelanggan umum.
                    </span>
                  </div>
                  <Link
                    href="/customers"
                    className="flex items-center gap-1 font-bold text-emerald-700 hover:underline"
                  >
                    Daftar Member Baru <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              )}
            </div>

            {/* Birthday Promo Card */}
            <div className="glass-panel relative overflow-visible col-span-1 flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white/80 p-6 shadow-sm">
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-100 text-rose-600">
                    <Gift className="h-5 w-5" />
                  </div>
                  <Badge variant="info" className="text-[10px]">
                    Privilege 5%
                  </Badge>
                </div>
                <div className="flex items-center gap-1.5">
                  <h3 className="text-base font-bold text-slate-900">
                    Diskon Ulang Tahun Member
                  </h3>
                  <InfoTooltip
                    title="Program Diskon Hari Ulang Tahun Member"
                    source="PostgreSQL customers.birth_date & orders"
                    formula="Diskon 5% otomatis (maks. Rp 50.000) pada hari ulang tahun member"
                    description="Mencatat akumulasi diskon khusus ulang tahun yang dinikmati pelanggan terdaftar, mendorong retensi dan keterikatan emosional pelanggan."
                    align="right"
                  />
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  Pelanggan yang bertransaksi tepat pada hari ulang tahunnya berhak menerima diskon 5% otomatis.
                </p>

                <div className="mt-5 space-y-3">
                  <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/70 p-3 text-xs">
                    <span className="text-slate-600">Transaksi Ulang Tahun:</span>
                    <span className="font-bold text-slate-900">
                      {data.customerSegmentation.birthdayDiscountOrdersCount} transaksi
                    </span>
                  </div>
                  <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/70 p-3 text-xs">
                    <span className="text-slate-600">Total Potongan Diberikan:</span>
                    <span className="font-bold text-rose-600">
                      {formatCurrency(data.customerSegmentation.birthdayDiscountTotalGiven)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-4 text-[11px] text-slate-400">
                Fitur ini membantu menjaga loyalitas dan retensi pelanggan jangka panjang.
              </div>
            </div>
          </div>

          {/* Section 6: Actionable Business Insights */}
          <div className="glass-panel relative overflow-visible rounded-2xl border border-slate-200/80 bg-white/80 p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 uppercase tracking-wider">
                  <Lightbulb className="h-4 w-4" />
                  <span>Smart Recommendations</span>
                </div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-slate-900">
                    Rekomendasi Bisnis &amp; Tindakan Strategis
                  </h3>
                  <InfoTooltip
                    title="Sistem Rekomendasi Keputusan Toko"
                    source="Kompilasi analitik transaksi, jam sibuk, perputaran produk, dan afinitas keranjang"
                    formula="Analisis heuristik data-driven berprioritas dampak omset"
                    description="Menyajikan daftar aksi taktis yang dapat langsung diterapkan oleh tim toko untuk mendongkrak penjualan dan mengoptimalkan persediaan stok."
                    align="left"
                  />
                </div>
                <p className="text-xs text-slate-500">
                  Wawasan cerdas yang dihasilkan dari analisis data transaksi toko untuk memaksimalkan omset dan efisiensi operasional.
                </p>
              </div>
            </div>

            {data.actionableInsights && data.actionableInsights.length > 0 ? (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                {data.actionableInsights.map((insight) => (
                  <div
                    key={insight.id}
                    className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white/90 p-4 shadow-xs"
                  >
                    <div>
                      <div className="mb-2 flex items-center justify-between">
                        <Badge
                          variant={insight.priority === 'HIGH' ? 'destructive' : 'info'}
                          className="text-[10px]"
                        >
                          Prioritas {insight.priority}
                        </Badge>
                        <span className="text-[10px] font-bold text-slate-400">
                          {insight.category}
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-slate-900">
                        {insight.title}
                      </h4>
                      <p className="mt-2 text-xs leading-relaxed text-slate-600">
                        {insight.description}
                      </p>
                    </div>

                    <div className="mt-4 rounded-lg bg-emerald-50/80 p-2.5 text-[11px] text-emerald-900">
                      <strong>Dampak:</strong> {insight.impact}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-slate-400">
                Belum ada rekomendasi strategis tambahan saat ini.
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="flex min-h-[300px] items-center justify-center text-slate-500">
          Gagal memuat data analitik. Silakan coba lagi.
        </div>
      )}
    </div>
  );
}
