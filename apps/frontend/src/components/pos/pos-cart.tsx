import React from 'react';
import {
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  Clock,
  Banknote,
  Cake,
} from 'lucide-react';
import type { CustomerItem } from '@titipin/shared';
import { formatCurrency } from '../../lib/utils';
import { CustomerSelector } from './customer-selector';
import type { CartItem } from '../../hooks/use-pos-cart';

export interface PosCartProps {
  items: CartItem[];
  customerType: 'WALK_IN' | 'MEMBER';
  selectedCustomer: CustomerItem | null;
  subtotal: number;
  birthdayDiscount: number;
  totalAmount: number;
  totalItemsCount: number;
  isHolding?: boolean;
  hasHeldDraft?: boolean;
  onSelectCustomerType: (type: 'WALK_IN' | 'MEMBER') => void;
  onSelectCustomer: (customer: CustomerItem | null) => void;
  onOpenNewMemberModal: () => void;
  onUpdateQuantity: (productId: number, quantity: number) => void;
  onRemoveItem: (productId: number) => void;
  onClearCart: () => void;
  onHoldCart: () => void;
  onOpenHeldDrawer: () => void;
  onProceedPayment: () => void;
}

export function PosCart({
  items,
  customerType,
  selectedCustomer,
  subtotal,
  birthdayDiscount,
  totalAmount,
  totalItemsCount,
  isHolding = false,
  hasHeldDraft = false,
  onSelectCustomerType,
  onSelectCustomer,
  onOpenNewMemberModal,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  onHoldCart,
  onOpenHeldDrawer,
  onProceedPayment,
}: PosCartProps) {
  const isCartEmpty = items.length === 0;

  return (
    <div className="glass-panel flex flex-col h-full p-4 sm:p-5 justify-between">
      {/* Top Header & Customer Selection */}
      <div className="space-y-3.5">
        <div className="flex items-center justify-between border-b border-slate-200/80 pb-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800">
              <ShoppingCart className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm sm:text-base">Keranjang Kasir</h3>
              <p className="text-[11px] text-slate-500">{totalItemsCount} item terpilih</p>
            </div>
          </div>

          {!isCartEmpty && (
            <button
              type="button"
              onClick={onClearCart}
              className="flex items-center gap-1 text-xs text-rose-600 hover:text-rose-800 font-medium px-2 py-1 rounded-lg hover:bg-rose-50 transition-colors"
              title="Kosongkan seluruh keranjang"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Kosongkan</span>
            </button>
          )}
        </div>

        {/* Customer Selector */}
        <CustomerSelector
          customerType={customerType}
          selectedCustomer={selectedCustomer}
          onSelectCustomerType={onSelectCustomerType}
          onSelectCustomer={onSelectCustomer}
          onOpenNewMemberModal={onOpenNewMemberModal}
        />
      </div>

      {/* Middle: Cart Line Items List */}
      <div className="my-3 flex-1 overflow-y-auto max-h-[380px] lg:max-h-[calc(100vh-480px)] space-y-2 pr-1">
        {isCartEmpty ? (
          <div className="flex h-48 flex-col items-center justify-center gap-2 text-center text-slate-400">
            {hasHeldDraft ? (
              <div className="w-full max-w-[280px] rounded-xl border border-amber-300 bg-amber-50/90 p-3.5 space-y-2 text-center animate-in fade-in">
                <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-amber-900">
                  <Clock className="h-4 w-4 text-amber-700 animate-pulse" />
                  <span>Ada 1 Transaksi Tertahan</span>
                </div>
                <p className="text-[11px] text-amber-800">
                  Anda memiliki transaksi sebelumnya yang disimpan sementara.
                </p>
                <button
                  type="button"
                  onClick={onOpenHeldDrawer}
                  className="w-full rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-amber-700 transition-colors shadow-xs"
                >
                  Buka & Lanjutkan Transaksi
                </button>
              </div>
            ) : (
              <>
                <ShoppingCart className="h-10 w-10 text-slate-300" />
                <p className="text-xs font-semibold text-slate-600">Keranjang masih kosong</p>
                <p className="text-[11px] text-slate-400 max-w-[200px]">
                  Klik produk dari katalog di sebelah kiri untuk menambahkan barang.
                </p>
              </>
            )}
          </div>
        ) : (
          items.map(({ product, quantity }) => {
            const isMaxStock = quantity >= product.stock;
            const itemSubtotal = Number(product.price) * quantity;

            return (
              <div
                key={product.id}
                className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white/70 p-2.5 text-xs shadow-2xs hover:border-emerald-300 transition-colors"
              >
                {/* Product Name & Unit Price */}
                <div className="min-w-0 flex-1">
                  <h5 className="font-semibold text-slate-900 truncate">
                    {product.productName || product.product_name}
                  </h5>
                  <p className="text-[11px] text-slate-500">
                    {formatCurrency(Number(product.price))} / pcs
                  </p>
                </div>

                {/* Quantity Stepper */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => onUpdateQuantity(product.id, quantity - 1)}
                    className="flex h-6 w-6 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 active:scale-95 transition-all"
                    aria-label={`Kurangi kuantitas ${product.productName || product.product_name}`}
                  >
                    <Minus className="h-3 w-3" />
                  </button>

                  <span className="w-6 text-center font-bold text-slate-900 text-xs">
                    {quantity}
                  </span>

                  <button
                    type="button"
                    disabled={isMaxStock}
                    onClick={() => onUpdateQuantity(product.id, quantity + 1)}
                    className={`flex h-6 w-6 items-center justify-center rounded-lg border transition-all ${
                      isMaxStock
                        ? 'border-slate-200 bg-slate-100 text-slate-300 cursor-not-allowed'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100 active:scale-95'
                    }`}
                    aria-label={`Tambah kuantitas ${product.productName || product.product_name}`}
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                </div>

                {/* Line Item Total & Remove */}
                <div className="flex items-center gap-2 shrink-0">
                  <span className="font-bold text-slate-900 text-xs w-20 text-right">
                    {formatCurrency(itemSubtotal)}
                  </span>

                  <button
                    type="button"
                    onClick={() => onRemoveItem(product.id)}
                    className="rounded-lg p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                    aria-label={`Hapus ${product.productName || product.product_name}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Bottom Summary & Actions */}
      <div className="space-y-3 border-t border-slate-200/80 pt-3">
        {/* Price Breakdown */}
        <div className="space-y-1.5 text-xs">
          <div className="flex items-center justify-between text-slate-600">
            <span>Subtotal</span>
            <span className="font-semibold text-slate-900">{formatCurrency(subtotal)}</span>
          </div>

          {birthdayDiscount > 0 && (
            <div className="flex items-center justify-between font-semibold text-amber-700 bg-amber-50 rounded-lg p-1.5">
              <span className="flex items-center gap-1">
                <Cake className="h-3.5 w-3.5" />
                <span>Diskon Ulang Tahun (5%)</span>
              </span>
              <span>-{formatCurrency(birthdayDiscount)}</span>
            </div>
          )}

          <div className="flex items-center justify-between pt-1 border-t border-slate-200">
            <span className="text-sm font-bold text-slate-900">Total Tagihan</span>
            <span className="text-lg sm:text-xl font-extrabold text-emerald-700">
              {formatCurrency(totalAmount)}
            </span>
          </div>
        </div>

        {/* Action Buttons Row */}
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={isCartEmpty || isHolding}
              onClick={onHoldCart}
              className={`glass-button flex items-center justify-center gap-1.5 py-2 text-xs font-semibold ${
                isCartEmpty || isHolding
                  ? 'opacity-50 cursor-not-allowed text-slate-400'
                  : 'text-amber-800 hover:bg-amber-100 hover:border-amber-300'
              }`}
            >
              <Clock className="h-3.5 w-3.5" />
              <span>{isHolding ? 'Menahan...' : 'Tahan Transaksi'}</span>
            </button>

            <button
              type="button"
              onClick={onOpenHeldDrawer}
              className="glass-button relative flex items-center justify-center gap-1.5 py-2 text-xs font-semibold text-slate-700 hover:text-emerald-800"
            >
              <Clock className="h-3.5 w-3.5 text-slate-500" />
              <span>Daftar Tertahan</span>
              {hasHeldDraft && (
                <span className="flex h-2 w-2 rounded-full bg-amber-500 animate-ping absolute top-1.5 right-1.5" />
              )}
            </button>
          </div>

          {/* Primary Checkout Button */}
          <button
            type="button"
            disabled={isCartEmpty}
            onClick={onProceedPayment}
            className={`flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold text-white shadow-md transition-all ${
              isCartEmpty
                ? 'bg-slate-300 cursor-not-allowed shadow-none'
                : 'bg-emerald-700 hover:bg-emerald-800 active:scale-[0.99]'
            }`}
          >
            <Banknote className="h-4 w-4" />
            <span>Bayar Sekarang ({formatCurrency(totalAmount)})</span>
          </button>
        </div>
      </div>
    </div>
  );
}
