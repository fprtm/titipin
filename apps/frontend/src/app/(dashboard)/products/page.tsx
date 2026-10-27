'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Package,
  Search,
  FileSpreadsheet,
  Download,
  Plus,
  Trash2,
  Edit3,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  RefreshCw,
  X,
  UploadCloud,
} from 'lucide-react';
import { useAuth } from '../../../hooks/use-auth';
import { apiClient } from '../../../lib/api-client';
import type { ProductItem, ImportSummaryData } from '@titipin/shared';

export default function ProductsPage() {
  const { user: currentUser } = useAuth();
  const isAdmin = currentUser?.role === 'ADMIN';

  const [products, setProducts] = useState<ProductItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Filters & Pagination
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [sortOption, setSortOption] = useState<'name_asc' | 'name_desc' | 'price_asc' | 'price_desc' | 'stock_asc' | 'stock_desc'>('name_asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [paginationMeta, setPaginationMeta] = useState({
    page: 1,
    per_page: 10,
    total_items: 0,
    total_pages: 1,
  });

  // Modals state
  const [isCreateEditModalOpen, setIsCreateEditModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductItem | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [deleteTargetProduct, setDeleteTargetProduct] = useState<ProductItem | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  // Debounce search
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Fetch products
  const fetchProducts = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    const [sort, order] = sortOption.split('_') as ['name' | 'price' | 'stock', 'asc' | 'desc'];

    try {
      const response = await apiClient.get('/products', {
        params: {
          page: currentPage,
          per_page: 10,
          search: debouncedSearch.trim() || undefined,
          sort,
          order,
        },
      });

      const responseData = response.data.data || response.data;
      const items = Array.isArray(responseData) ? responseData : responseData.items || [];
      const meta = response.data.meta || {
        page: currentPage,
        per_page: 10,
        total_items: items.length,
        total_pages: 1,
      };

      setProducts(items);
      setPaginationMeta(meta);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      setErrorMessage(
        err.response?.data?.message || 'Gagal memuat katalog produk. Silakan coba kembali.',
      );
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, debouncedSearch, sortOption]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Export Excel
  const handleExportExcel = async () => {
    setIsExporting(true);
    setErrorMessage(null);
    try {
      const response = await apiClient.get('/products/export', {
        responseType: 'blob',
      });

      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `katalog-produk-${Date.now()}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      setSuccessMessage('Katalog produk berhasil diunduh ke Excel (.xlsx)');
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      setErrorMessage(err.response?.data?.message || 'Gagal mengunduh katalog Excel.');
    } finally {
      setIsExporting(false);
    }
  };

  const formatRupiah = (amount: string | number) => {
    const num = Number(amount);
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(num);
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification Banner */}
      {successMessage && (
        <div className="glass-panel flex items-center justify-between gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-emerald-400">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 shrink-0" />
            <p className="text-sm font-medium">{successMessage}</p>
          </div>
          <button
            onClick={() => setSuccessMessage(null)}
            className="rounded-lg p-1 hover:bg-emerald-500/20"
            aria-label="Tutup notifikasi"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="glass-panel flex items-center justify-between gap-3 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-red-400">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <p className="text-sm font-medium">{errorMessage}</p>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="rounded-lg p-1 hover:bg-red-500/20"
            aria-label="Tutup error"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Header Section */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white sm:text-3xl">Katalog & Inventaris Produk</h1>
          <p className="text-sm text-zinc-400">
            Kelola katalog barang dagangan toko, pantau ketersediaan stok fisik, dan ekspor data.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={fetchProducts}
            disabled={isLoading}
            className="glass-button flex h-11 items-center gap-2 rounded-xl px-3.5 text-sm font-medium text-zinc-300 hover:text-white"
            title="Segarkan data"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Segarkan</span>
          </button>

          <button
            onClick={handleExportExcel}
            disabled={isExporting}
            className="glass-button flex h-11 items-center gap-2 rounded-xl px-3.5 text-sm font-medium text-zinc-300 hover:text-white"
            title="Unduh katalog dalam format Excel"
          >
            {isExporting ? (
              <Loader2 className="h-4 w-4 animate-spin text-emerald-400" />
            ) : (
              <Download className="h-4 w-4 text-emerald-400" />
            )}
            <span>Export Excel</span>
          </button>

          {isAdmin && (
            <>
              <button
                onClick={() => setIsImportModalOpen(true)}
                className="glass-button flex h-11 items-center gap-2 rounded-xl px-3.5 text-sm font-medium text-emerald-400 hover:text-emerald-300 border border-emerald-500/30 bg-emerald-500/10"
                title="Unggah berkas Excel atau CSV untuk update massal"
              >
                <FileSpreadsheet className="h-4 w-4" />
                <span>Import Excel</span>
              </button>

              <button
                onClick={() => {
                  setEditingProduct(null);
                  setIsCreateEditModalOpen(true);
                }}
                className="flex h-11 items-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-medium text-white shadow-lg shadow-emerald-950/40 hover:bg-emerald-500 transition-colors"
              >
                <Plus className="h-4 w-4" />
                <span>+ Tambah Produk</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Toolbar: Search & Sort Filter */}
      <div className="glass-panel flex flex-col gap-3 rounded-2xl p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nama atau kode produk..."
            className="w-full rounded-xl border border-white/10 bg-zinc-900/60 pl-10 pr-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:border-emerald-500/60 focus:outline-none focus:ring-1 focus:ring-emerald-500/60 transition"
          />
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="sort-filter" className="text-xs font-medium text-zinc-400 shrink-0">
            Urutkan:
          </label>
          <select
            id="sort-filter"
            value={sortOption}
            onChange={(e) =>
              setSortOption(
                e.target.value as
                  | 'name_asc'
                  | 'name_desc'
                  | 'price_asc'
                  | 'price_desc'
                  | 'stock_asc'
                  | 'stock_desc',
              )
            }
            className="rounded-xl border border-white/10 bg-zinc-900/80 px-3 py-2 text-sm text-white focus:border-emerald-500/60 focus:outline-none focus:ring-1 focus:ring-emerald-500/60 transition"
          >
            <option value="name_asc">Nama (A - Z)</option>
            <option value="name_desc">Nama (Z - A)</option>
            <option value="price_asc">Harga (Terendah)</option>
            <option value="price_desc">Harga (Tertinggi)</option>
            <option value="stock_asc">Stok (Tersedikit)</option>
            <option value="stock_desc">Stok (Terbanyak)</option>
          </select>
        </div>
      </div>

      {/* Data Table */}
      <div className="glass-panel overflow-hidden rounded-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-zinc-300">
            <thead className="border-b border-white/5 bg-white/[0.02] text-xs uppercase tracking-wider text-zinc-400 font-semibold">
              <tr>
                <th scope="col" className="px-6 py-4">
                  Kode
                </th>
                <th scope="col" className="px-6 py-4">
                  Nama Produk
                </th>
                <th scope="col" className="px-6 py-4">
                  Harga Satuan
                </th>
                <th scope="col" className="px-6 py-4">
                  Sisa Stok
                </th>
                <th scope="col" className="px-6 py-4">
                  Tanggal Input
                </th>
                {isAdmin && (
                  <th scope="col" className="px-6 py-4 text-right">
                    Aksi
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-normal">
              {isLoading && products.length === 0 ? (
                <tr>
                  <td colSpan={isAdmin ? 6 : 5} className="py-12 text-center text-zinc-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Loader2 className="h-6 w-6 animate-spin text-emerald-500" />
                      <span>Memuat katalog produk...</span>
                    </div>
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={isAdmin ? 6 : 5} className="py-12 text-center text-zinc-500">
                    Tidak ada produk yang ditemukan.
                  </td>
                </tr>
              ) : (
                products.map((product) => {
                  const stockNumber = Number(product.stock);
                  return (
                    <tr
                      key={product.id}
                      className="hover:bg-white/[0.02] transition-colors"
                    >
                      {/* Product Code */}
                      <td className="whitespace-nowrap px-6 py-4">
                        <span className="rounded-lg bg-zinc-800/80 border border-zinc-700/60 px-2.5 py-1 font-mono text-xs font-semibold text-emerald-400">
                          {product.productCode}
                        </span>
                      </td>

                      {/* Product Name */}
                      <td className="whitespace-nowrap px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-zinc-800/80 border border-white/5 text-zinc-400">
                            <Package className="h-4 w-4" />
                          </div>
                          <div>
                            <div className="font-medium text-white">{product.productName}</div>
                            <div className="text-xs text-zinc-500">ID #{product.id}</div>
                          </div>
                        </div>
                      </td>

                      {/* Price */}
                      <td className="whitespace-nowrap px-6 py-4 font-mono font-medium text-white">
                        {formatRupiah(product.price)}
                      </td>

                      {/* Stock Badge */}
                      <td className="whitespace-nowrap px-6 py-4">
                        {stockNumber >= 10 ? (
                          <span className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-400">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                            {stockNumber} Unit
                          </span>
                        ) : stockNumber > 0 ? (
                          <span className="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/20 bg-amber-500/10 px-2.5 py-1 text-xs font-semibold text-amber-400">
                            <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-ping" />
                            {stockNumber}! Menipis
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/20 bg-red-500/10 px-2.5 py-1 text-xs font-semibold text-red-400">
                            <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                            0 Habis
                          </span>
                        )}
                      </td>

                      {/* Created At */}
                      <td className="whitespace-nowrap px-6 py-4 text-xs text-zinc-400">
                        {new Date(product.createdAt).toLocaleDateString('id-ID', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>

                      {/* Actions (Admin Only) */}
                      {isAdmin && (
                        <td className="whitespace-nowrap px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => {
                                setEditingProduct(product);
                                setIsCreateEditModalOpen(true);
                              }}
                              className="glass-button flex h-9 items-center gap-1.5 rounded-xl px-3 text-xs font-medium text-zinc-300 hover:text-white transition"
                              title="Ubah data produk"
                            >
                              <Edit3 className="h-3.5 w-3.5" />
                              <span>Ubah</span>
                            </button>

                            <button
                              onClick={() => setDeleteTargetProduct(product)}
                              className="flex h-9 items-center gap-1.5 rounded-xl border border-red-500/20 bg-red-500/10 px-3 text-xs font-medium text-red-400 hover:bg-red-500/20 transition"
                              title="Hapus produk"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              <span>Hapus</span>
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination & Summary Bar */}
        <div className="flex flex-col gap-3 border-t border-white/5 bg-white/[0.01] px-6 py-3.5 sm:flex-row sm:items-center sm:justify-between text-xs text-zinc-500">
          <div>
            Menampilkan {products.length} dari {paginationMeta.total_items} data produk aktif
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1 || isLoading}
              className="glass-button h-8 rounded-lg px-3 font-medium text-zinc-300 hover:text-white disabled:opacity-40"
            >
              Sebelumnya
            </button>
            <span className="px-2 font-mono text-zinc-400">
              Halaman {paginationMeta.page} / {paginationMeta.total_pages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(paginationMeta.total_pages, p + 1))}
              disabled={currentPage >= paginationMeta.total_pages || isLoading}
              className="glass-button h-8 rounded-lg px-3 font-medium text-zinc-300 hover:text-white disabled:opacity-40"
            >
              Selanjutnya
            </button>
          </div>
        </div>
      </div>

      {/* Modal: Create / Edit Product */}
      {isCreateEditModalOpen && (
        <CreateEditProductModal
          product={editingProduct}
          onClose={() => {
            setIsCreateEditModalOpen(false);
            setEditingProduct(null);
          }}
          onSuccess={(savedProduct, isEdit) => {
            setIsCreateEditModalOpen(false);
            setEditingProduct(null);
            setSuccessMessage(
              isEdit
                ? `Produk ${savedProduct.productName} berhasil diperbarui.`
                : `Produk baru ${savedProduct.productName} berhasil ditambahkan ke katalog.`,
            );
            fetchProducts();
          }}
        />
      )}

      {/* Modal: Import Excel / CSV */}
      {isImportModalOpen && (
        <ImportSpreadsheetModal
          onClose={() => setIsImportModalOpen(false)}
          onSuccess={(summary) => {
            setSuccessMessage(
              `Import massal selesai: ${summary.inserted} produk baru ditambahkan, ${summary.updated} produk diperbarui.`,
            );
            fetchProducts();
          }}
        />
      )}

      {/* Dialog: Delete Product Confirmation */}
      {deleteTargetProduct && (
        <DeleteProductDialog
          product={deleteTargetProduct}
          onClose={() => setDeleteTargetProduct(null)}
          onSuccess={() => {
            const name = deleteTargetProduct.productName;
            setDeleteTargetProduct(null);
            setSuccessMessage(`Produk ${name} berhasil dihapus dari katalog.`);
            fetchProducts();
          }}
        />
      )}
    </div>
  );
}

// ----------------------------------------------------------------------
// MODAL: CREATE / EDIT PRODUCT
// ----------------------------------------------------------------------
interface CreateEditProductModalProps {
  product: ProductItem | null;
  onClose: () => void;
  onSuccess: (product: ProductItem, isEdit: boolean) => void;
}

function CreateEditProductModal({ product, onClose, onSuccess }: CreateEditProductModalProps) {
  const isEdit = !!product;
  const [productCode, setProductCode] = useState(product?.productCode || '');
  const [productName, setProductName] = useState(product?.productName || '');
  const [price, setPrice] = useState(product ? String(Number(product.price)) : '');
  const [stock, setStock] = useState(product ? String(product.stock) : '0');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const priceNum = Number(price);
    const stockNum = Number(stock);

    if (!isEdit && !productCode.trim()) {
      setError('Kode produk wajib diisi');
      return;
    }
    if (!productName.trim()) {
      setError('Nama produk wajib diisi');
      return;
    }
    if (isNaN(priceNum) || priceNum <= 0) {
      setError('Harga produk harus berupa angka lebih besar dari 0');
      return;
    }
    if (isNaN(stockNum) || stockNum < 0 || !Number.isInteger(stockNum)) {
      setError('Stok harus berupa bilangan bulat >= 0');
      return;
    }

    setIsLoading(true);
    try {
      if (isEdit) {
        const response = await apiClient.put(`/products/${product.id}`, {
          product_name: productName.trim(),
          price: priceNum,
          stock: stockNum,
        });
        const saved = response.data.data || response.data;
        onSuccess(saved, true);
      } else {
        const response = await apiClient.post('/products', {
          product_code: productCode.trim().toUpperCase(),
          product_name: productName.trim(),
          price: priceNum,
          stock: stockNum,
        });
        const saved = response.data.data || response.data;
        onSuccess(saved, false);
      }
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { message?: string } } };
      setError(
        errorObj.response?.data?.message || 'Gagal menyimpan produk. Silakan coba kembali.',
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="glass-panel w-full max-w-lg rounded-3xl p-6 sm:p-8 shadow-2xl border border-white/10">
        <div className="flex items-center justify-between pb-4 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Package className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">
                {isEdit ? 'Ubah Data Produk' : 'Tambah Produk Baru'}
              </h2>
              <p className="text-xs text-zinc-400">
                {isEdit ? `Mengubah produk ID #${product.id}` : 'Tambahkan barang dagangan ke inventaris'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-2 text-zinc-400 hover:bg-white/5 hover:text-white transition"
            aria-label="Tutup modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-400">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
              Kode Produk (SKU / Barcode)
            </label>
            <input
              type="text"
              required
              disabled={isEdit}
              maxLength={20}
              value={productCode}
              onChange={(e) => setProductCode(e.target.value.toUpperCase())}
              placeholder="e.g. P0001"
              className="w-full h-11 rounded-xl border border-white/10 bg-zinc-900/70 px-4 font-mono text-sm text-white placeholder-zinc-500 focus:border-emerald-500/60 focus:outline-none focus:ring-1 focus:ring-emerald-500/60 disabled:opacity-50 transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
              Nama Produk Lengkap
            </label>
            <input
              type="text"
              required
              maxLength={150}
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              placeholder="e.g. Hydrococo 150ml"
              className="w-full h-11 rounded-xl border border-white/10 bg-zinc-900/70 px-4 text-sm text-white placeholder-zinc-500 focus:border-emerald-500/60 focus:outline-none focus:ring-1 focus:ring-emerald-500/60 transition"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                Harga Jual Satuan (Rp)
              </label>
              <input
                type="number"
                required
                min={1}
                step={1}
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="12000"
                className="w-full h-11 rounded-xl border border-white/10 bg-zinc-900/70 px-4 text-sm text-white placeholder-zinc-500 focus:border-emerald-500/60 focus:outline-none focus:ring-1 focus:ring-emerald-500/60 transition font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                Sisa Stok Fisik
              </label>
              <input
                type="number"
                required
                min={0}
                step={1}
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                placeholder="0"
                className="w-full h-11 rounded-xl border border-white/10 bg-zinc-900/70 px-4 text-sm text-white placeholder-zinc-500 focus:border-emerald-500/60 focus:outline-none focus:ring-1 focus:ring-emerald-500/60 transition font-mono"
              />
            </div>
          </div>

          <div className="mt-6 flex items-center justify-end gap-3 pt-4 border-t border-white/5">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="glass-button h-11 rounded-xl px-5 text-sm font-medium text-zinc-300 hover:text-white"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex h-11 items-center gap-2 rounded-xl bg-emerald-600 px-6 text-sm font-medium text-white shadow-lg shadow-emerald-950/40 hover:bg-emerald-500 disabled:opacity-50 transition"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Menyimpan...</span>
                </>
              ) : (
                <span>{isEdit ? 'Perbarui Produk' : 'Simpan Produk'}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------
// MODAL: IMPORT SPREADSHEET (IDEMPOTENT EXCEL/CSV)
// ----------------------------------------------------------------------
interface ImportSpreadsheetModalProps {
  onClose: () => void;
  onSuccess: (summary: ImportSummaryData) => void;
}

function ImportSpreadsheetModal({ onClose, onSuccess }: ImportSpreadsheetModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<ImportSummaryData | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const validExtensions = ['.xlsx', '.csv'];
      const hasValidExt = validExtensions.some((ext) => file.name.toLowerCase().endsWith(ext));
      if (!hasValidExt) {
        setError('Format file tidak didukung. Mohon pilih berkas berekstensi .xlsx atau .csv');
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setError('Silakan pilih berkas spreadsheet terlebih dahulu.');
      return;
    }

    setIsUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const response = await apiClient.post('/products/import', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const responseData = response.data.data || response.data;
      setSummary(responseData);
      onSuccess(responseData);
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { message?: string } } };
      setError(
        errorObj.response?.data?.message || 'Gagal memproses file import. Silakan periksa format baris berkas Anda.',
      );
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="glass-panel w-full max-w-xl rounded-3xl p-6 sm:p-8 shadow-2xl border border-white/10">
        <div className="flex items-center justify-between pb-4 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Import Produk Massal</h2>
              <p className="text-xs text-zinc-400">
                Unggah spreadsheet .xlsx atau .csv dengan prinsip idempoten
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-2 text-zinc-400 hover:bg-white/5 hover:text-white transition"
            aria-label="Tutup modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-400">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Drag & Drop Upload Zone */}
        <div
          onClick={() => fileInputRef.current?.click()}
          className="mt-6 flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-emerald-500/30 bg-emerald-500/5 hover:bg-emerald-500/10 p-8 text-center cursor-pointer transition-all"
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".xlsx,.csv"
            className="hidden"
          />
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mb-3">
            <UploadCloud className="h-7 w-7" />
          </div>
          <p className="text-sm font-semibold text-white">
            {selectedFile ? selectedFile.name : 'Pilih berkas spreadsheet (.xlsx atau .csv)'}
          </p>
          <p className="mt-1 text-xs text-zinc-400">
            {selectedFile
              ? `${(selectedFile.size / 1024).toFixed(1)} KB siap diunggah`
              : 'Klik untuk telusuri berkas dari komputer Anda'}
          </p>
        </div>

        {/* Template info */}
        <div className="mt-4 flex items-center justify-between text-xs text-zinc-400">
          <span>Format kolom: [Kode Produk, Nama Produk, Harga, Stok]</span>
          <span className="text-emerald-400">Idempoten: Update jika kode ada</span>
        </div>

        {/* Summary Card if completed */}
        {summary && (
          <div className="mt-5 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 animate-in fade-in">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-emerald-300 mb-2">
              Ringkasan Hasil Import:
            </h3>
            <div className="grid grid-cols-4 gap-2 text-center">
              <div className="glass-panel p-2 rounded-xl">
                <div className="text-xs text-zinc-400">Total Baris</div>
                <div className="font-mono text-base font-bold text-white">{summary.total_rows}</div>
              </div>
              <div className="glass-panel p-2 rounded-xl">
                <div className="text-xs text-emerald-400">Baru (Insert)</div>
                <div className="font-mono text-base font-bold text-emerald-400">{summary.inserted}</div>
              </div>
              <div className="glass-panel p-2 rounded-xl">
                <div className="text-xs text-blue-400">Update</div>
                <div className="font-mono text-base font-bold text-blue-400">{summary.updated}</div>
              </div>
              <div className="glass-panel p-2 rounded-xl">
                <div className="text-xs text-zinc-400">Gagal</div>
                <div className="font-mono text-base font-bold text-zinc-300">{summary.failed}</div>
              </div>
            </div>
          </div>
        )}

        <div className="mt-6 flex items-center justify-end gap-3 pt-4 border-t border-white/5">
          <button
            type="button"
            onClick={onClose}
            disabled={isUploading}
            className="glass-button h-11 rounded-xl px-5 text-sm font-medium text-zinc-300 hover:text-white"
          >
            {summary ? 'Tutup' : 'Batal'}
          </button>
          {!summary && (
            <button
              type="button"
              onClick={handleUpload}
              disabled={isUploading || !selectedFile}
              className="flex h-11 items-center gap-2 rounded-xl bg-emerald-600 px-6 text-sm font-medium text-white shadow-lg shadow-emerald-950/40 hover:bg-emerald-500 disabled:opacity-50 transition"
            >
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Mengunggah...</span>
                </>
              ) : (
                <span>Mulai Proses Import</span>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------
// DIALOG: DELETE PRODUCT (SOFT DELETE CONFIRMATION)
// ----------------------------------------------------------------------
interface DeleteProductDialogProps {
  product: ProductItem;
  onClose: () => void;
  onSuccess: () => void;
}

function DeleteProductDialog({ product, onClose, onSuccess }: DeleteProductDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    setError(null);
    setIsLoading(true);
    try {
      await apiClient.delete(`/products/${product.id}`);
      onSuccess();
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { message?: string } } };
      setError(
        errorObj.response?.data?.message || 'Gagal menghapus produk. Silakan coba kembali.',
      );
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="glass-panel w-full max-w-md rounded-3xl p-6 sm:p-8 shadow-2xl border border-red-500/20">
        <div className="flex items-center gap-3.5 pb-4 border-b border-white/5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-red-500/10 text-red-400 border border-red-500/20">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Hapus Produk</h2>
            <p className="text-xs text-zinc-400">Konfirmasi tindakan soft-delete</p>
          </div>
        </div>

        {error && (
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-400">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="mt-4 space-y-3">
          <p className="text-sm text-zinc-300 leading-relaxed">
            Yakin ingin menghapus produk <span className="font-semibold text-white">{product.productName}</span> (<span className="font-mono text-emerald-400">{product.productCode}</span>)?
          </p>
          <div className="rounded-2xl bg-red-500/5 border border-red-500/10 p-3 text-xs text-red-300/90 leading-relaxed">
            Produk tidak akan bisa dipilih lagi untuk transaksi kasir baru, namun seluruh histori transaksi penjualan lampau tetap aman dan utuh.
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-3 pt-4 border-t border-white/5">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="glass-button h-11 rounded-xl px-5 text-sm font-medium text-zinc-300 hover:text-white"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={isLoading}
            className="flex h-11 items-center gap-2 rounded-xl bg-red-600 px-6 text-sm font-medium text-white shadow-lg shadow-red-950/40 hover:bg-red-500 disabled:opacity-50 transition"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Menghapus...</span>
              </>
            ) : (
              <span>Ya, Hapus Produk</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
