'use client';

import React, { useState } from 'react';
import { KeyRound, X, Eye, EyeOff, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { apiClient } from '../../lib/api-client';
import { changePasswordSchema } from '@titipin/shared';

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ChangePasswordModal({ isOpen, onClose }: ChangePasswordModalProps) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPasswordConfirmation, setNewPasswordConfirmation] = useState('');

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleClose = () => {
    if (isLoading) return;
    setCurrentPassword('');
    setNewPassword('');
    setNewPasswordConfirmation('');
    setShowCurrentPassword(false);
    setShowNewPassword(false);
    setShowConfirmation(false);
    setErrorMessage(null);
    setFieldErrors({});
    setSuccessMessage(null);
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setFieldErrors({});
    setSuccessMessage(null);

    const validation = changePasswordSchema.safeParse({
      current_password: currentPassword,
      new_password: newPassword,
      new_password_confirmation: newPasswordConfirmation,
    });

    if (!validation.success) {
      const errors: Record<string, string> = {};
      for (const issue of validation.error.issues) {
        const field = issue.path[0];
        if (field && !errors[String(field)]) {
          errors[String(field)] = issue.message;
        }
      }
      setFieldErrors(errors);
      return;
    }

    setIsLoading(true);

    try {
      const response = await apiClient.post('/auth/change-password', {
        current_password: currentPassword,
        new_password: newPassword,
        new_password_confirmation: newPasswordConfirmation,
      });

      const message = response.data?.message || 'Kata sandi berhasil diubah';
      setSuccessMessage(message);
      setCurrentPassword('');
      setNewPassword('');
      setNewPasswordConfirmation('');

      setTimeout(() => {
        handleClose();
      }, 1500);
    } catch (error: unknown) {
      const err = error as {
        response?: {
          data?: {
            message?: string | string[];
          };
        };
      };

      const backendMsg = err.response?.data?.message;
      if (Array.isArray(backendMsg)) {
        setErrorMessage(backendMsg.join(', '));
      } else if (typeof backendMsg === 'string') {
        setErrorMessage(backendMsg);
      } else {
        setErrorMessage('Gagal memperbarui kata sandi. Silakan periksa kembali data Anda.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="change-password-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in"
    >
      <div className="glass-panel w-full max-w-md p-6 space-y-4 rounded-2xl border border-slate-200 bg-white shadow-2xl animate-in zoom-in-95">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200">
              <KeyRound className="h-5 w-5" />
            </div>
            <div>
              <h3 id="change-password-title" className="text-base font-bold text-slate-900">
                Ubah Kata Sandi
              </h3>
              <p className="text-xs text-slate-500">
                Perbarui kata sandi untuk menjaga keamanan akun Anda.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={isLoading}
            className="rounded-lg p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-50"
            aria-label="Tutup dialog"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Success Alert */}
        {successMessage && (
          <div className="flex items-center gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-semibold text-emerald-800 animate-in fade-in">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Error Alert */}
        {errorMessage && (
          <div className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700 animate-in fade-in">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {/* Kata Sandi Saat Ini */}
          <div>
            <label
              htmlFor="current-password"
              className="block text-xs font-semibold text-slate-700 mb-1"
            >
              Kata Sandi Saat Ini <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                id="current-password"
                type={showCurrentPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={currentPassword}
                onChange={(e) => {
                  setCurrentPassword(e.target.value);
                  if (fieldErrors.current_password) {
                    setFieldErrors((prev) => ({ ...prev, current_password: '' }));
                  }
                }}
                disabled={isLoading}
                placeholder="Masukkan kata sandi saat ini"
                className={`glass-input h-10 w-full rounded-xl px-3.5 pr-10 text-xs text-slate-900 transition-all placeholder:text-slate-400 focus:outline-none ${
                  fieldErrors.current_password
                    ? 'border-rose-400 focus:border-rose-500 focus:ring-4 focus:ring-rose-500/15'
                    : ''
                }`}
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowCurrentPassword((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                aria-label={showCurrentPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
              >
                {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {fieldErrors.current_password && (
              <p className="mt-1 text-[11px] font-medium text-rose-600 animate-in fade-in">
                {fieldErrors.current_password}
              </p>
            )}
          </div>

          {/* Kata Sandi Baru */}
          <div>
            <label
              htmlFor="new-password"
              className="block text-xs font-semibold text-slate-700 mb-1"
            >
              Kata Sandi Baru <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                id="new-password"
                type={showNewPassword ? 'text' : 'password'}
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  if (fieldErrors.new_password) {
                    setFieldErrors((prev) => ({ ...prev, new_password: '' }));
                  }
                }}
                disabled={isLoading}
                placeholder="Minimal 8 karakter"
                className={`glass-input h-10 w-full rounded-xl px-3.5 pr-10 text-xs text-slate-900 transition-all placeholder:text-slate-400 focus:outline-none ${
                  fieldErrors.new_password
                    ? 'border-rose-400 focus:border-rose-500 focus:ring-4 focus:ring-rose-500/15'
                    : ''
                }`}
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowNewPassword((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                aria-label={showNewPassword ? 'Sembunyikan kata sandi baru' : 'Tampilkan kata sandi baru'}
              >
                {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {fieldErrors.new_password ? (
              <p className="mt-1 text-[11px] font-medium text-rose-600 animate-in fade-in">
                {fieldErrors.new_password}
              </p>
            ) : (
              <p className="mt-1 text-[10px] text-slate-500">
                Gunakan minimal 8 karakter dengan kombinasi huruf dan angka.
              </p>
            )}
          </div>

          {/* Konfirmasi Kata Sandi Baru */}
          <div>
            <label
              htmlFor="confirm-password"
              className="block text-xs font-semibold text-slate-700 mb-1"
            >
              Konfirmasi Kata Sandi Baru <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                id="confirm-password"
                type={showConfirmation ? 'text' : 'password'}
                autoComplete="new-password"
                value={newPasswordConfirmation}
                onChange={(e) => {
                  setNewPasswordConfirmation(e.target.value);
                  if (fieldErrors.new_password_confirmation) {
                    setFieldErrors((prev) => ({ ...prev, new_password_confirmation: '' }));
                  }
                }}
                disabled={isLoading}
                placeholder="Ulangi kata sandi baru"
                className={`glass-input h-10 w-full rounded-xl px-3.5 pr-10 text-xs text-slate-900 transition-all placeholder:text-slate-400 focus:outline-none ${
                  fieldErrors.new_password_confirmation
                    ? 'border-rose-400 focus:border-rose-500 focus:ring-4 focus:ring-rose-500/15'
                    : ''
                }`}
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowConfirmation((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                aria-label={
                  showConfirmation ? 'Sembunyikan konfirmasi kata sandi' : 'Tampilkan konfirmasi kata sandi'
                }
              >
                {showConfirmation ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {fieldErrors.new_password_confirmation && (
              <p className="mt-1 text-[11px] font-medium text-rose-600 animate-in fade-in">
                {fieldErrors.new_password_confirmation}
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={handleClose}
              disabled={isLoading}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex items-center gap-1.5 rounded-xl bg-emerald-700 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-800 transition-colors shadow-sm disabled:opacity-50"
            >
              {isLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              <span>{isLoading ? 'Menyimpan...' : 'Simpan Kata Sandi'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
