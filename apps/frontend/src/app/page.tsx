import { Store, ShieldCheck, Database, Server, CheckCircle2, ArrowRight } from 'lucide-react';

export default function HomePage() {
  return (
    <main className="flex min-h-screen w-full flex-col items-center justify-center p-4 sm:p-6 lg:p-12">
      <div className="glass-panel w-full max-w-4xl p-6 sm:p-8 lg:p-10">
        {/* Header Section */}
        <header className="flex flex-col items-start justify-between gap-4 border-b border-slate-200/60 pb-6 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-700 text-white shadow-md">
              <Store className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
                Titipin POS
              </h1>
              <p className="text-xs font-medium text-slate-500 sm:text-sm">
                Point of Sale & Order Management Monorepo
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50/80 px-3.5 py-1.5 text-xs font-semibold text-emerald-800">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <span>Fondasi Sistem Siap</span>
          </div>
        </header>

        {/* Hero Content */}
        <section className="mt-8 space-y-4">
          <h2 className="text-lg font-semibold text-slate-900 sm:text-xl">
            Slice 0 — Monorepo Baseline & Audit Infrastructure
          </h2>
          <p className="text-sm leading-relaxed text-slate-600">
            Fondasi arsitektur modular monolith POS dengan pemisahan service backend NestJS 11+ dan
            antarmuka kasir Next.js 15 App Router, didukung oleh Drizzle ORM PostgreSQL dan skema
            jejak audit.
          </p>
        </section>

        {/* Feature Cards Grid */}
        <section className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="glass-card p-5 sm:p-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-100 text-teal-800">
              <Server className="h-5 w-5" />
            </div>
            <h3 className="mt-4 text-base font-semibold text-slate-900">NestJS 11 & Node 24</h3>
            <p className="mt-1.5 text-xs leading-relaxed text-slate-500 sm:text-sm">
              Modular architecture dengan validasi Zod eksplisit, filter exception global, dan
              interceptor response.
            </p>
          </div>

          <div className="glass-card p-5 sm:p-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-100 text-sky-800">
              <Database className="h-5 w-5" />
            </div>
            <h3 className="mt-4 text-base font-semibold text-slate-900">
              Drizzle ORM & PostgreSQL
            </h3>
            <p className="mt-1.5 text-xs leading-relaxed text-slate-500 sm:text-sm">
              Persistensi type-safe dengan connection pool node-postgres dan skema tabel audit_logs.
            </p>
          </div>

          <div className="glass-card p-5 sm:col-span-2 sm:p-6 lg:col-span-1">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <h3 className="mt-4 text-base font-semibold text-slate-900">Audit Logging Engine</h3>
            <p className="mt-1.5 text-xs leading-relaxed text-slate-500 sm:text-sm">
              AuditService terpusat siap merekam setiap mutasi data pengguna secara append-only.
            </p>
          </div>
        </section>

        {/* Quick Info & Action Bar */}
        <footer className="mt-8 flex flex-col items-start justify-between gap-4 rounded-2xl border border-slate-200/80 bg-white/50 p-4 sm:flex-row sm:items-center">
          <div className="text-xs text-slate-600">
            <span className="font-semibold text-slate-800">Health Endpoint:</span>{' '}
            <code className="rounded-md bg-slate-100 px-2 py-1 font-mono text-teal-700">
              GET /api/health
            </code>
          </div>
          <div className="flex w-full items-center justify-end sm:w-auto">
            <a
              href="/login"
              className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 transition-colors hover:text-emerald-800"
            >
              <span>Masuk ke Sistem Kasir</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </a>
          </div>
        </footer>
      </div>
    </main>
  );
}
