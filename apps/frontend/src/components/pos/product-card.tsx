import React from 'react';
import { Plus, Package, ShoppingCart } from 'lucide-react';
import type { ProductItem } from '@titipin/shared';
import { Badge } from '../ui/badge';
import { formatCurrency } from '../../lib/utils';

export interface ProductCardProps {
  product: ProductItem;
  cartQuantity: number;
  onAddToCart: (product: ProductItem) => void;
}

export function ProductCard({ product, cartQuantity, onAddToCart }: ProductCardProps) {
  const isOutOfStock = product.stock <= 0;
  const isLowStock = product.stock > 0 && product.stock < 5;

  return (
    <div
      onClick={() => {
        if (!isOutOfStock) {
          onAddToCart(product);
        }
      }}
      className={`glass-card group relative flex flex-col justify-between p-3.5 sm:p-4 select-none transition-all ${
        isOutOfStock
          ? 'cursor-not-allowed opacity-60'
          : 'cursor-pointer hover:border-emerald-500/40 hover:shadow-md'
      }`}
    >
      {/* Top row: stock badge & cart indicator */}
      <div className="flex items-center justify-between gap-1.5">
        {isOutOfStock ? (
          <Badge variant="destructive" className="px-2 py-0.5 text-[10px]">
            Stok Habis
          </Badge>
        ) : isLowStock ? (
          <Badge variant="warning" className="px-2 py-0.5 text-[10px]">
            Sisa {product.stock}
          </Badge>
        ) : (
          <Badge variant="success" className="px-2 py-0.5 text-[10px]">
            Stok {product.stock}
          </Badge>
        )}

        {cartQuantity > 0 && (
          <span className="flex items-center gap-1 rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-bold text-white shadow-xs">
            <ShoppingCart className="h-3 w-3" />
            <span>{cartQuantity}</span>
          </span>
        )}
      </div>

      {/* Middle row: Code & Name */}
      <div className="my-3 flex-1 space-y-1">
        <div className="flex items-center gap-1.5 text-[11px] font-mono text-slate-500">
          <Package className="h-3 w-3 shrink-0 text-slate-400" />
          <span className="truncate">{product.productCode || product.product_code}</span>
        </div>
        <h4 className="line-clamp-2 text-sm font-semibold text-slate-900 group-hover:text-emerald-700">
          {product.productName || product.product_name}
        </h4>
      </div>

      {/* Bottom row: Price & Quick Add Button */}
      <div className="mt-2 flex items-center justify-between pt-2 border-t border-slate-100">
        <div>
          <span className="text-xs text-slate-500 block">Harga</span>
          <span className="text-sm sm:text-base font-bold text-emerald-700">
            {formatCurrency(Number(product.price))}
          </span>
        </div>

        <button
          type="button"
          disabled={isOutOfStock}
          onClick={(e) => {
            e.stopPropagation();
            if (!isOutOfStock) {
              onAddToCart(product);
            }
          }}
          className={`flex h-8 w-8 items-center justify-center rounded-xl transition-all ${
            isOutOfStock
              ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
              : 'bg-emerald-600 text-white shadow-xs hover:bg-emerald-700 active:scale-95'
          }`}
          aria-label={`Tambah ${product.productName || product.product_name}`}
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
