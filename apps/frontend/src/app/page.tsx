import Link from 'next/link';
import {
  Store,
  ShoppingCart,
  BarChart3,
  ShieldCheck,
  Zap,
  ArrowRight,
  Database,
  Lock,
  Sparkles,
  Server,
  FileSpreadsheet,
} from 'lucide-react';

export default function HomePage() {
  return (
    <main className="min-h-screen w-full bg-canvas-pattern text-slate-900 selection:bg-emerald-100 selection:text-emerald-900">
      {/* Top Glass Navbar */}
      <nav className="glass-panel sticky top-4 z-40 mx-4 sm:mx-6 lg:mx-10 my-4 h-16 px-6 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-700 text-white shadow-md">
            <Store className="h-5 w-5" />
          </div>
          <div>
            <span className="font-bold text-lg tracking-tight text-slate-900">Titipin</span>
            <span className="ml-1.5 rounded-md bg-emerald-100/80 px-2 py-0.5 font-mono text-[11px] font-semibold text-emerald-800">
              POS Enterprise
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 rounded-full border border-emerald-200/80 bg-emerald-50/80 px-3.5 py-1 text-xs font-semibold text-emerald-800">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Sistem Operasional Aktif</span>
          </div>
          <Link
            href="/login"
            className="flex items-center gap-1.5 rounded-xl bg-emerald-700 px-4 py-2 text-xs sm:text-sm font-semibold text-white shadow-sm transition-all hover:bg-emerald-800 active:scale-[0.98]"
          >
            <span>Buka Sistem</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 pt-8 sm:pt-14 pb-12 sm:pb-16 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-slate-200/90 bg-white/80 px-4 py-1.5 text-xs font-semibold text-slate-700 shadow-xs mb-6 backdrop-blur-sm">
          <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
          <span>Point of Sale & Order Management System Berskala Produksi</span>
        </div>

        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 leading-tight">
          Operasional Kasir Cepat, Akurat, &{' '}
          <span className="bg-gradient-to-r from-emerald-700 via-teal-700 to-emerald-900 bg-clip-text text-transparent">
            Bebas Overselling
          </span>
        </h1>

        <p className="mx-auto mt-5 max-w-3xl text-sm sm:text-base lg:text-lg leading-relaxed text-slate-600 font-normal">
          Solusi POS retail komprehensif dengan arsitektur modular monolith NestJS 11+ dan Next.js 15
          App Router. Dilengkapi transaksi atomik ACID, indeks GIN Trigram, analitik bisnis dual-axis,
          dan pemantauan metrik Prometheus.
        </p>

        {/* CTA Buttons */}
        <div className="mt-8 sm:mt-10 flex flex-wrap items-center justify-center gap-3.5 sm:gap-4">
          <Link
            href="/pos"
            className="flex items-center gap-2 rounded-2xl bg-emerald-700 px-6 py-3.5 font-bold text-sm sm:text-base text-white shadow-lg shadow-emerald-900/20 transition-all hover:bg-emerald-800 hover:shadow-xl active:scale-[0.98]"
          >
            <ShoppingCart className="h-5 w-5" />
            <span>Terminal Kasir POS</span>
            <span className="rounded bg-emerald-800/80 px-1.5 py-0.5 font-mono text-[10px] font-normal uppercase">F2</span>
          </Link>

          <Link
            href="/dashboard"
            className="flex items-center gap-2 rounded-2xl glass-card px-6 py-3.5 font-bold text-sm sm:text-base text-slate-800 hover:text-emerald-800 shadow-md transition-all active:scale-[0.98]"
          >
            <BarChart3 className="h-5 w-5 text-emerald-600" />
            <span>Dashboard Eksekutif</span>
          </Link>

          <Link
            href="/analytics"
            className="flex items-center gap-2 rounded-2xl glass-card px-6 py-3.5 font-bold text-sm sm:text-base text-slate-800 hover:text-emerald-800 shadow-md transition-all active:scale-[0.98]"
          >
            <Zap className="h-5 w-5 text-amber-600" />
            <span>Analitik & BI</span>
          </Link>
        </div>

        {/* Live Key Metrics Badges */}
        <div className="mt-12 sm:mt-16 grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 text-left">
          <div className="glass-card p-4 sm:p-5">
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-800">
              <Lock className="h-4 w-4 text-emerald-600" />
              <span>Zero-Overselling</span>
            </div>
            <div className="mt-2 font-mono text-xl sm:text-2xl font-bold text-slate-900">100% ACID</div>
            <p className="mt-1 text-[11px] text-slate-500">Pessimistic Row Lock (SELECT ... FOR UPDATE)</p>
          </div>

          <div className="glass-card p-4 sm:p-5">
            <div className="flex items-center gap-2 text-xs font-semibold text-teal-800">
              <Database className="h-4 w-4 text-teal-600" />
              <span>GIN Trigram</span>
            </div>
            <div className="mt-2 font-mono text-xl sm:text-2xl font-bold text-slate-900">&lt; 10ms</div>
            <p className="mt-1 text-[11px] text-slate-500">Bitmap Index Scan via PostgreSQL pg_trgm</p>
          </div>

          <div className="glass-card p-4 sm:p-5">
            <div className="flex items-center gap-2 text-xs font-semibold text-amber-800">
              <Server className="h-4 w-4 text-amber-600" />
              <span>Observabilitas</span>
            </div>
            <div className="mt-2 font-mono text-xl sm:text-2xl font-bold text-slate-900">Prometheus</div>
            <p className="mt-1 text-[11px] text-slate-500">Latency header &amp; metrics scraper aktif</p>
          </div>

          <div className="glass-card p-4 sm:p-5">
            <div className="flex items-center gap-2 text-xs font-semibold text-sky-800">
              <ShieldCheck className="h-4 w-4 text-sky-600" />
              <span>Automated Tests</span>
            </div>
            <div className="mt-2 font-mono text-xl sm:text-2xl font-bold text-slate-900">287 Tests</div>
            <p className="mt-1 text-[11px] text-slate-500">198 Backend + 89 Frontend 100% Pass</p>
          </div>
        </div>
      </section>

      {/* Core Architectural Capabilities */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="text-center mb-10">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">
            Kemampuan Arsitektural Skala Produksi
          </h2>
          <p className="mt-2 text-xs sm:text-sm text-slate-500 max-w-xl mx-auto">
            Dibangun dengan prinsip Clean Architecture, Separation of Concerns, dan integritas finansial mutlak.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="glass-panel p-6 sm:p-7 flex flex-col justify-between">
            <div>
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800 mb-4">
                <ShoppingCart className="h-6 w-6" />
              </div>
              <h3 className="font-bold text-lg text-slate-900">Terminal Kasir POS Modern</h3>
              <p className="mt-2 text-xs sm:text-sm text-slate-600 leading-relaxed">
                Pencarian katalog debounced 300ms, hotkey retail kasir (F2, F8, F9, Esc), penahanan keranjang
                (hold order) terisolasi tanpa potong stok, serta cetak struk thermal 58mm/80mm.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="font-medium text-slate-500">Rute Kasir:</span>
              <code className="rounded bg-slate-100 px-2 py-0.5 font-mono text-emerald-700">/pos</code>
            </div>
          </div>

          <div className="glass-panel p-6 sm:p-7 flex flex-col justify-between">
            <div>
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-100 text-amber-800 mb-4">
                <BarChart3 className="h-6 w-6" />
              </div>
              <h3 className="font-bold text-lg text-slate-900">Business Intelligence &amp; Analitik</h3>
              <p className="mt-2 text-xs sm:text-sm text-slate-600 leading-relaxed">
                Grafik dual-axis Recharts omset vs volume pesanan, Market Basket Analysis untuk saran bundling kombo,
                distribusi jam belanja sibuk 24 jam, dan segmentasi belanja member vs walk-in.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="font-medium text-slate-500">Rute Analitik:</span>
              <code className="rounded bg-slate-100 px-2 py-0.5 font-mono text-amber-700">/analytics</code>
            </div>
          </div>

          <div className="glass-panel p-6 sm:p-7 flex flex-col justify-between">
            <div>
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-100 text-teal-800 mb-4">
                <FileSpreadsheet className="h-6 w-6" />
              </div>
              <h3 className="font-bold text-lg text-slate-900">Manajemen &amp; Audit Trail</h3>
              <p className="mt-2 text-xs sm:text-sm text-slate-600 leading-relaxed">
                Ekspor riwayat multi-sheet Excel (.xlsx), impor produk idempoten, audit log append-only dengan side-by-side
                visual diff viewer, dan RBAC ketat Admin vs Kasir.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="font-medium text-slate-500">Rute Audit:</span>
              <code className="rounded bg-slate-100 px-2 py-0.5 font-mono text-teal-700">/audit-logs</code>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Access Footbar */}
      <footer className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 pb-12 pt-6">
        <div className="glass-panel p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-center sm:text-left">
            <h4 className="font-bold text-sm text-slate-900">Kredensial Akun Seeder Bawaan</h4>
            <p className="mt-1 text-xs text-slate-500">
              Admin: <code className="font-mono text-slate-800 font-semibold">admin@titipin.id</code> (Admin123!) • Kasir:{' '}
              <code className="font-mono text-slate-800 font-semibold">kasir@titipin.id</code> (Kasir123!)
            </p>
          </div>

          <div className="flex items-center gap-3">
            <a
              href="http://localhost:3001/api/docs"
              target="_blank"
              rel="noreferrer"
              className="rounded-xl border border-slate-200 bg-white/80 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:text-emerald-700 hover:bg-white shadow-xs transition-colors"
            >
              Swagger OpenAPI
            </a>
            <Link
              href="/login"
              className="rounded-xl bg-emerald-700 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-800 shadow-sm transition-colors"
            >
              Masuk Sesi
            </Link>
          </div>
        </div>

        <div className="mt-6 text-center text-xs text-slate-400">
          Titipin POS • Medior Fullstack Developer Technical Test Solution • Node 24 LTS • Next.js 15 • NestJS 11 • Drizzle ORM • PostgreSQL 16
        </div>
      </footer>
    </main>
  );
}
