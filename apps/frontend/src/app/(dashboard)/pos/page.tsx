'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Banknote,
  Clock,
  Printer,
  CheckCircle2,
  X,
  User,
  Plus,
  AlertCircle,
  Trash2,
  Loader2,
  ShoppingCart,
  FileText,
  Image as ImageIcon,
} from 'lucide-react';
import type { ProductItem, CustomerItem } from '@titipin/shared';
import { apiClient } from '../../../lib/api-client';
import { formatCurrency } from '../../../lib/utils';
import {
  downloadReceiptAsPdf,
  downloadReceiptAsImage,
} from '../../../lib/receipt-download';
import { useAuth } from '../../../hooks/use-auth';
import { usePosCart, type CartItem } from '../../../hooks/use-pos-cart';
import { PosCatalog } from '../../../components/pos/pos-catalog';
import { PosCart } from '../../../components/pos/pos-cart';

interface HeldDraftItem {
  productId?: number;
  product_id?: number;
  productName?: string;
  product_name?: string;
  productCode?: string;
  product_code?: string;
  price?: string | number;
  quantity: number;
}

interface HeldDraftData {
  id?: number;
  customer?: {
    id?: string;
    customerName?: string;
    customer_name?: string;
  } | null;
  items: HeldDraftItem[];
}

interface CompletedReceiptData {
  id?: number;
  orderNumber?: string;
  order_number?: string;
  invoiceNumber?: string;
  invoice_number?: string;
  orderDate?: string;
  order_date?: string;
  items: CartItem[];
  total_paid: number;
  change_amount: number;
  birthday_discount: number;
  customer: CustomerItem | null;
  cashier_name: string;
  subtotal?: number;
  total_amount?: string | number;
  totalAmount?: string | number;
}

interface ApiErrorResponse {
  response?: {
    data?: {
      message?: string;
      errors?: Record<string, string[]>;
    };
  };
}

export default function PosPage() {
  const { user } = useAuth();
  const cart = usePosCart();

  const [products, setProducts] = useState<ProductItem[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [productError, setProductError] = useState<string | null>(null);

  // Modals & Drawers state
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [cashGiven, setCashGiven] = useState<string>('');
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  // Draft / Held Cart state
  const [isHoldingCart, setIsHoldingCart] = useState(false);
  const [hasHeldDraft, setHasHeldDraft] = useState(false);
  const [heldDraftData, setHeldDraftData] = useState<HeldDraftData | null>(null);
  const [isHeldDrawerOpen, setIsHeldDrawerOpen] = useState(false);
  const [isLoadingDraft, setIsLoadingDraft] = useState(false);

  // New Member Modal (Quick Add from POS)
  const [isNewMemberModalOpen, setIsNewMemberModalOpen] = useState(false);
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberPhone, setNewMemberPhone] = useState('');
  const [newMemberBirthDate, setNewMemberBirthDate] = useState('');
  const [newMemberAddress, setNewMemberAddress] = useState('');
  const [newMemberGender, setNewMemberGender] = useState<'Pria' | 'Wanita'>('Pria');
  const [isSavingMember, setIsSavingMember] = useState(false);
  const [newMemberError, setNewMemberError] = useState<string | null>(null);

  // Receipt Modal
  const [completedOrder, setCompletedOrder] = useState<CompletedReceiptData | null>(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [receiptPaperSize, setReceiptPaperSize] = useState<'58mm' | '80mm'>('80mm');

  // Keyboard Shortcuts Refs
  const searchInputRef = useRef<HTMLInputElement>(null);
  const customerSearchInputRef = useRef<HTMLInputElement>(null);

  // Restore paper size preference from localStorage
  useEffect(() => {
    try {
      const savedSize = localStorage.getItem('titipin_receipt_paper_size') as '58mm' | '80mm' | null;
      if (savedSize === '58mm' || savedSize === '80mm') {
        setReceiptPaperSize(savedSize);
      }
    } catch {
      // Ignore localStorage errors
    }
  }, []);

  const handlePaperSizeChange = (size: '58mm' | '80mm') => {
    setReceiptPaperSize(size);
    try {
      localStorage.setItem('titipin_receipt_paper_size', size);
    } catch {
      // Ignore localStorage errors
    }
  };

  // 1. Fetch Products Catalog
  const fetchProducts = useCallback(async () => {
    setIsLoadingProducts(true);
    setProductError(null);
    try {
      const res = await apiClient.get('/products', {
        params: { limit: 100, page: 1 },
      });
      const data = res.data?.data || res.data || [];
      setProducts(data);
    } catch {
      setProductError('Gagal memuat katalog produk. Periksa koneksi backend.');
    } finally {
      setIsLoadingProducts(false);
    }
  }, []);

  // 2. Check active held draft order for current cashier
  const checkHeldDraft = useCallback(async () => {
    try {
      const res = await apiClient.get('/orders/draft');
      const draft = res.data?.data;
      if (draft && draft.items && draft.items.length > 0) {
        setHasHeldDraft(true);
        setHeldDraftData(draft);
      } else {
        setHasHeldDraft(false);
        setHeldDraftData(null);
      }
    } catch {
      setHasHeldDraft(false);
      setHeldDraftData(null);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
    checkHeldDraft();
  }, [fetchProducts, checkHeldDraft]);

  // Payment Calculations
  const numericCash = Number(cashGiven) || 0;
  const changeAmount = useMemo(() => {
    return Math.max(0, numericCash - cart.totalAmount);
  }, [numericCash, cart.totalAmount]);
  const isCashSufficient = numericCash >= cart.totalAmount;

  // Open Payment Modal
  const handleOpenPayment = () => {
    if (cart.items.length === 0) return;
    setCashGiven(String(cart.totalAmount)); // default to exact amount
    setCheckoutError(null);
    setIsPaymentModalOpen(true);
  };

  // Submit Checkout Transaction (POST /api/orders/checkout or /api/orders)
  const handleConfirmPayment = async () => {
    if (!isCashSufficient) {
      setCheckoutError('Nominal pembayaran tunai kurang dari total tagihan.');
      return;
    }

    setIsSubmittingOrder(true);
    setCheckoutError(null);

    try {
      const payload = {
        customer_id:
          cart.customerType === 'MEMBER' && cart.selectedCustomer?.id
            ? cart.selectedCustomer.id
            : null,
        items: cart.items.map((it) => ({
          product_id: it.product.id,
          quantity: it.quantity,
        })),
        payment_method: 'CASH',
        total_paid: numericCash,
      };

      const response = await apiClient.post('/orders', payload);
      const created = response.data?.data || response.data;

      // Close payment modal, record completed order, open receipt
      setIsPaymentModalOpen(false);
      setCompletedOrder({
        ...created,
        items: cart.items,
        total_paid: numericCash,
        change_amount: changeAmount,
        birthday_discount: cart.birthdayDiscount,
        customer: cart.selectedCustomer,
        cashier_name: user?.name || 'Kasir',
      });
      setIsReceiptModalOpen(true);

      // Reset cart and refresh product stock
      cart.resetAll();
      fetchProducts();
      window.dispatchEvent(new CustomEvent('held-draft-changed', { detail: null }));
    } catch (err: unknown) {
      const apiErr = err as ApiErrorResponse;
      const resData = apiErr.response?.data;
      let msg = resData?.message || 'Gagal memproses transaksi checkout. Stok barang mungkin tidak mencukupi.';
      if (resData?.errors && typeof resData.errors === 'object') {
        const errorDetails = Object.values(resData.errors).flat();
        if (errorDetails.length > 0) {
          msg = `${msg}: ${errorDetails.join('; ')}`;
        }
      }
      setCheckoutError(msg);
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  // Hold Current Cart (POST /api/orders/hold)
  const handleHoldCart = async () => {
    if (cart.items.length === 0) return;
    setIsHoldingCart(true);
    try {
      const payload = {
        customer_id:
          cart.customerType === 'MEMBER' && cart.selectedCustomer?.id
            ? cart.selectedCustomer.id
            : null,
        items: cart.items.map((it) => ({
          product_id: it.product.id,
          quantity: it.quantity,
        })),
        note: `Ditahan oleh ${user?.name || 'Kasir'} pada ${new Date().toLocaleTimeString('id-ID')}`,
      };

      await apiClient.post('/orders/hold', payload);
      cart.resetAll();
      await checkHeldDraft();
      window.dispatchEvent(new CustomEvent('held-draft-changed'));
    } catch (err: unknown) {
      const apiErr = err as ApiErrorResponse;
      alert(
        apiErr.response?.data?.message ||
          'Gagal menahan transaksi. Anda mungkin sudah memiliki transaksi yang tertahan.',
      );
    } finally {
      setIsHoldingCart(false);
    }
  };

  // Keyboard Shortcuts (F1: Pay, F2: Search, F3: Member, F4: Hold, Esc: Cancel/Close)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F1') {
        e.preventDefault();
        if (cart.items.length > 0 && !isPaymentModalOpen && !isReceiptModalOpen && !isNewMemberModalOpen) {
          handleOpenPayment();
        }
      } else if (e.key === 'F2') {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      } else if (e.key === 'F3') {
        e.preventDefault();
        if (cart.customerType === 'WALK_IN') {
          cart.setCustomerType('MEMBER');
          setTimeout(() => {
            customerSearchInputRef.current?.focus();
          }, 50);
        } else {
          customerSearchInputRef.current?.focus();
          customerSearchInputRef.current?.select();
        }
      } else if (e.key === 'F4') {
        e.preventDefault();
        if (cart.items.length > 0 && !isHoldingCart) {
          handleHoldCart();
        }
      } else if (e.key === 'Escape') {
        if (isPaymentModalOpen) {
          e.preventDefault();
          setIsPaymentModalOpen(false);
        } else if (isReceiptModalOpen) {
          e.preventDefault();
          setIsReceiptModalOpen(false);
        } else if (isNewMemberModalOpen) {
          e.preventDefault();
          setIsNewMemberModalOpen(false);
        } else if (isHeldDrawerOpen) {
          e.preventDefault();
          setIsHeldDrawerOpen(false);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    cart,
    isPaymentModalOpen,
    isReceiptModalOpen,
    isNewMemberModalOpen,
    isHeldDrawerOpen,
    isHoldingCart,
  ]);

  // Open Held Drafts Drawer
  const handleOpenHeldDrawer = async () => {
    setIsLoadingDraft(true);
    setIsHeldDrawerOpen(true);
    await checkHeldDraft();
    setIsLoadingDraft(false);
  };

  // Helper to load draft data into active POS cart
  const restoreDraftToCart = useCallback(
    (draft: HeldDraftData) => {
      const restoredItems = (draft.items || []).map((it: HeldDraftItem) => {
        const matched = products.find((p) => p.id === it.productId || p.id === it.product_id);
        const productObj: ProductItem = matched || {
          id: (it.productId || it.product_id || 0) as number,
          productCode: it.productCode || it.product_code || 'P0000',
          productName: it.productName || it.product_name || 'Produk',
          product_code: it.productCode || it.product_code || 'P0000',
          product_name: it.productName || it.product_name || 'Produk',
          price: String(it.price || '0'),
          stock: 99,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          deletedAt: null,
          deleted_at: null,
        };
        return {
          product: productObj,
          quantity: it.quantity,
        };
      });

      const customerObj = (draft.customer as unknown as CustomerItem) || null;
      cart.loadDraft(customerObj, restoredItems);

      // Discard server draft since it is now active on POS terminal
      apiClient.delete('/orders/draft').catch(() => {});
      setHasHeldDraft(false);
      setHeldDraftData(null);
      setIsHeldDrawerOpen(false);
      window.dispatchEvent(new CustomEvent('held-draft-changed', { detail: null }));
    },
    [products, cart],
  );

  // Resume Draft Order
  const handleResumeDraft = () => {
    if (!heldDraftData) return;
    restoreDraftToCart(heldDraftData);
  };

  // Discard Draft Order
  const handleDiscardDraft = async () => {
    if (!confirm('Hapus transaksi tertahan ini secara permanen?')) return;
    try {
      await apiClient.delete('/orders/draft');
      setHasHeldDraft(false);
      setHeldDraftData(null);
      setIsHeldDrawerOpen(false);
      window.dispatchEvent(new CustomEvent('held-draft-changed', { detail: null }));
    } catch {
      alert('Gagal menghapus transaksi tertahan.');
    }
  };

  // Sync with Navbar and URL ?resume=true
  useEffect(() => {
    const handleResumeEvent = (e: Event) => {
      const customEvent = e as CustomEvent<HeldDraftData | null>;
      if (customEvent.detail) {
        restoreDraftToCart(customEvent.detail);
      }
    };

    const handleDraftChangedEvent = () => {
      checkHeldDraft();
    };

    window.addEventListener('held-draft-resume', handleResumeEvent);
    window.addEventListener('held-draft-changed', handleDraftChangedEvent);

    if (typeof window !== 'undefined' && window.location.search.includes('resume=true')) {
      apiClient
        .get('/orders/draft')
        .then((res) => {
          const draft = res.data?.data;
          if (draft && draft.items && draft.items.length > 0) {
            restoreDraftToCart(draft);
            window.history.replaceState({}, '', '/pos');
          }
        })
        .catch(() => {});
    }

    return () => {
      window.removeEventListener('held-draft-resume', handleResumeEvent);
      window.removeEventListener('held-draft-changed', handleDraftChangedEvent);
    };
  }, [restoreDraftToCart, checkHeldDraft]);

  // Create & Register New Member on-the-fly
  const handleCreateNewMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberName.trim() || !newMemberPhone.trim()) {
      setNewMemberError('Nama dan nomor telepon wajib diisi.');
      return;
    }

    setIsSavingMember(true);
    setNewMemberError(null);
    try {
      const payload = {
        customer_name: newMemberName.trim(),
        phone: newMemberPhone.trim(),
        gender: newMemberGender,
        birth_date: newMemberBirthDate.trim() || null,
        customer_address: newMemberAddress.trim() || 'Bogor',
      };
      const res = await apiClient.post('/customers', payload);
      const newCust = res.data?.data || res.data;

      // Automatically attach as active customer
      cart.setCustomer(newCust);

      // Reset modal
      setNewMemberName('');
      setNewMemberPhone('');
      setNewMemberBirthDate('');
      setNewMemberAddress('');
      setIsNewMemberModalOpen(false);
    } catch (err: unknown) {
      const apiErr = err as ApiErrorResponse;
      setNewMemberError(
        apiErr.response?.data?.message || 'Gagal mendaftarkan pelanggan baru.',
      );
    } finally {
      setIsSavingMember(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-5.5rem)] gap-3">
      {/* Top Banner / Error notice */}
      {productError && (
        <div className="flex items-center gap-2 rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-2.5 text-xs font-medium text-rose-300">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{productError}</span>
        </div>
      )}

      {/* POS Keyboard Shortcuts Bar */}
      <div className="hidden sm:flex items-center justify-between px-3 py-1.5 rounded-xl bg-slate-100/90 border border-slate-200/80 text-[11px] text-slate-600 no-print">
        <span className="font-semibold text-slate-700 flex items-center gap-1.5">
          <kbd className="px-1.5 py-0.5 rounded bg-white shadow-xs border border-slate-300 font-mono text-[10px] text-slate-800 font-bold">Shortcut Kasir</kbd>
        </span>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 rounded bg-white shadow-xs border border-slate-300 font-mono text-[10px] font-bold text-slate-800">F1</kbd>
            Bayar
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 rounded bg-white shadow-xs border border-slate-300 font-mono text-[10px] font-bold text-slate-800">F2</kbd>
            Cari Produk
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 rounded bg-white shadow-xs border border-slate-300 font-mono text-[10px] font-bold text-slate-800">F3</kbd>
            Pilih Member
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 rounded bg-white shadow-xs border border-slate-300 font-mono text-[10px] font-bold text-slate-800">F4</kbd>
            Tahan
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 rounded bg-white shadow-xs border border-slate-300 font-mono text-[10px] font-bold text-slate-800">Esc</kbd>
            Batal
          </span>
        </div>
      </div>

      {/* Main Split Screen Interface */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1 min-h-0">
        {/* Left Column: Products Catalog (7 cols on lg, full on mobile) */}
        <div className="lg:col-span-7 flex flex-col min-h-0 h-full">
          <PosCatalog
            products={products}
            isLoading={isLoadingProducts}
            cartItems={cart.items}
            onAddToCart={cart.addItem}
            onRefresh={fetchProducts}
            searchInputRef={searchInputRef}
          />
        </div>

        {/* Right Column: POS Cart & Checkout Panel (5 cols on lg) */}
        <div className="lg:col-span-5 flex flex-col min-h-0 h-full">
          <PosCart
            items={cart.items}
            customerType={cart.customerType}
            selectedCustomer={cart.selectedCustomer}
            subtotal={cart.subtotal}
            birthdayDiscount={cart.birthdayDiscount}
            totalAmount={cart.totalAmount}
            totalItemsCount={cart.totalItemsCount}
            isHolding={isHoldingCart}
            hasHeldDraft={hasHeldDraft}
            customerSearchInputRef={customerSearchInputRef}
            onSelectCustomerType={cart.setCustomerType}
            onSelectCustomer={cart.setCustomer}
            onOpenNewMemberModal={() => setIsNewMemberModalOpen(true)}
            onUpdateQuantity={cart.updateQuantity}
            onRemoveItem={cart.removeItem}
            onClearCart={cart.clearCart}
            onHoldCart={handleHoldCart}
            onOpenHeldDrawer={handleOpenHeldDrawer}
            onProceedPayment={handleOpenPayment}
          />
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: Payment Checkout & Keypad (Tunai / Cash)                        */}
      {/* ========================================================================= */}
      {isPaymentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in">
          <div className="glass-panel w-full max-w-lg p-6 space-y-5 rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-slate-900">
                <Banknote className="h-5 w-5 text-emerald-700" />
                <h3 className="text-base font-bold">Pembayaran Tunai</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsPaymentModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Total Summary */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-2">
              <div className="flex justify-between text-xs text-slate-600">
                <span>Subtotal ({cart.totalItemsCount} barang)</span>
                <span>{formatCurrency(cart.subtotal)}</span>
              </div>
              {cart.birthdayDiscount > 0 && (
                <div className="flex justify-between text-xs font-semibold text-emerald-800">
                  <span>Diskon Ulang Tahun (5%)</span>
                  <span>-{formatCurrency(cart.birthdayDiscount)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-bold text-slate-900 pt-2 border-t border-slate-200">
                <span>Total Wajib Bayar</span>
                <span className="text-lg font-extrabold text-emerald-700">
                  {formatCurrency(cart.totalAmount)}
                </span>
              </div>
            </div>

            {/* Cash Input */}
            <div className="space-y-2">
              <label htmlFor="cash-given-input" className="block text-xs font-bold text-slate-700">
                Nominal Tunai Diterima (Rp)
              </label>
              <div className="relative">
                <input
                  id="cash-given-input"
                  type="number"
                  min={0}
                  value={cashGiven}
                  onChange={(e) => setCashGiven(e.target.value)}
                  placeholder="0"
                  className="glass-input w-full text-xl font-bold text-slate-900 py-3 pl-4 pr-12 rounded-xl focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setCashGiven('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 hover:text-slate-700"
                >
                  Hapus
                </button>
              </div>

              {/* Quick Cash Buttons */}
              <div className="grid grid-cols-4 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setCashGiven(String(cart.totalAmount))}
                  className="glass-button py-2 text-xs font-bold text-emerald-800 hover:bg-emerald-100"
                >
                  Uang Pas
                </button>
                <button
                  type="button"
                  onClick={() => setCashGiven('50000')}
                  className="glass-button py-2 text-xs font-bold text-slate-700 hover:text-slate-900"
                >
                  50.000
                </button>
                <button
                  type="button"
                  onClick={() => setCashGiven('100000')}
                  className="glass-button py-2 text-xs font-bold text-slate-700 hover:text-slate-900"
                >
                  100.000
                </button>
                <button
                  type="button"
                  onClick={() => setCashGiven('200000')}
                  className="glass-button py-2 text-xs font-bold text-slate-700 hover:text-slate-900"
                >
                  200.000
                </button>
              </div>
            </div>

            {/* Change Display */}
            <div className="rounded-xl border border-slate-200 bg-white p-3.5 flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-600">Uang Kembalian:</span>
              <span
                className={`text-base font-extrabold ${
                  isCashSufficient ? 'text-emerald-700' : 'text-slate-400'
                }`}
              >
                {formatCurrency(changeAmount)}
              </span>
            </div>

            {/* Error banner */}
            {checkoutError && (
              <div className="flex items-center gap-2 rounded-xl border border-rose-500/20 bg-rose-500/10 px-3.5 py-2.5 text-xs text-rose-700">
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-500" />
                <span>{checkoutError}</span>
              </div>
            )}

            {/* Footer Submit Buttons */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={isSubmittingOrder}
                onClick={() => setIsPaymentModalOpen(false)}
                className="glass-button px-4 py-2.5 text-xs font-semibold text-slate-600 hover:text-slate-900"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={!isCashSufficient || isSubmittingOrder}
                onClick={handleConfirmPayment}
                className="flex items-center gap-2 rounded-xl bg-emerald-700 px-5 py-2.5 text-xs font-bold text-white shadow-md hover:bg-emerald-800 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmittingOrder ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Memproses Transaksi...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Selesaikan Pembayaran</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: Held Orders Drawer / Modal                                       */}
      {/* ========================================================================= */}
      {isHeldDrawerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in">
          <div className="glass-panel w-full max-w-md p-6 space-y-4 rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-slate-900">
                <Clock className="h-5 w-5 text-amber-600" />
                <h3 className="text-base font-bold">Transaksi Tertahan</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsHeldDrawerOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {isLoadingDraft ? (
              <div className="py-8 flex flex-col items-center justify-center gap-2 text-xs text-slate-500">
                <Loader2 className="h-5 w-5 animate-spin text-emerald-700" />
                <span>Memuat data cart tertahan...</span>
              </div>
            ) : !heldDraftData || !heldDraftData.items || heldDraftData.items.length === 0 ? (
              <div className="py-8 text-center space-y-2 text-slate-500">
                <Clock className="mx-auto h-8 w-8 text-slate-300" />
                <p className="text-xs">Tidak ada transaksi yang sedang ditahan.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700">Pelanggan:</span>
                    <span className="font-bold text-slate-900">
                      {heldDraftData.customer?.customerName ||
                        heldDraftData.customer?.customer_name ||
                        'Pelanggan Umum'}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500">
                    <span>Item Tertahan: </span>
                    <span className="font-bold text-slate-800">
                      {heldDraftData.items.length} jenis produk
                    </span>
                  </div>
                  <div className="max-h-40 overflow-y-auto divide-y divide-amber-100 text-xs text-slate-600 pt-2 border-t border-amber-200/60">
                    {heldDraftData.items.map((it: HeldDraftItem, idx: number) => (
                      <div key={idx} className="py-1.5 flex justify-between">
                        <span>
                          {it.productName || it.product_name || `Produk #${it.productId || it.product_id}`} ×{' '}
                          {it.quantity}
                        </span>
                        <span className="font-semibold">
                          {formatCurrency(Number(it.price || 0) * it.quantity)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleDiscardDraft}
                    className="flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-semibold text-rose-700 hover:bg-rose-100"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span>Hapus Draft</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleResumeDraft}
                    className="flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-xs font-bold text-white shadow-md hover:bg-emerald-800"
                  >
                    <ShoppingCart className="h-4 w-4" />
                    <span>Lanjutkan Transaksi</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: Thermal Receipt & Order Finished                                */}
      {/* ========================================================================= */}
      {isReceiptModalOpen && completedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
          <div className="glass-panel w-full max-w-md p-6 space-y-4 rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-emerald-800 font-bold">
                <CheckCircle2 className="h-5 w-5 text-emerald-700" />
                <span>Transaksi Berhasil</span>
              </div>
              <button
                type="button"
                onClick={() => setIsReceiptModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Segmented Paper Size Toggle */}
            <div className="flex items-center justify-between bg-slate-100 p-1.5 rounded-xl text-xs font-medium no-print">
              <span className="text-slate-600 px-1 flex items-center gap-1.5 font-semibold">
                <Printer className="h-3.5 w-3.5 text-slate-500" />
                Format Kertas:
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => handlePaperSizeChange('58mm')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    receiptPaperSize === '58mm'
                      ? 'bg-white text-emerald-800 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  58mm (Kecil)
                </button>
                <button
                  type="button"
                  onClick={() => handlePaperSizeChange('80mm')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    receiptPaperSize === '80mm'
                      ? 'bg-white text-emerald-800 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  80mm (Standar)
                </button>
              </div>
            </div>

            {/* Thermal Receipt Simulation (58mm or 80mm width look) */}
            <div
              id="thermal-receipt"
              className={`mx-auto rounded-xl border border-slate-300 bg-slate-50 p-4 font-mono text-slate-800 space-y-2 shadow-inner print:p-0 print:border-none print:bg-white transition-all ${
                receiptPaperSize === '58mm' ? 'max-w-[280px] text-[10px]' : 'max-w-[360px] text-xs'
              }`}
            >
              <div className="text-center pb-2 border-b border-dashed border-slate-300">
                <h4 className="font-extrabold text-sm tracking-wider">TITIPIN POS</h4>
                <p className="text-[10px] text-slate-500">Jl. Pajajaran No. 128, Bogor</p>
                <p className="text-[10px] text-slate-500">Telp: 0251-888999</p>
              </div>

              <div className="space-y-1 text-[11px] pb-2 border-b border-dashed border-slate-300">
                <div className="flex justify-between">
                  <span>No. Invoice:</span>
                  <span className="font-bold">{completedOrder.invoiceNumber || completedOrder.invoice_number || 'INV-0000'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Waktu:</span>
                  <span>{new Date().toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between">
                  <span>Kasir:</span>
                  <span>{completedOrder.cashier_name || user?.name || 'Kasir'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Pelanggan:</span>
                  <span>
                    {completedOrder.customer?.customerName ||
                      completedOrder.customer?.customer_name ||
                      'Pelanggan Umum'}
                  </span>
                </div>
              </div>

              {/* Items Table */}
              <div className="space-y-1.5 py-1 text-[11px] border-b border-dashed border-slate-300">
                {(completedOrder.items || []).map((it: CartItem, idx: number) => (
                  <div key={idx} className="space-y-0.5">
                    <div className="font-semibold text-slate-900">
                      {it.product?.productName || it.product?.product_name || 'Produk'}
                    </div>
                    <div className="flex justify-between text-slate-600 text-[10px]">
                      <span>
                        {it.quantity} × {formatCurrency(Number(it.product?.price || 0))}
                      </span>
                      <span>
                        {formatCurrency(Number(it.product?.price || 0) * it.quantity)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="space-y-1 pt-1 text-[11px]">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal:</span>
                  <span>{formatCurrency(completedOrder.subtotal || cart.subtotal)}</span>
                </div>
                {completedOrder.birthday_discount > 0 && (
                  <div className="flex justify-between text-emerald-800 font-semibold">
                    <span>Diskon Ultah 5%:</span>
                    <span>-{formatCurrency(completedOrder.birthday_discount)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-slate-900 text-xs pt-1 border-t border-slate-300">
                  <span>TOTAL:</span>
                  <span>
                    {formatCurrency(
                      Number(completedOrder.totalAmount || completedOrder.total_amount || cart.totalAmount),
                    )}
                  </span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Tunai Diterima:</span>
                  <span>{formatCurrency(completedOrder.total_paid || 0)}</span>
                </div>
                <div className="flex justify-between font-bold text-emerald-800">
                  <span>Kembalian:</span>
                  <span>{formatCurrency(completedOrder.change_amount || 0)}</span>
                </div>
              </div>

              <div className="text-center pt-2 text-[10px] text-slate-400 border-t border-dashed border-slate-300">
                Terima kasih atas kunjungan Anda!
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2 no-print">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (completedOrder) {
                      downloadReceiptAsPdf({
                        invoiceNumber: completedOrder.invoiceNumber || completedOrder.invoice_number,
                        cashierName: completedOrder.cashier_name || user?.name || 'Kasir',
                        customer: completedOrder.customer,
                        items: (completedOrder.items || []).map((it: CartItem) => ({
                          productName: it.product?.productName || it.product?.product_name,
                          quantity: it.quantity,
                          unitPrice: Number(it.product?.price || 0),
                          subtotal: Number(it.product?.price || 0) * it.quantity,
                        })),
                        subtotal: completedOrder.subtotal || cart.subtotal,
                        birthday_discount: completedOrder.birthday_discount,
                        totalAmount: completedOrder.totalAmount || completedOrder.total_amount || cart.totalAmount,
                        total_paid: completedOrder.total_paid,
                        change_amount: completedOrder.change_amount,
                      }, { paperSize: receiptPaperSize });
                    }
                  }}
                  className="flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <FileText className="h-4 w-4 text-rose-600" />
                  <span>Unduh PDF</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (completedOrder) {
                      downloadReceiptAsImage({
                        invoiceNumber: completedOrder.invoiceNumber || completedOrder.invoice_number,
                        cashierName: completedOrder.cashier_name || user?.name || 'Kasir',
                        customer: completedOrder.customer,
                        items: (completedOrder.items || []).map((it: CartItem) => ({
                          productName: it.product?.productName || it.product?.product_name,
                          quantity: it.quantity,
                          unitPrice: Number(it.product?.price || 0),
                          subtotal: Number(it.product?.price || 0) * it.quantity,
                        })),
                        subtotal: completedOrder.subtotal || cart.subtotal,
                        birthday_discount: completedOrder.birthday_discount,
                        totalAmount: completedOrder.totalAmount || completedOrder.total_amount || cart.totalAmount,
                        total_paid: completedOrder.total_paid,
                        change_amount: completedOrder.change_amount,
                      }, { paperSize: receiptPaperSize });
                    }
                  }}
                  className="flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <ImageIcon className="h-4 w-4 text-emerald-700" />
                  <span>Unduh Gambar</span>
                </button>

                <button
                  type="button"
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <Printer className="h-4 w-4 text-slate-600" />
                  <span>Cetak Struk ({receiptPaperSize})</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => setIsReceiptModalOpen(false)}
                className="flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-xs font-bold text-white shadow-md hover:bg-emerald-800 transition-colors"
              >
                <Plus className="h-4 w-4" />
                <span>Transaksi Baru</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: Quick Add Customer / Member                                     */}
      {/* ========================================================================= */}
      {isNewMemberModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in">
          <div className="glass-panel w-full max-w-md p-6 space-y-4 rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-slate-900 font-bold">
                <User className="h-5 w-5 text-emerald-700" />
                <h3 className="text-base font-bold">Daftar Member Baru</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsNewMemberModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateNewMember} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  Nama Lengkap <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newMemberName}
                  onChange={(e) => setNewMemberName(e.target.value)}
                  placeholder="Contoh: Rina Melati"
                  className="glass-input mt-1 w-full text-xs text-slate-900 py-2 px-3 rounded-xl focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  Nomor Handphone <span className="text-rose-500">*</span>
                </label>
                <input
                  type="tel"
                  required
                  value={newMemberPhone}
                  onChange={(e) => setNewMemberPhone(e.target.value)}
                  placeholder="081234567890"
                  className="glass-input mt-1 w-full text-xs text-slate-900 py-2 px-3 rounded-xl focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700">Gender</label>
                  <select
                    value={newMemberGender}
                    onChange={(e) => setNewMemberGender(e.target.value as 'Pria' | 'Wanita')}
                    className="glass-input mt-1 w-full text-xs text-slate-900 py-2 px-3 rounded-xl focus:outline-none"
                  >
                    <option value="Pria">Pria</option>
                    <option value="Wanita">Wanita</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="quick-birth-date" className="block text-xs font-semibold text-slate-700">
                    Tanggal Lahir <span className="text-slate-400 font-normal">(Opsional)</span>
                  </label>
                  <input
                    id="quick-birth-date"
                    type="date"
                    value={newMemberBirthDate}
                    onChange={(e) => setNewMemberBirthDate(e.target.value)}
                    className="glass-input mt-1 w-full text-xs text-slate-900 py-2 px-3 rounded-xl focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">Alamat</label>
                <input
                  type="text"
                  value={newMemberAddress}
                  onChange={(e) => setNewMemberAddress(e.target.value)}
                  placeholder="Contoh: Jl. Baru No. 1 Bogor"
                  className="glass-input mt-1 w-full text-xs text-slate-900 py-2 px-3 rounded-xl focus:outline-none"
                />
              </div>

              {newMemberError && (
                <div className="flex items-center gap-2 rounded-xl border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-xs text-rose-700">
                  <AlertCircle className="h-4 w-4 shrink-0 text-rose-500" />
                  <span>{newMemberError}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsNewMemberModalOpen(false)}
                  className="glass-button px-3.5 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSavingMember}
                  className="flex items-center gap-1.5 rounded-xl bg-emerald-700 px-4 py-2 text-xs font-bold text-white shadow-md hover:bg-emerald-800 disabled:opacity-50"
                >
                  {isSavingMember ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Menyimpan...</span>
                    </>
                  ) : (
                    <span>Daftarkan Member</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
