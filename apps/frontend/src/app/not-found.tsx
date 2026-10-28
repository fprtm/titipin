import Link from 'next/link';
import { Store, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <main className="flex min-h-screen w-full flex-col items-center justify-center p-4 sm:p-6 lg:p-12">
      <div className="glass-panel w-full max-w-md p-8 text-center sm:p-10">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-100 text-teal-800">
          <Store className="h-7 w-7" />
        </div>
        <h1 className="mt-6 font-bold text-4xl text-slate-900 tracking-tight">404</h1>
        <h2 className="mt-2 font-semibold text-lg text-slate-800">Halaman Tidak Ditemukan</h2>
        <p className="mt-2 text-slate-600 text-sm">
          Halaman yang Anda tuju tidak tersedia atau telah dipindahkan.
        </p>
        <div className="mt-6 flex justify-center">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 rounded-xl bg-teal-700 px-5 py-2.5 font-semibold text-sm text-white shadow-sm transition-all hover:bg-teal-800 active:scale-[0.98]"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Kembali ke Beranda</span>
          </Link>
        </div>
      </div>
    </main>
  );
}
