'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Users2,
  UserPlus,
  User,
  Search,
  RefreshCw,
  Edit3,
  Trash2,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  X,
  Phone,
  MapPin,
  Calendar,
  Cake,
  ChevronLeft,
  ChevronRight,
  Filter,
} from 'lucide-react';
import { useAuth } from '../../../hooks/use-auth';
import { apiClient } from '../../../lib/api-client';
import type { CustomerItem, CreateCustomerInput, UpdateCustomerInput } from '@titipin/shared';
import { Gender } from '@titipin/shared';

function isBirthdayToday(birthDateStr?: string | null): boolean {
  if (!birthDateStr) return false;
  try {
    const today = new Date();
    const todayMonth = String(today.getMonth() + 1).padStart(2, '0');
    const todayDay = String(today.getDate()).padStart(2, '0');
    const parts = birthDateStr.split('-');
    if (parts.length >= 3) {
      return parts[1] === todayMonth && parts[2] === todayDay;
    }
  } catch {
    return false;
  }
  return false;
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

function getInitials(name?: string): string {
  if (!name) return '??';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export default function CustomersPage() {
  const { user: currentUser } = useAuth();
  const isAdmin = currentUser?.role === 'ADMIN';

  const [customers, setCustomers] = useState<CustomerItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Filters & Pagination
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [genderFilter, setGenderFilter] = useState<'ALL' | 'Pria' | 'Wanita'>('ALL');
  const [sortOption, setSortOption] = useState<'name_asc' | 'name_desc' | 'birth_asc' | 'birth_desc' | 'created_desc' | 'created_asc'>('name_asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [paginationMeta, setPaginationMeta] = useState({
    page: 1,
    per_page: 10,
    total_items: 0,
    total_pages: 1,
  });

  // Modal States
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<CustomerItem | null>(null);
  const [deleteTargetCustomer, setDeleteTargetCustomer] = useState<CustomerItem | null>(null);

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Fetch customers
  const fetchCustomers = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    let sort: string | undefined = undefined;
    let order: 'asc' | 'desc' = 'asc';

    switch (sortOption) {
      case 'name_asc':
        sort = 'customer_name';
        order = 'asc';
        break;
      case 'name_desc':
        sort = 'customer_name';
        order = 'desc';
        break;
      case 'birth_asc':
        sort = 'birth_date';
        order = 'asc';
        break;
      case 'birth_desc':
        sort = 'birth_date';
        order = 'desc';
        break;
      case 'created_desc':
        sort = 'created_at';
        order = 'desc';
        break;
      case 'created_asc':
        sort = 'created_at';
        order = 'asc';
        break;
    }

    try {
      const response = await apiClient.get('/customers', {
        params: {
          page: currentPage,
          per_page: 10,
          search: debouncedSearch.trim() || undefined,
          sort,
          order,
        },
      });

      const responseData = response.data.data || response.data;
      const items: CustomerItem[] = Array.isArray(responseData) ? responseData : responseData.items || [];
      const meta = response.data.meta || {
        page: currentPage,
        per_page: 10,
        total_items: items.length,
        total_pages: 1,
      };

      setCustomers(items);
      setPaginationMeta(meta);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      setErrorMessage(
        err.response?.data?.message || 'Gagal memuat data pelanggan. Silakan coba kembali.',
      );
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, debouncedSearch, sortOption]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  // Filtered by Gender locally if filtered
  const displayedCustomers = useMemo(() => {
    if (genderFilter === 'ALL') return customers;
    return customers.filter((c) => c.gender === genderFilter);
  }, [customers, genderFilter]);

  // Compute KPI counts
  const kpiStats = useMemo(() => {
    const total = paginationMeta.total_items || customers.length;
    let priaCount = 0;
    let wanitaCount = 0;
    let birthdayTodayCount = 0;

    customers.forEach((c) => {
      if (c.gender === Gender.PRIA) priaCount++;
      if (c.gender === Gender.WANITA) wanitaCount++;
      const birth = c.birthDate || c.birth_date;
      if (isBirthdayToday(birth)) birthdayTodayCount++;
    });

    return {
      total,
      priaCount,
      wanitaCount,
      birthdayTodayCount,
    };
  }, [customers, paginationMeta.total_items]);

  return (
    <div className="space-y-6">
      {/* Toast / Notification Banners */}
      {successMessage && (
        <div className="glass-panel flex items-center justify-between gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-emerald-400">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 shrink-0" />
            <span className="text-sm font-medium">{successMessage}</span>
          </div>
          <button
            onClick={() => setSuccessMessage(null)}
            className="rounded-lg p-1 text-emerald-400 hover:bg-emerald-500/20"
            aria-label="Tutup notifikasi"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="glass-panel flex items-center justify-between gap-3 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-rose-400">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <span className="text-sm font-medium">{errorMessage}</span>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="rounded-lg p-1 text-rose-400 hover:bg-rose-500/20"
            aria-label="Tutup notifikasi"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Header Section */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Data Pelanggan & Member
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Kelola direktori pelanggan, keanggotaan loyalty, dan diskon ulang tahun (BR-006).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => fetchCustomers()}
            disabled={isLoading}
            className="glass-button flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-700 hover:text-slate-900 disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Segarkan
          </button>

          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-bold text-white shadow-md hover:bg-emerald-800 transition-colors"
          >
            <UserPlus className="h-4 w-4" />
            + Tambah Pelanggan
          </button>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Member */}
        <div className="glass-card rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Total Member
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800">
              <Users2 className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-bold text-slate-900">
            {kpiStats.total}
          </div>
          <p className="mt-1 text-xs text-slate-500">Terdaftar aktif di sistem</p>
        </div>

        {/* Member Pria */}
        <div className="glass-card rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Member Pria
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-100 text-sky-800">
              <User className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-bold text-slate-900">
            {kpiStats.priaCount}
          </div>
          <p className="mt-1 text-xs text-slate-500">Pelanggan laki-laki</p>
        </div>

        {/* Member Wanita */}
        <div className="glass-card rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Member Wanita
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-100 text-rose-800">
              <User className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-bold text-slate-900">
            {kpiStats.wanitaCount}
          </div>
          <p className="mt-1 text-xs text-slate-500">Pelanggan perempuan</p>
        </div>

        {/* Ultah Hari Ini (BR-006) */}
        <div className="glass-card rounded-2xl p-5 border border-amber-200 bg-amber-50/70">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-800">
              Ultah Hari Ini
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-200/80 text-amber-800">
              <Cake className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-bold text-amber-900">
            {kpiStats.birthdayTodayCount}
          </div>
          <p className="mt-1 text-xs text-amber-700 font-medium">Klaim diskon 5% BR-006</p>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="glass-panel flex flex-col gap-4 rounded-2xl p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nama atau nomor telepon pelanggan..."
            className="glass-input w-full rounded-xl py-2 pl-10 pr-4 text-sm text-slate-900 placeholder-slate-400 focus:outline-none"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-slate-400" />
            <select
              value={genderFilter}
              onChange={(e) => setGenderFilter(e.target.value as 'ALL' | 'Pria' | 'Wanita')}
              className="glass-input rounded-xl px-3 py-2 text-sm text-slate-800 bg-white focus:outline-none"
              aria-label="Filter Gender"
            >
              <option value="ALL">Semua Gender</option>
              <option value="Pria">Pria</option>
              <option value="Wanita">Wanita</option>
            </select>
          </div>

          <select
            value={sortOption}
            onChange={(e) => setSortOption(e.target.value as typeof sortOption)}
            className="glass-input rounded-xl px-3 py-2 text-sm text-slate-800 bg-white focus:outline-none"
            aria-label="Urutkan"
          >
            <option value="name_asc">Nama (A - Z)</option>
            <option value="name_desc">Nama (Z - A)</option>
            <option value="birth_asc">Tgl Lahir (Muda - Tua)</option>
            <option value="birth_desc">Tgl Lahir (Tua - Muda)</option>
            <option value="created_desc">Terbaru</option>
            <option value="created_asc">Terlama</option>
          </select>
        </div>
      </div>

      {/* Customer Data Table */}
      <div className="glass-panel overflow-hidden rounded-3xl border border-slate-200/80">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-700">
            <thead className="border-b border-slate-200/80 bg-slate-50/75 text-xs uppercase tracking-wider text-slate-600">
              <tr>
                <th className="px-6 py-4 font-semibold">Pelanggan</th>
                <th className="px-6 py-4 font-semibold">Gender</th>
                <th className="px-6 py-4 font-semibold">Telepon</th>
                <th className="px-6 py-4 font-semibold">Tanggal Lahir</th>
                <th className="px-6 py-4 font-semibold">Alamat</th>
                <th className="px-6 py-4 font-semibold">Terdaftar</th>
                {isAdmin && <th className="px-6 py-4 text-right font-semibold">Aksi</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-normal">
              {isLoading ? (
                <tr>
                  <td colSpan={isAdmin ? 7 : 6} className="py-12 text-center">
                    <div className="flex flex-col items-center justify-center gap-3 text-slate-500">
                      <Loader2 className="h-7 w-7 animate-spin text-emerald-600" />
                      <p className="text-sm">Memuat data pelanggan...</p>
                    </div>
                  </td>
                </tr>
              ) : displayedCustomers.length === 0 ? (
                <tr>
                  <td colSpan={isAdmin ? 7 : 6} className="py-12 text-center">
                    <div className="flex flex-col items-center justify-center gap-3 text-slate-500">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                        <Users2 className="h-6 w-6" />
                      </div>
                      <p className="text-base font-semibold text-slate-900">Tidak ada data pelanggan ditemukan</p>
                      <p className="text-sm text-slate-500 max-w-sm">
                        {debouncedSearch
                          ? 'Coba gunakan kata kunci pencarian yang berbeda.'
                          : 'Belum ada anggota loyalty yang terdaftar di sistem.'}
                      </p>
                      <button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="mt-2 flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white shadow-md hover:bg-emerald-800"
                      >
                        <UserPlus className="h-4 w-4" />
                        Tambah Pelanggan Sekarang
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                displayedCustomers.map((customer) => {
                  const name = customer.customerName || customer.customer_name || 'Tanpa Nama';
                  const address = customer.customerAddress || customer.customer_address || '-';
                  const birthDate = customer.birthDate || customer.birth_date || '-';
                  const isBirthday = isBirthdayToday(birthDate);
                  const isMale = customer.gender === Gender.PRIA;

                  return (
                    <tr
                      key={customer.id}
                      className="transition-colors hover:bg-slate-50/60"
                    >
                      {/* Name & Initials */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 font-bold text-emerald-800">
                            {getInitials(name)}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-900">{name}</div>
                            <div className="text-xs text-slate-400 font-mono">
                              #{customer.id.slice(0, 8)}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Gender Badge */}
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
                            isMale
                              ? 'bg-sky-50 text-sky-700 border border-sky-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          <User className="h-3 w-3" />
                          {customer.gender}
                        </span>
                      </td>

                      {/* Phone */}
                      <td className="px-6 py-4">
                        {customer.phone ? (
                          <div className="flex items-center gap-1.5 text-slate-700">
                            <Phone className="h-3.5 w-3.5 text-slate-400" />
                            <span>{customer.phone}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>

                      {/* Birth Date & Birthday Badge */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1.5 text-slate-700">
                            <Calendar className="h-3.5 w-3.5 text-slate-400" />
                            <span>{birthDate}</span>
                          </div>
                          {isBirthday && (
                            <span className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-800 animate-pulse">
                              <Cake className="h-3 w-3" />
                              Ultah!
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Address */}
                      <td className="px-6 py-4">
                        <div
                          className="flex max-w-[200px] items-center gap-1.5 truncate text-slate-600"
                          title={address}
                        >
                          <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                          <span className="truncate">{address}</span>
                        </div>
                      </td>

                      {/* Created At */}
                      <td className="px-6 py-4 text-xs text-slate-500">
                        {formatDate(customer.createdAt || customer.created_at)}
                      </td>

                      {/* Actions (Admin Only) */}
                      {isAdmin && (
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => setEditingCustomer(customer)}
                              className="glass-button flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900"
                              title="Ubah data pelanggan"
                            >
                              <Edit3 className="h-3.5 w-3.5" />
                              Ubah
                            </button>
                            <button
                              onClick={() => setDeleteTargetCustomer(customer)}
                              className="flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 transition-colors"
                              title="Hapus pelanggan"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              Hapus
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

        {/* Pagination Bar */}
        <div className="flex flex-col items-center justify-between gap-4 border-t border-slate-200/80 px-6 py-4 sm:flex-row">
          <p className="text-xs text-slate-600">
            Menampilkan{' '}
            <span className="font-semibold text-slate-900">{displayedCustomers.length}</span>{' '}
            dari{' '}
            <span className="font-semibold text-slate-900">{paginationMeta.total_items}</span>{' '}
            data pelanggan aktif
          </p>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1 || isLoading}
              className="glass-button flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 disabled:opacity-40"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              Sebelumnya
            </button>

            <span className="text-xs text-slate-600">
              Halaman {paginationMeta.page} / {paginationMeta.total_pages || 1}
            </span>

            <button
              onClick={() => setCurrentPage((p) => Math.min(paginationMeta.total_pages, p + 1))}
              disabled={currentPage >= paginationMeta.total_pages || isLoading}
              className="glass-button flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 disabled:opacity-40"
            >
              Selanjutnya
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Modals */}
      {isCreateModalOpen && (
        <CreateCustomerModal
          onClose={() => setIsCreateModalOpen(false)}
          onSuccess={(newCust) => {
            setIsCreateModalOpen(false);
            setSuccessMessage(`Pelanggan "${newCust.customerName || newCust.customer_name}" berhasil didaftarkan!`);
            fetchCustomers();
          }}
        />
      )}

      {editingCustomer && (
        <EditCustomerModal
          customer={editingCustomer}
          onClose={() => setEditingCustomer(null)}
          onSuccess={(updatedCust) => {
            setEditingCustomer(null);
            setSuccessMessage(`Data pelanggan "${updatedCust.customerName || updatedCust.customer_name}" berhasil diperbarui!`);
            fetchCustomers();
          }}
        />
      )}

      {deleteTargetCustomer && (
        <DeleteCustomerDialog
          customer={deleteTargetCustomer}
          onClose={() => setDeleteTargetCustomer(null)}
          onSuccess={() => {
            setDeleteTargetCustomer(null);
            setSuccessMessage('Pelanggan berhasil dihapus dari direktori aktif.');
            fetchCustomers();
          }}
        />
      )}
    </div>
  );
}

// ============================================================================
// CREATE CUSTOMER MODAL (Cashier & Admin)
// ============================================================================
function CreateCustomerModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: (cust: CustomerItem) => void;
}) {
  const [formData, setFormData] = useState({
    customer_name: '',
    gender: 'Pria' as 'Pria' | 'Wanita',
    birth_date: '',
    phone: '',
    customer_address: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const validate = (): boolean => {
    const errs: Record<string, string> = {};

    if (!formData.customer_name.trim() || formData.customer_name.trim().length < 2) {
      errs.customer_name = 'Nama pelanggan minimal 2 karakter';
    } else if (formData.customer_name.trim().length > 150) {
      errs.customer_name = 'Nama pelanggan maksimal 150 karakter';
    }

    if (!formData.customer_address.trim() || formData.customer_address.trim().length < 5) {
      errs.customer_address = 'Alamat minimal 5 karakter';
    } else if (formData.customer_address.trim().length > 255) {
      errs.customer_address = 'Alamat maksimal 255 karakter';
    }

    if (formData.birth_date && !/^\d{4}-\d{2}-\d{2}$/.test(formData.birth_date)) {
      errs.birth_date = 'Format tanggal lahir harus YYYY-MM-DD';
    }

    if (formData.phone && formData.phone.length > 20) {
      errs.phone = 'Nomor telepon maksimal 20 karakter';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const payload: CreateCustomerInput = {
        customer_name: formData.customer_name.trim(),
        gender: formData.gender as Gender,
        birth_date: formData.birth_date ? formData.birth_date : null,
        phone: formData.phone.trim() || null,
        customer_address: formData.customer_address.trim(),
      };

      const response = await apiClient.post('/customers', payload);
      const created = response.data.data || response.data;
      onSuccess(created);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      setSubmitError(err.response?.data?.message || 'Gagal mendaftarkan pelanggan.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm" onClick={onClose} />
      <div className="glass-panel relative w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800">
              <UserPlus className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Daftar Pelanggan Baru</h2>
              <p className="text-xs text-slate-500">Tambahkan pelanggan ke direktori member Titipin</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {submitError && (
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{submitError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Customer Name */}
          <div>
            <label htmlFor="create-customer-name" className="block text-xs font-semibold text-slate-700">
              Nama Lengkap <span className="text-rose-500">*</span>
            </label>
            <input
              id="create-customer-name"
              type="text"
              value={formData.customer_name}
              onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
              placeholder="Contoh: Budi Santoso"
              className={`glass-input mt-1.5 w-full rounded-xl px-3.5 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none ${
                errors.customer_name ? 'border-rose-500' : ''
              }`}
            />
            {errors.customer_name && (
              <p className="mt-1 text-xs text-rose-500">{errors.customer_name}</p>
            )}
          </div>

          {/* Gender Pills */}
          <div>
            <label className="block text-xs font-semibold text-slate-700">
              Jenis Kelamin (Gender) <span className="text-rose-500">*</span>
            </label>
            <div className="mt-1.5 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, gender: 'Pria' })}
                className={`flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold transition-colors ${
                  formData.gender === 'Pria'
                    ? 'border border-sky-300 bg-sky-50 text-sky-800'
                    : 'glass-button text-slate-600 hover:text-slate-900'
                }`}
              >
                <User className="h-4 w-4" />
                Pria
              </button>

              <button
                type="button"
                onClick={() => setFormData({ ...formData, gender: 'Wanita' })}
                className={`flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold transition-colors ${
                  formData.gender === 'Wanita'
                    ? 'border border-rose-300 bg-rose-50 text-rose-800'
                    : 'glass-button text-slate-600 hover:text-slate-900'
                }`}
              >
                <User className="h-4 w-4" />
                Wanita
              </button>
            </div>
          </div>

          {/* Birth Date & Phone Grid */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="create-birth-date" className="block text-xs font-semibold text-slate-700">
                Tanggal Lahir <span className="text-slate-400 font-normal lowercase">(opsional)</span>
              </label>
              <input
                id="create-birth-date"
                type="date"
                value={formData.birth_date}
                onChange={(e) => setFormData({ ...formData, birth_date: e.target.value })}
                className={`glass-input mt-1.5 w-full rounded-xl px-3.5 py-2 text-sm text-slate-900 focus:outline-none ${
                  errors.birth_date ? 'border-rose-500' : ''
                }`}
              />
              <p className="mt-1 text-[11px] text-slate-400">Kunci diskon ultah BR-006</p>
              {errors.birth_date && (
                <p className="mt-1 text-xs text-rose-500">{errors.birth_date}</p>
              )}
            </div>

            <div>
              <label htmlFor="create-phone" className="block text-xs font-semibold text-slate-700">
                Nomor Telepon
              </label>
              <input
                id="create-phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="081234567890"
                className={`glass-input mt-1.5 w-full rounded-xl px-3.5 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none ${
                  errors.phone ? 'border-rose-500' : ''
                }`}
              />
              {errors.phone && <p className="mt-1 text-xs text-rose-500">{errors.phone}</p>}
            </div>
          </div>

          {/* Address */}
          <div>
            <label htmlFor="create-customer-address" className="block text-xs font-semibold text-slate-700">
              Alamat Lengkap <span className="text-rose-500">*</span>
            </label>
            <textarea
              id="create-customer-address"
              rows={3}
              value={formData.customer_address}
              onChange={(e) => setFormData({ ...formData, customer_address: e.target.value })}
              placeholder="Contoh: Jl. Surya Kencana No. 42 Bogor"
              className={`glass-input mt-1.5 w-full rounded-xl px-3.5 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none resize-none ${
                errors.customer_address ? 'border-rose-500' : ''
              }`}
            />
            {errors.customer_address && (
              <p className="mt-1 text-xs text-rose-500">{errors.customer_address}</p>
            )}
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="glass-button rounded-xl px-4 py-2 text-sm font-semibold text-slate-700 hover:text-slate-900"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 rounded-xl bg-emerald-700 px-5 py-2 text-sm font-bold text-white shadow-md hover:bg-emerald-800 disabled:opacity-50"
            >
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Daftar Pelanggan
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============================================================================
// EDIT CUSTOMER MODAL (Admin Only)
// ============================================================================
function EditCustomerModal({
  customer,
  onClose,
  onSuccess,
}: {
  customer: CustomerItem;
  onClose: () => void;
  onSuccess: (cust: CustomerItem) => void;
}) {
  const initialName = customer.customerName || customer.customer_name || '';
  const initialAddress = customer.customerAddress || customer.customer_address || '';
  const initialBirth = customer.birthDate || customer.birth_date || '';
  const initialPhone = customer.phone || '';
  const initialGender = (customer.gender as 'Pria' | 'Wanita') || 'Pria';

  const [formData, setFormData] = useState({
    customer_name: initialName,
    gender: initialGender,
    birth_date: initialBirth,
    phone: initialPhone,
    customer_address: initialAddress,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const validate = (): boolean => {
    const errs: Record<string, string> = {};

    if (!formData.customer_name.trim() || formData.customer_name.trim().length < 2) {
      errs.customer_name = 'Nama pelanggan minimal 2 karakter';
    } else if (formData.customer_name.trim().length > 150) {
      errs.customer_name = 'Nama pelanggan maksimal 150 karakter';
    }

    if (!formData.customer_address.trim() || formData.customer_address.trim().length < 5) {
      errs.customer_address = 'Alamat minimal 5 karakter';
    } else if (formData.customer_address.trim().length > 255) {
      errs.customer_address = 'Alamat maksimal 255 karakter';
    }

    if (formData.birth_date && !/^\d{4}-\d{2}-\d{2}$/.test(formData.birth_date)) {
      errs.birth_date = 'Format tanggal lahir harus YYYY-MM-DD';
    }

    if (formData.phone && formData.phone.length > 20) {
      errs.phone = 'Nomor telepon maksimal 20 karakter';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const payload: UpdateCustomerInput = {
        customer_name: formData.customer_name.trim(),
        gender: formData.gender as Gender,
        birth_date: formData.birth_date ? formData.birth_date : null,
        phone: formData.phone.trim() || null,
        customer_address: formData.customer_address.trim(),
      };

      const response = await apiClient.put(`/customers/${customer.id}`, payload);
      const updated = response.data.data || response.data;
      onSuccess(updated);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      setSubmitError(err.response?.data?.message || 'Gagal memperbarui data pelanggan.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm" onClick={onClose} />
      <div className="glass-panel relative w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800">
              <Edit3 className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Ubah Data Pelanggan</h2>
              <p className="text-xs text-slate-500">ID: #{customer.id.slice(0, 8)}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {submitError && (
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{submitError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Customer Name */}
          <div>
            <label htmlFor="edit-customer-name" className="block text-xs font-semibold text-slate-700">
              Nama Lengkap <span className="text-rose-500">*</span>
            </label>
            <input
              id="edit-customer-name"
              type="text"
              value={formData.customer_name}
              onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
              className={`glass-input mt-1.5 w-full rounded-xl px-3.5 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none ${
                errors.customer_name ? 'border-rose-500' : ''
              }`}
            />
            {errors.customer_name && (
              <p className="mt-1 text-xs text-rose-500">{errors.customer_name}</p>
            )}
          </div>

          {/* Gender Pills */}
          <div>
            <label className="block text-xs font-semibold text-slate-700">
              Jenis Kelamin (Gender) <span className="text-rose-500">*</span>
            </label>
            <div className="mt-1.5 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, gender: 'Pria' })}
                className={`flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold transition-colors ${
                  formData.gender === 'Pria'
                    ? 'border border-sky-300 bg-sky-50 text-sky-800'
                    : 'glass-button text-slate-600 hover:text-slate-900'
                }`}
              >
                <User className="h-4 w-4" />
                Pria
              </button>

              <button
                type="button"
                onClick={() => setFormData({ ...formData, gender: 'Wanita' })}
                className={`flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold transition-colors ${
                  formData.gender === 'Wanita'
                    ? 'border border-rose-300 bg-rose-50 text-rose-800'
                    : 'glass-button text-slate-600 hover:text-slate-900'
                }`}
              >
                <User className="h-4 w-4" />
                Wanita
              </button>
            </div>
          </div>

          {/* Birth Date & Phone Grid */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="edit-birth-date" className="block text-xs font-semibold text-slate-700">
                Tanggal Lahir <span className="text-slate-400 font-normal lowercase">(opsional)</span>
              </label>
              <input
                id="edit-birth-date"
                type="date"
                value={formData.birth_date}
                onChange={(e) => setFormData({ ...formData, birth_date: e.target.value })}
                className={`glass-input mt-1.5 w-full rounded-xl px-3.5 py-2 text-sm text-slate-900 focus:outline-none ${
                  errors.birth_date ? 'border-rose-500' : ''
                }`}
              />
              {errors.birth_date && (
                <p className="mt-1 text-xs text-rose-500">{errors.birth_date}</p>
              )}
            </div>

            <div>
              <label htmlFor="edit-phone" className="block text-xs font-semibold text-slate-700">
                Nomor Telepon
              </label>
              <input
                id="edit-phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className={`glass-input mt-1.5 w-full rounded-xl px-3.5 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none ${
                  errors.phone ? 'border-rose-500' : ''
                }`}
              />
              {errors.phone && <p className="mt-1 text-xs text-rose-500">{errors.phone}</p>}
            </div>
          </div>

          {/* Address */}
          <div>
            <label htmlFor="edit-customer-address" className="block text-xs font-semibold text-slate-700">
              Alamat Lengkap <span className="text-rose-500">*</span>
            </label>
            <textarea
              id="edit-customer-address"
              rows={3}
              value={formData.customer_address}
              onChange={(e) => setFormData({ ...formData, customer_address: e.target.value })}
              className={`glass-input mt-1.5 w-full rounded-xl px-3.5 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none resize-none ${
                errors.customer_address ? 'border-rose-500' : ''
              }`}
            />
            {errors.customer_address && (
              <p className="mt-1 text-xs text-rose-500">{errors.customer_address}</p>
            )}
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="glass-button rounded-xl px-4 py-2 text-sm font-semibold text-slate-700 hover:text-slate-900"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 rounded-xl bg-emerald-700 px-5 py-2 text-sm font-bold text-white shadow-md hover:bg-emerald-800 disabled:opacity-50"
            >
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Simpan Perubahan
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============================================================================
// DELETE CUSTOMER CONFIRMATION DIALOG (Admin Only)
// ============================================================================
function DeleteCustomerDialog({
  customer,
  onClose,
  onSuccess,
}: {
  customer: CustomerItem;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const name = customer.customerName || customer.customer_name || 'Pelanggan';

  const handleDelete = async () => {
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await apiClient.delete(`/customers/${customer.id}`);
      onSuccess();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      setDeleteError(err.response?.data?.message || 'Gagal menghapus data pelanggan.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm" onClick={onClose} />
      <div className="glass-panel relative w-full max-w-md rounded-3xl border border-rose-200 bg-white p-6 shadow-2xl">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-700 border border-rose-200">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">Hapus Pelanggan?</h2>
            <p className="text-xs text-slate-500">Tindakan ini akan menonaktifkan member</p>
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-sm text-slate-700">
          <p className="font-bold text-slate-900">{name}</p>
          {customer.phone && <p className="text-xs text-slate-500 mt-0.5">Tel: {customer.phone}</p>}
          <p className="mt-2 text-xs text-slate-600">
            Pelanggan akan di-soft delete dan tidak muncul lagi di pencarian kasir, namun riwayat transaksi pesanan masa lalu tetap aman tersimpan.
          </p>
        </div>

        {deleteError && (
          <div className="mt-3 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{deleteError}</span>
          </div>
        )}

        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="glass-button rounded-xl px-4 py-2 text-sm font-semibold text-slate-700 hover:text-slate-900"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting}
            className="flex items-center gap-2 rounded-xl bg-rose-600 px-5 py-2 text-sm font-bold text-white shadow-md hover:bg-rose-700 disabled:opacity-50"
          >
            {isDeleting && <Loader2 className="h-4 w-4 animate-spin" />}
            Hapus Pelanggan
          </button>
        </div>
      </div>
    </div>
  );
}
