import React, { useState, useMemo, useEffect } from 'react';
import { Search, Package, Loader2, RefreshCw, X, Filter } from 'lucide-react';
import type { ProductItem } from '@titipin/shared';
import { ProductCard } from './product-card';
import type { CartItem } from '../../hooks/use-pos-cart';

export interface PosCatalogProps {
  products: ProductItem[];
  isLoading: boolean;
  cartItems: CartItem[];
  onAddToCart: (product: ProductItem) => void;
  onRefresh?: () => void;
  searchInputRef?: React.RefObject<HTMLInputElement | null>;
}

export function PosCatalog({
  products,
  isLoading,
  cartItems,
  onAddToCart,
  onRefresh,
  searchInputRef,
}: PosCatalogProps) {
  const [searchInput, setSearchInput] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'ALL' | 'IN_STOCK' | 'LOW_STOCK'>('ALL');

  // Debounce search query to prevent excessive re-renders / filtering on every keystroke
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchInput);
    }, 200);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const handleClearSearch = () => {
    setSearchInput('');
    setDebouncedQuery('');
    searchInputRef?.current?.focus();
  };

  const cartQuantityMap = useMemo(() => {
    const map = new Map<number, number>();
    for (const item of cartItems) {
      map.set(item.product.id, item.quantity);
    }
    return map;
  }, [cartItems]);

  const filteredProducts = useMemo(() => {
    return products.filter((prod) => {
      // Search matching code or name
      const query = debouncedQuery.toLowerCase().trim();
      if (query) {
        const name = (prod.productName || prod.product_name || '').toLowerCase();
        const code = (prod.productCode || prod.product_code || '').toLowerCase();
        if (!name.includes(query) && !code.includes(query)) {
          return false;
        }
      }

      // Stock status filter
      if (filterMode === 'IN_STOCK') {
        return prod.stock > 0;
      }
      if (filterMode === 'LOW_STOCK') {
        return prod.stock > 0 && prod.stock < 5;
      }

      return true;
    });
  }, [products, debouncedQuery, filterMode]);

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* Header controls: Search & Filters */}
      <div className="glass-panel p-3.5 sm:p-4 space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          {/* Search Bar */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Cari nama produk atau kode barang... [F2]"
              className="glass-input w-full pl-10 pr-9 py-2 text-sm rounded-xl"
            />
            {searchInput && (
              <button
                type="button"
                onClick={handleClearSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                aria-label="Hapus pencarian"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              disabled={isLoading}
              className="glass-button flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:text-emerald-700"
              title="Perbarui data produk"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Segarkan</span>
            </button>
          )}
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
          <span className="flex items-center gap-1 text-slate-500 font-medium shrink-0">
            <Filter className="h-3.5 w-3.5 text-slate-400" />
            <span>Filter:</span>
          </span>

          <button
            type="button"
            onClick={() => setFilterMode('ALL')}
            className={`rounded-full px-3 py-1 font-semibold transition-all shrink-0 ${
              filterMode === 'ALL'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'bg-white/80 border border-slate-200 text-slate-600 hover:bg-slate-100'
            }`}
          >
            Semua ({products.length})
          </button>

          <button
            type="button"
            onClick={() => setFilterMode('IN_STOCK')}
            className={`rounded-full px-3 py-1 font-semibold transition-all shrink-0 ${
              filterMode === 'IN_STOCK'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'bg-white/80 border border-slate-200 text-slate-600 hover:bg-slate-100'
            }`}
          >
            Stok Tersedia
          </button>

          <button
            type="button"
            onClick={() => setFilterMode('LOW_STOCK')}
            className={`rounded-full px-3 py-1 font-semibold transition-all shrink-0 ${
              filterMode === 'LOW_STOCK'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'bg-white/80 border border-slate-200 text-slate-600 hover:bg-slate-100'
            }`}
          >
            Stok Menipis (&lt; 5)
          </button>
        </div>
      </div>

      {/* Product Catalog Grid */}
      <div className="flex-1 overflow-y-auto min-h-[300px]">
        {isLoading ? (
          <div className="flex h-64 flex-col items-center justify-center gap-3 text-slate-500">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-700" />
            <p className="text-sm font-medium">Memuat katalog produk...</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="glass-panel flex h-64 flex-col items-center justify-center gap-3 p-6 text-center text-slate-500">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
              <Package className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-700">Tidak ada produk ditemukan</p>
              <p className="text-xs text-slate-500 mt-0.5">
                {(debouncedQuery || searchInput)
                  ? `Tidak ada hasil yang cocok dengan "${debouncedQuery || searchInput}"`
                  : 'Belum ada produk terdaftar dalam katalog'}
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
            {filteredProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                cartQuantity={cartQuantityMap.get(product.id) || 0}
                onAddToCart={onAddToCart}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
