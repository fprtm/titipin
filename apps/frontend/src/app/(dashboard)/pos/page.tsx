import { ShoppingCart } from 'lucide-react';

export default function PosPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
            Kasir Terminal POS
          </h1>
          <p className="text-xs text-slate-500 sm:text-sm">
            Terminal transaksi checkout dan pemrosesan pesanan ritel.
          </p>
        </div>
      </div>

      <div className="glass-panel space-y-4 p-8 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-800">
          <ShoppingCart className="h-7 w-7" />
        </div>
        <h2 className="text-lg font-semibold text-slate-900">Terminal Kasir Siap</h2>
        <p className="mx-auto max-w-md text-sm text-slate-500">
          Silakan pindai barcode produk atau cari barang melalui katalog untuk memulai transaksi
          belanja kasir.
        </p>
      </div>
    </div>
  );
}
