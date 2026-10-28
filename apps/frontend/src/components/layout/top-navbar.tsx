'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Store, Clock, LogOut, KeyRound, Menu, ChevronDown, X, Trash2, Play } from 'lucide-react';
import { useAuth } from '../../hooks/use-auth';
import { Badge } from '../ui/badge';
import { apiClient } from '../../lib/api-client';
import { ChangePasswordModal } from './change-password-modal';

export interface HeldDraftItem {
  productId?: number;
  product_id?: number;
  productName?: string;
  product_name?: string;
  quantity: number;
  price: number | string;
}

export interface HeldDraftData {
  id: number;
  userId?: string;
  user_id?: string;
  customerId?: string | null;
  customer_id?: string | null;
  customer?: {
    customerId?: string;
    customer_id?: string;
    customerName?: string;
    customer_name?: string;
  } | null;
  customerName?: string;
  items: HeldDraftItem[];
  createdAt?: string;
  created_at?: string;
}

interface TopNavbarProps {
  onToggleSidebar?: () => void;
  initialHeldDraft?: HeldDraftData | null;
}

export function TopNavbar({ onToggleSidebar, initialHeldDraft = null }: TopNavbarProps) {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Held Draft State
  const [heldDraft, setHeldDraft] = useState<HeldDraftData | null>(initialHeldDraft);
  const [isHeldModalOpen, setIsHeldModalOpen] = useState(false);
  const [isDiscardingDraft, setIsDiscardingDraft] = useState(false);

  // Fetch active held draft from server
  const fetchHeldDraft = useCallback(async () => {
    try {
      const res = await apiClient.get('/orders/draft');
      const draft = res.data?.data;
      if (draft && draft.items && draft.items.length > 0) {
        setHeldDraft(draft);
      } else {
        setHeldDraft(null);
      }
    } catch {
      setHeldDraft(null);
    }
  }, []);

  useEffect(() => {
    fetchHeldDraft();

    const handleDraftChanged = (e: Event) => {
      const customEvent = e as CustomEvent<HeldDraftData | null>;
      if (customEvent.detail) {
        setHeldDraft(customEvent.detail);
      } else {
        fetchHeldDraft();
      }
    };

    window.addEventListener('held-draft-changed', handleDraftChanged);
    const interval = setInterval(fetchHeldDraft, 10000);

    return () => {
      window.removeEventListener('held-draft-changed', handleDraftChanged);
      clearInterval(interval);
    };
  }, [fetchHeldDraft]);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getInitials = (name?: string) => {
    if (!name) return 'U';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(val);
  };

  // Discard draft from TopNavbar modal
  const handleDiscardDraft = async () => {
    if (!confirm('Hapus transaksi tertahan ini secara permanen?')) return;
    setIsDiscardingDraft(true);
    try {
      await apiClient.delete('/orders/draft');
      setHeldDraft(null);
      setIsHeldModalOpen(false);
      window.dispatchEvent(new CustomEvent('held-draft-changed', { detail: null }));
    } catch {
      alert('Gagal menghapus transaksi tertahan.');
    } finally {
      setIsDiscardingDraft(false);
    }
  };

  // Resume draft from TopNavbar modal
  const handleResumeDraft = () => {
    setIsHeldModalOpen(false);
    window.dispatchEvent(new CustomEvent('held-draft-resume', { detail: heldDraft }));
    router.push('/pos?resume=true');
  };

  const totalHeldAmount = (heldDraft?.items || []).reduce(
    (acc, it) => acc + Number(it.price || 0) * it.quantity,
    0,
  );

  return (
    <>
      <header className="glass-panel sticky top-4 z-40 mx-4 flex h-16 items-center justify-between rounded-2xl px-4 shadow-md sm:mx-6 sm:px-6 lg:mx-8">
        {/* Left side: Hamburger + Brand + Terminal Badge */}
        <div className="flex items-center gap-3">
          {/* Mobile Hamburger Button */}
          <button
            type="button"
            onClick={onToggleSidebar}
            aria-label="Buka menu navigasi"
            className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl text-slate-700 transition-colors hover:bg-slate-100 md:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>

          {/* Brand Logo */}
          <div className="flex items-center gap-2.5">
            <div className="shadow-xs flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-700 text-white">
              <Store className="h-5 w-5" />
            </div>
            <span className="xs:inline-block hidden text-base font-bold tracking-tight text-slate-900 sm:text-lg">
              Titipin POS
            </span>
          </div>
        </div>

        {/* Center / Right Quick Pill: Held Orders (Dynamic) */}
        <div className="flex items-center gap-3">
          {heldDraft && heldDraft.items && heldDraft.items.length > 0 && (
            <button
              type="button"
              onClick={() => setIsHeldModalOpen(true)}
              aria-label="Lihat transaksi tertahan"
              className="shadow-xs flex animate-pulse cursor-pointer items-center gap-1.5 rounded-full border border-amber-300 bg-amber-100/90 px-3 py-1.5 text-xs font-semibold text-amber-900 transition-all hover:bg-amber-200 sm:gap-2 sm:px-4"
            >
              <Clock className="h-3.5 w-3.5 text-amber-800" />
              <span className="hidden sm:inline">1 Transaksi Tertahan</span>
              <span className="sm:hidden">1 Tertahan</span>
            </button>
          )}

          {/* User Menu Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              aria-expanded={isDropdownOpen}
              aria-haspopup="true"
              className="flex cursor-pointer items-center gap-2 rounded-xl border border-transparent p-1.5 text-slate-700 transition-colors hover:border-slate-200 hover:bg-white/80 sm:px-3 sm:py-1.5"
            >
              {/* Avatar Circle */}
              <div className="shadow-xs flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-800">
                {getInitials(user?.name)}
              </div>
              <div className="hidden flex-col items-start text-left md:flex">
                <span className="line-clamp-1 max-w-[120px] text-xs font-semibold text-slate-800">
                  {user?.name || 'Pengguna'}
                </span>
                <span className="font-mono text-[10px] uppercase text-slate-500">
                  {user?.role || 'KASIR'}
                </span>
              </div>
              <ChevronDown className="hidden h-3.5 w-3.5 text-slate-400 sm:block" />
            </button>

            {/* Dropdown Popover */}
            {isDropdownOpen && (
              <div className="glass-panel animate-in fade-in-80 zoom-in-95 absolute right-0 top-12 z-50 mt-2 w-56 rounded-2xl border border-white/80 p-2 shadow-xl">
                {/* User summary on mobile */}
                <div className="border-b border-slate-100 p-2 md:hidden">
                  <p className="text-xs font-semibold text-slate-900">{user?.name}</p>
                  <p className="font-mono text-[10px] text-slate-500">{user?.email}</p>
                  <div className="mt-1">
                    <Badge variant={user?.role === 'ADMIN' ? 'info' : 'neutral'}>{user?.role}</Badge>
                  </div>
                </div>

                <div className="space-y-1 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setIsDropdownOpen(false);
                      setIsChangePasswordOpen(true);
                    }}
                    className="flex w-full cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 transition-colors hover:bg-emerald-50 hover:text-emerald-900"
                  >
                    <KeyRound className="h-4 w-4 text-slate-500" />
                    <span>Ubah Kata Sandi</span>
                  </button>

                  <button
                    type="button"
                    onClick={async () => {
                      setIsDropdownOpen(false);
                      await logout();
                    }}
                    className="flex w-full cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-rose-700 transition-colors hover:bg-rose-50"
                  >
                    <LogOut className="h-4 w-4 text-rose-600" />
                    <span>Keluar (Logout)</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Held Draft Modal Detail & Confirmation */}
      {isHeldModalOpen && heldDraft && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in">
          <div className="glass-panel w-full max-w-md p-6 space-y-4 rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-slate-900">
                <Clock className="h-5 w-5 text-amber-600" />
                <h3 className="text-base font-bold">Transaksi Tertahan</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsHeldModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                aria-label="Tutup dialog"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-700">Pelanggan:</span>
                <span className="font-bold text-slate-900">
                  {heldDraft.customer?.customerName ||
                    heldDraft.customer?.customer_name ||
                    heldDraft.customerName ||
                    'Pelanggan Umum'}
                </span>
              </div>
              <div className="text-xs text-slate-500">
                <span>Item Tertahan: </span>
                <span className="font-bold text-slate-800">
                  {heldDraft.items.length} jenis produk
                </span>
              </div>
              <div className="max-h-48 overflow-y-auto divide-y divide-amber-100 text-xs text-slate-600 pt-2 border-t border-amber-200/60">
                {heldDraft.items.map((it, idx) => (
                  <div key={idx} className="py-1.5 flex justify-between">
                    <span className="truncate max-w-[220px]">
                      {it.productName || it.product_name || `Produk #${it.productId || it.product_id}`} ×{' '}
                      {it.quantity}
                    </span>
                    <span className="font-semibold shrink-0">
                      {formatCurrency(Number(it.price || 0) * it.quantity)}
                    </span>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-amber-200 font-bold text-sm text-slate-900">
                <span>Total Perkiraan:</span>
                <span className="text-emerald-700 font-extrabold">
                  {formatCurrency(totalHeldAmount)}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 pt-2">
              <button
                type="button"
                disabled={isDiscardingDraft}
                onClick={handleDiscardDraft}
                className="flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 transition-colors disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4" />
                <span>{isDiscardingDraft ? 'Menghapus...' : 'Hapus Draft'}</span>
              </button>

              <button
                type="button"
                disabled={isDiscardingDraft}
                onClick={handleResumeDraft}
                className="flex items-center gap-1.5 rounded-xl bg-emerald-700 px-4 py-2.5 text-xs font-bold text-white hover:bg-emerald-800 transition-colors shadow-sm disabled:opacity-50"
              >
                <Play className="h-4 w-4" />
                <span>Lanjutkan ke Kasir</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Change Password Modal */}
      <ChangePasswordModal
        isOpen={isChangePasswordOpen}
        onClose={() => setIsChangePasswordOpen(false)}
      />
    </>
  );
}
