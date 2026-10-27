import { LayoutDashboard, TrendingUp, Users, ShoppingBag } from 'lucide-react';

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
            Dashboard Utama
          </h1>
          <p className="text-xs text-slate-500 sm:text-sm">
            Ringkasan performa penjualan dan operasional toko hari ini.
          </p>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="glass-card p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-slate-500">
              Penjualan Hari Ini
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-3 font-mono text-2xl font-bold tabular-nums text-slate-900">
            Rp 1.250.000
          </p>
          <span className="text-xs font-medium text-emerald-600">+12% dari kemarin</span>
        </div>

        <div className="glass-card p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-slate-500">Total Transaksi</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-100 text-teal-700">
              <ShoppingBag className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-3 font-mono text-2xl font-bold tabular-nums text-slate-900">48</p>
          <span className="text-xs text-slate-500">Transaksi selesai</span>
        </div>

        <div className="glass-card p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-slate-500">Pelanggan Baru</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-100 text-sky-700">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-3 font-mono text-2xl font-bold tabular-nums text-slate-900">14</p>
          <span className="text-xs font-medium text-sky-600">Member terdaftar</span>
        </div>

        <div className="glass-card p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-slate-500">Status Sistem</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
              <LayoutDashboard className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-3 text-xl font-bold text-emerald-700">Normal</p>
          <span className="text-xs text-slate-500">Semua layanan aktif</span>
        </div>
      </div>
    </div>
  );
}
