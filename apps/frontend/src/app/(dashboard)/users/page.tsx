'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  UserPlus,
  KeyRound,
  UserX,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Loader2,
  RefreshCw,
  Eye,
  EyeOff,
  Search,
  X,
  User,
  ShieldAlert,
} from 'lucide-react';
import { useAuth } from '../../../hooks/use-auth';
import { apiClient } from '../../../lib/api-client';
import type { UserItem, Role } from '@titipin/shared';

export default function UsersPage() {
  const { user: currentUser, isLoading: isAuthLoading } = useAuth();
  const isAdmin = currentUser?.role === 'ADMIN';

  const [users, setUsers] = useState<UserItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'ADMIN' | 'CASHIER'>('ALL');

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [resetTargetUser, setResetTargetUser] = useState<UserItem | null>(null);
  const [deactivateTargetUser, setDeactivateTargetUser] = useState<UserItem | null>(null);

  // Fetch users list
  const fetchUsers = useCallback(async () => {
    if (!isAdmin) return;
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const response = await apiClient.get('/users');
      const data = response.data.data || response.data;
      setUsers(Array.isArray(data) ? data : []);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      setErrorMessage(
        err.response?.data?.message || 'Gagal memuat daftar pengguna. Silakan coba kembali.',
      );
    } finally {
      setIsLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    if (isAdmin) {
      fetchUsers();
    }
  }, [isAdmin, fetchUsers]);

  // Filtered users
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchesSearch =
        u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;
      return matchesSearch && matchesRole;
    });
  }, [users, searchQuery, roleFilter]);

  // If cashier or unauthorized
  if (!isAuthLoading && !isAdmin) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center p-4">
        <div className="glass-panel max-w-md rounded-3xl p-8 text-center border border-red-500/20">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/10 text-red-400">
            <ShieldAlert className="h-8 w-8" />
          </div>
          <h2 className="text-xl font-bold text-white">Akses Ditolak (403)</h2>
          <p className="mt-2 text-sm text-zinc-400">
            Halaman Manajemen Pengguna hanya dapat diakses oleh Administrator sistem.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Toast / Notification Banner */}
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
          <h1 className="text-2xl font-bold text-white sm:text-3xl">Manajemen Pengguna</h1>
          <p className="text-sm text-zinc-400">
            Daftar seluruh akun operator internal dan staf kasir sistem.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchUsers}
            disabled={isLoading}
            className="glass-button flex h-11 items-center gap-2 rounded-xl px-4 text-sm font-medium text-zinc-300 hover:text-white"
            title="Muat ulang data"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Segarkan</span>
          </button>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex h-11 items-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-medium text-white shadow-lg shadow-emerald-950/40 hover:bg-emerald-500 transition-colors"
          >
            <UserPlus className="h-4 w-4" />
            <span>+ Tambah Pengguna</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="glass-panel flex flex-col gap-3 rounded-2xl p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari berdasarkan nama atau email..."
            className="w-full rounded-xl border border-white/10 bg-zinc-900/60 pl-10 pr-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:border-emerald-500/60 focus:outline-none focus:ring-1 focus:ring-emerald-500/60 transition"
          />
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="role-filter" className="text-xs font-medium text-zinc-400 shrink-0">
            Role:
          </label>
          <select
            id="role-filter"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as 'ALL' | 'ADMIN' | 'CASHIER')}
            className="rounded-xl border border-white/10 bg-zinc-900/80 px-3 py-2 text-sm text-white focus:border-emerald-500/60 focus:outline-none focus:ring-1 focus:ring-emerald-500/60 transition"
          >
            <option value="ALL">Semua Role</option>
            <option value="ADMIN">Administrator</option>
            <option value="CASHIER">Kasir</option>
          </select>
        </div>
      </div>

      {/* Staff Data Table */}
      <div className="glass-panel overflow-hidden rounded-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-zinc-300">
            <thead className="border-b border-white/5 bg-white/[0.02] text-xs uppercase tracking-wider text-zinc-400 font-semibold">
              <tr>
                <th scope="col" className="px-6 py-4">
                  Nama Staf
                </th>
                <th scope="col" className="px-6 py-4">
                  Email
                </th>
                <th scope="col" className="px-6 py-4">
                  Role
                </th>
                <th scope="col" className="px-6 py-4">
                  Status
                </th>
                <th scope="col" className="px-6 py-4 text-right">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-normal">
              {isLoading && users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-zinc-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Loader2 className="h-6 w-6 animate-spin text-emerald-500" />
                      <span>Memuat data pengguna...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-zinc-500">
                    Tidak ada pengguna yang sesuai dengan filter.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => {
                  const isSelf = currentUser?.id === user.id;
                  const isDeactivated = !!user.deletedAt;

                  return (
                    <tr
                      key={user.id}
                      className="hover:bg-white/[0.02] transition-colors"
                    >
                      {/* Name & Avatar */}
                      <td className="whitespace-nowrap px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs font-bold text-emerald-400">
                            {user.name.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-medium text-white flex items-center gap-1.5">
                              <span>{user.name}</span>
                              {isSelf && (
                                <span className="rounded-md bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-300">
                                  Anda
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-zinc-500">ID: {user.id.substring(0, 8)}...</div>
                          </div>
                        </div>
                      </td>

                      {/* Email */}
                      <td className="whitespace-nowrap px-6 py-4 text-zinc-300">
                        {user.email}
                      </td>

                      {/* Role Badge */}
                      <td className="whitespace-nowrap px-6 py-4">
                        {user.role === 'ADMIN' ? (
                          <span className="inline-flex items-center gap-1 rounded-lg border border-blue-500/20 bg-blue-500/10 px-2.5 py-1 text-xs font-semibold text-blue-400">
                            <ShieldCheck className="h-3.5 w-3.5" />
                            ADMIN
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-400">
                            <User className="h-3.5 w-3.5" />
                            KASIR
                          </span>
                        )}
                      </td>

                      {/* Status Badge */}
                      <td className="whitespace-nowrap px-6 py-4">
                        {isDeactivated ? (
                          <span className="inline-flex items-center gap-1 rounded-lg border border-zinc-700 bg-zinc-800/80 px-2.5 py-1 text-xs font-semibold text-zinc-400">
                            <UserX className="h-3.5 w-3.5" />
                            Nonaktif
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-400">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Aktif
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="whitespace-nowrap px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setResetTargetUser(user)}
                            disabled={isSelf || isDeactivated}
                            className="glass-button flex h-9 items-center gap-1.5 rounded-xl px-3 text-xs font-medium text-zinc-300 hover:text-white disabled:opacity-40 disabled:pointer-events-none transition"
                            title={
                              isSelf
                                ? 'Admin tidak dapat mereset kata sandi sendiri'
                                : isDeactivated
                                ? 'Pengguna telah dinonaktifkan'
                                : 'Reset kata sandi staf'
                            }
                          >
                            <KeyRound className="h-3.5 w-3.5" />
                            <span>Reset</span>
                          </button>

                          <button
                            onClick={() => setDeactivateTargetUser(user)}
                            disabled={isSelf || isDeactivated}
                            className="flex h-9 items-center gap-1.5 rounded-xl border border-red-500/20 bg-red-500/10 px-3 text-xs font-medium text-red-400 hover:bg-red-500/20 disabled:opacity-40 disabled:pointer-events-none transition"
                            title={
                              isSelf
                                ? 'Admin tidak dapat menonaktifkan akun sendiri'
                                : isDeactivated
                                ? 'Pengguna sudah dinonaktifkan'
                                : 'Nonaktifkan akun staf'
                            }
                          >
                            <UserX className="h-3.5 w-3.5" />
                            <span>Nonaktifkan</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer info */}
        <div className="border-t border-white/5 bg-white/[0.01] px-6 py-3 text-xs text-zinc-500">
          Menampilkan {filteredUsers.length} dari {users.length} total pengguna sistem
        </div>
      </div>

      {/* Modal: Create User */}
      {isCreateModalOpen && (
        <CreateUserModal
          onClose={() => setIsCreateModalOpen(false)}
          onSuccess={(newUser) => {
            setIsCreateModalOpen(false);
            setSuccessMessage(`Staf baru ${newUser.name} (${newUser.email}) berhasil didaftarkan.`);
            fetchUsers();
          }}
        />
      )}

      {/* Modal: Reset Password */}
      {resetTargetUser && (
        <ResetPasswordModal
          user={resetTargetUser}
          onClose={() => setResetTargetUser(null)}
          onSuccess={() => {
            const name = resetTargetUser.name;
            setResetTargetUser(null);
            setSuccessMessage(
              `Kata sandi staf ${name} berhasil diubah. Seluruh sesi aktif staf tersebut telah dicabut.`,
            );
            fetchUsers();
          }}
        />
      )}

      {/* Dialog: Deactivate User Confirmation */}
      {deactivateTargetUser && (
        <DeactivateUserDialog
          user={deactivateTargetUser}
          onClose={() => setDeactivateTargetUser(null)}
          onSuccess={() => {
            const name = deactivateTargetUser.name;
            setDeactivateTargetUser(null);
            setSuccessMessage(
              `Akun staf ${name} berhasil dinonaktifkan. Sesi staf telah dicabut seketika.`,
            );
            fetchUsers();
          }}
        />
      )}
    </div>
  );
}

// ----------------------------------------------------------------------
// MODAL: CREATE USER
// ----------------------------------------------------------------------
interface CreateUserModalProps {
  onClose: () => void;
  onSuccess: (user: UserItem) => void;
}

function CreateUserModal({ onClose, onSuccess }: CreateUserModalProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>('CASHIER' as Role);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Nama lengkap wajib diisi');
      return;
    }
    if (!email.trim()) {
      setError('Email wajib diisi');
      return;
    }
    if (password.length < 8) {
      setError('Kata sandi awal minimal 8 karakter');
      return;
    }

    setIsLoading(true);
    try {
      const response = await apiClient.post('/users', {
        name: name.trim(),
        email: email.trim(),
        password,
        role,
      });
      const created = response.data.data || response.data;
      onSuccess(created);
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { message?: string } } };
      setError(
        errorObj.response?.data?.message || 'Gagal mendaftarkan pengguna baru. Silakan coba kembali.',
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
              <UserPlus className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Tambah Pengguna Baru</h2>
              <p className="text-xs text-zinc-400">Daftarkan operator atau kasir internal sistem</p>
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
              Nama Lengkap
            </label>
            <input
              type="text"
              required
              maxLength={100}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Budi Santoso"
              className="w-full h-11 rounded-xl border border-white/10 bg-zinc-900/70 px-4 text-sm text-white placeholder-zinc-500 focus:border-emerald-500/60 focus:outline-none focus:ring-1 focus:ring-emerald-500/60 transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
              Alamat Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="budi@titipin.id"
              className="w-full h-11 rounded-xl border border-white/10 bg-zinc-900/70 px-4 text-sm text-white placeholder-zinc-500 focus:border-emerald-500/60 focus:outline-none focus:ring-1 focus:ring-emerald-500/60 transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
              Kata Sandi Awal (Min. 8 Karakter)
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full h-11 rounded-xl border border-white/10 bg-zinc-900/70 pl-4 pr-11 text-sm text-white placeholder-zinc-500 focus:border-emerald-500/60 focus:outline-none focus:ring-1 focus:ring-emerald-500/60 transition"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-zinc-400 hover:text-white"
                aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
              Pilihan Role
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as Role)}
              className="w-full h-11 rounded-xl border border-white/10 bg-zinc-900/70 px-3 text-sm text-white focus:border-emerald-500/60 focus:outline-none focus:ring-1 focus:ring-emerald-500/60 transition"
            >
              <option value="CASHIER">Kasir (Operasional POS & Transaksi)</option>
              <option value="ADMIN">Administrator (Akses Penuh Sistem)</option>
            </select>
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
                <span>Simpan Pengguna</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------
// MODAL: RESET PASSWORD
// ----------------------------------------------------------------------
interface ResetPasswordModalProps {
  user: UserItem;
  onClose: () => void;
  onSuccess: () => void;
}

function ResetPasswordModal({ user, onClose, onSuccess }: ResetPasswordModalProps) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword.length < 8) {
      setError('Kata sandi baru minimal 8 karakter');
      return;
    }
    if (newPassword !== confirmation) {
      setError('Konfirmasi kata sandi tidak cocok');
      return;
    }

    setIsLoading(true);
    try {
      await apiClient.patch(`/users/${user.id}/reset-password`, {
        new_password: newPassword,
        new_password_confirmation: confirmation,
      });
      onSuccess();
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { message?: string } } };
      setError(
        errorObj.response?.data?.message || 'Gagal mereset kata sandi staf. Silakan coba kembali.',
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
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <KeyRound className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Reset Kata Sandi Staf</h2>
              <p className="text-xs text-zinc-400">
                Perbarui kata sandi untuk {user.name} ({user.email})
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

        {/* Info Box: Instant Session Revocation Warning */}
        <div className="mt-4 flex items-start gap-3 rounded-2xl border border-blue-500/20 bg-blue-500/5 p-3.5 text-xs text-blue-300">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-blue-400" />
          <div>
            <p className="font-semibold text-blue-200">Instant Session Revocation</p>
            <p className="mt-0.5 text-blue-300/90 leading-relaxed">
              Setelah kata sandi direset, seluruh sesi login aktif staf ini di terminal atau perangkat lain akan dicabut seketika. Staf wajib login kembali dengan kata sandi baru.
            </p>
          </div>
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
              Kata Sandi Baru (Min. 8 Karakter)
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                minLength={8}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Kata sandi baru min. 8 karakter"
                className="w-full h-11 rounded-xl border border-white/10 bg-zinc-900/70 pl-4 pr-11 text-sm text-white placeholder-zinc-500 focus:border-blue-500/60 focus:outline-none focus:ring-1 focus:ring-blue-500/60 transition"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-zinc-400 hover:text-white"
                aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
              Konfirmasi Kata Sandi Baru
            </label>
            <input
              type={showPassword ? 'text' : 'password'}
              required
              minLength={8}
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
              placeholder="Ulangi kata sandi baru"
              className="w-full h-11 rounded-xl border border-white/10 bg-zinc-900/70 px-4 text-sm text-white placeholder-zinc-500 focus:border-blue-500/60 focus:outline-none focus:ring-1 focus:ring-blue-500/60 transition"
            />
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
              className="flex h-11 items-center gap-2 rounded-xl bg-blue-600 px-6 text-sm font-medium text-white shadow-lg shadow-blue-950/40 hover:bg-blue-500 disabled:opacity-50 transition"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Mereset...</span>
                </>
              ) : (
                <span>Reset Kata Sandi</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------
// DIALOG: DEACTIVATE USER (DANGER CONFIRMATION)
// ----------------------------------------------------------------------
interface DeactivateUserDialogProps {
  user: UserItem;
  onClose: () => void;
  onSuccess: () => void;
}

function DeactivateUserDialog({ user, onClose, onSuccess }: DeactivateUserDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDeactivate = async () => {
    setError(null);
    setIsLoading(true);
    try {
      await apiClient.delete(`/users/${user.id}`);
      onSuccess();
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { message?: string } } };
      setError(
        errorObj.response?.data?.message || 'Gagal menonaktifkan akun staf. Silakan coba kembali.',
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
            <h2 className="text-lg font-bold text-white">Nonaktifkan Akun Staf</h2>
            <p className="text-xs text-zinc-400">Konfirmasi tindakan destruktif</p>
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
            Yakin ingin menonaktifkan akun staf <span className="font-semibold text-white">{user.name}</span> (<span className="text-zinc-400">{user.email}</span>)?
          </p>
          <div className="rounded-2xl bg-red-500/5 border border-red-500/10 p-3 text-xs text-red-300/90 leading-relaxed">
            Pengguna akan langsung dikeluarkan dari sistem dan tidak dapat login kembali. Seluruh histori penjualan yang pernah dibuatnya tetap tersimpan utuh di database.
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
            onClick={handleDeactivate}
            disabled={isLoading}
            className="flex h-11 items-center gap-2 rounded-xl bg-red-600 px-6 text-sm font-medium text-white shadow-lg shadow-red-950/40 hover:bg-red-500 disabled:opacity-50 transition"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Memproses...</span>
              </>
            ) : (
              <span>Ya, Nonaktifkan Akun</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
