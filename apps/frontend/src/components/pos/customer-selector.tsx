import React, { useState, useEffect, useRef } from 'react';
import { User, UserCheck, UserPlus, Search, Cake, X, Phone, MapPin, Loader2 } from 'lucide-react';
import type { CustomerItem } from '@titipin/shared';
import { apiClient } from '../../lib/api-client';
import { isCustomerBirthdayToday } from '../../hooks/use-pos-cart';

export interface CustomerSelectorProps {
  customerType: 'WALK_IN' | 'MEMBER';
  selectedCustomer: CustomerItem | null;
  onSelectCustomerType: (type: 'WALK_IN' | 'MEMBER') => void;
  onSelectCustomer: (customer: CustomerItem | null) => void;
  onOpenNewMemberModal: () => void;
}

export function CustomerSelector({
  customerType,
  selectedCustomer,
  onSelectCustomerType,
  onSelectCustomer,
  onOpenNewMemberModal,
}: CustomerSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<CustomerItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Debounced search customer API
  useEffect(() => {
    if (customerType !== 'MEMBER' || selectedCustomer || !searchQuery.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await apiClient.get('/customers', {
          params: { search: searchQuery.trim(), per_page: 5 },
        });
        const items = res.data?.data || res.data?.items || [];
        setSearchResults(items);
        setIsDropdownOpen(true);
      } catch {
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery, customerType, selectedCustomer]);

  // Click outside listener for dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isBirthday = selectedCustomer
    ? isCustomerBirthdayToday(selectedCustomer.birthDate || selectedCustomer.birth_date)
    : false;

  return (
    <div className="space-y-2.5">
      {/* Type Switcher Tabs */}
      <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-slate-100/90 text-xs font-semibold">
        <button
          type="button"
          onClick={() => onSelectCustomerType('WALK_IN')}
          className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg transition-all ${
            customerType === 'WALK_IN'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <User className="h-3.5 w-3.5 text-slate-500" />
          <span>Pelanggan Umum</span>
        </button>

        <button
          type="button"
          onClick={() => onSelectCustomerType('MEMBER')}
          className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg transition-all ${
            customerType === 'MEMBER'
              ? 'bg-emerald-700 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <UserCheck className="h-3.5 w-3.5" />
          <span>Member</span>
        </button>
      </div>

      {/* Content for WALK_IN */}
      {customerType === 'WALK_IN' && (
        <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/70 p-2.5 text-xs text-slate-600">
          <User className="h-4 w-4 text-slate-400 shrink-0" />
          <span className="truncate">Pelanggan Umum (Walk-In) • Transaksi tanpa akun member</span>
        </div>
      )}

      {/* Content for MEMBER */}
      {customerType === 'MEMBER' && (
        <div>
          {selectedCustomer ? (
            /* Selected Member Card */
            <div className="space-y-2 rounded-xl border border-emerald-200 bg-emerald-50/60 p-3 text-xs">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-700 text-white font-bold text-xs uppercase shadow-xs">
                    {(selectedCustomer.customerName || selectedCustomer.customer_name || 'M')
                      .slice(0, 2)
                      .toUpperCase()}
                  </div>
                  <div>
                    <h5 className="font-bold text-slate-900">
                      {selectedCustomer.customerName || selectedCustomer.customer_name}
                    </h5>
                    {selectedCustomer.phone && (
                      <p className="flex items-center gap-1 text-[11px] text-slate-600">
                        <Phone className="h-3 w-3 text-slate-400" />
                        <span>{selectedCustomer.phone}</span>
                      </p>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onSelectCustomer(null)}
                  className="rounded-lg p-1 text-slate-400 hover:bg-emerald-100 hover:text-slate-700"
                  aria-label="Ganti member"
                  title="Ganti member"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {selectedCustomer.customerAddress && (
                <div className="flex items-center gap-1 text-[11px] text-slate-500 pt-1 border-t border-emerald-200/60">
                  <MapPin className="h-3 w-3 text-slate-400 shrink-0" />
                  <span className="truncate">{selectedCustomer.customerAddress}</span>
                </div>
              )}

              {/* BR-006 Birthday Discount Banner */}
              {isBirthday && (
                <div className="flex items-center gap-2 rounded-lg bg-amber-100/90 border border-amber-300 p-2 text-xs font-semibold text-amber-900 animate-pulse">
                  <Cake className="h-4 w-4 text-amber-700 shrink-0" />
                  <span>Ulang Tahun Hari Ini! Diskon 5% otomatis hingga Rp 50.000.</span>
                </div>
              )}
            </div>
          ) : (
            /* Member Search Input & Dropdown */
            <div className="relative" ref={dropdownRef}>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Cari nama member atau no telepon..."
                    className="glass-input w-full pl-9 pr-8 py-2 text-xs rounded-xl"
                  />
                  {isSearching && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 animate-spin text-emerald-700" />
                  )}
                </div>

                <button
                  type="button"
                  onClick={onOpenNewMemberModal}
                  className="glass-button flex items-center gap-1 px-2.5 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 shrink-0"
                  title="Daftar member baru"
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  <span>Baru</span>
                </button>
              </div>

              {/* Dropdown Results */}
              {isDropdownOpen && searchResults.length > 0 && (
                <div className="absolute left-0 right-0 top-full z-30 mt-1 max-h-56 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg p-1 space-y-1">
                  {searchResults.map((cust) => {
                    const custBirthday = isCustomerBirthdayToday(cust.birthDate || cust.birth_date);
                    return (
                      <button
                        key={cust.id}
                        type="button"
                        onClick={() => {
                          onSelectCustomer(cust);
                          setSearchQuery('');
                          setIsDropdownOpen(false);
                        }}
                        className="flex w-full items-center justify-between gap-2 rounded-lg p-2 text-left text-xs hover:bg-emerald-50 transition-colors"
                      >
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-900 truncate">
                            {cust.customerName || cust.customer_name}
                          </p>
                          <p className="text-[11px] text-slate-500 truncate">
                            {cust.phone || cust.customerAddress || '-'}
                          </p>
                        </div>
                        {custBirthday && (
                          <span className="flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800 shrink-0">
                            <Cake className="h-3 w-3 text-amber-700" />
                            <span>Ultah</span>
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              {isDropdownOpen && !isSearching && searchQuery && searchResults.length === 0 && (
                <div className="absolute left-0 right-0 top-full z-30 mt-1 rounded-xl border border-slate-200 bg-white p-3 text-center text-xs text-slate-500 shadow-lg">
                  <p>Member tidak ditemukan.</p>
                  <button
                    type="button"
                    onClick={onOpenNewMemberModal}
                    className="mt-1.5 text-xs font-semibold text-emerald-700 hover:underline"
                  >
                    + Daftarkan member ini
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
