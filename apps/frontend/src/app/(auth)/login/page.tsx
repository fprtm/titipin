'use client';

import React, { useState, useEffect } from 'react';
import { Store, Mail, Lock, Eye, EyeOff, ArrowRight, AlertCircle, Sparkles } from 'lucide-react';
import { useAuth } from '../../../hooks/use-auth';
import { loginSchema } from '@titipin/shared';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});

  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.search.includes('error=session_expired')) {
      setErrorMessage('Sesi Anda telah berakhir. Silakan masuk kembali.');
    }
  }, []);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);
    setFieldErrors({});

    // Validate using Zod loginSchema
    const parseResult = loginSchema.safeParse({ email, password });
    if (!parseResult.success) {
      const formattedErrors: { email?: string; password?: string } = {};
      for (const issue of parseResult.error.issues) {
        if (issue.path[0] === 'email') formattedErrors.email = issue.message;
        if (issue.path[0] === 'password') formattedErrors.password = issue.message;
      }
      setFieldErrors(formattedErrors);
      return;
    }

    setIsSubmitting(true);
    try {
      await login({ email, password });
    } catch (error: unknown) {
      const axiosError = error as { response?: { status?: number; data?: { message?: string } } };
      if (axiosError.response?.status === 401) {
        setErrorMessage('Email atau kata sandi tidak valid. Silakan coba kembali.');
      } else {
        setErrorMessage(
          axiosError.response?.data?.message ||
            'Gagal terhubung ke server autentikasi. Silakan periksa koneksi Anda.',
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="bg-canvas-pattern flex min-h-screen w-full items-center justify-center p-4 sm:p-6">
      <div className="glass-panel w-full max-w-md space-y-6 rounded-3xl p-6 shadow-2xl sm:p-8 md:p-10">
        {/* Brand Header */}
        <div className="flex flex-col items-center space-y-2 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-700 text-white shadow-md">
            <Store className="h-7 w-7" />
          </div>
          <div className="flex items-center gap-1.5 pt-1">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Titipin POS</h1>
            <Sparkles className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="text-xs font-medium text-slate-500 sm:text-sm">
            Sistem Kasir & Order Management
          </p>
        </div>

        {/* Error Alert Banner */}
        {errorMessage && (
          <div
            role="alert"
            className="animate-in fade-in flex items-center gap-3 rounded-2xl border border-rose-300 bg-rose-50/90 p-4 text-rose-800"
          >
            <AlertCircle className="h-5 w-5 shrink-0 text-rose-600" />
            <p className="text-xs font-medium leading-relaxed sm:text-sm">{errorMessage}</p>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {/* Email Input */}
          <div className="space-y-1">
            <label htmlFor="email" className="block text-xs font-medium text-slate-700 sm:text-sm">
              Email Staf
            </label>
            <Input
              id="email"
              type="email"
              autoFocus
              autoComplete="email"
              placeholder="nama@titipin.id"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              hasError={!!fieldErrors.email}
              errorMessage={fieldErrors.email}
              leftIcon={<Mail className="h-4 w-4" />}
            />
          </div>

          {/* Password Input */}
          <div className="space-y-1">
            <label
              htmlFor="password"
              className="block text-xs font-medium text-slate-700 sm:text-sm"
            >
              Kata Sandi
            </label>
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              hasError={!!fieldErrors.password}
              errorMessage={fieldErrors.password}
              leftIcon={<Lock className="h-4 w-4" />}
              rightIcon={
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPassword(!showPassword)}
                  className="cursor-pointer text-slate-400 transition-colors hover:text-slate-600"
                  aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              }
            />
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            size="lg"
            variant="default"
            isLoading={isSubmitting}
            className="mt-2 h-12 w-full rounded-xl font-semibold"
          >
            {isSubmitting ? (
              <span>Memverifikasi...</span>
            ) : (
              <span className="flex items-center gap-2">
                <span>Masuk ke Sistem</span>
                <ArrowRight className="h-4 w-4" />
              </span>
            )}
          </Button>
        </form>

        {/* Footer */}
        <div className="border-t border-slate-200/60 pt-2 text-center">
          <p className="text-xs text-slate-400">© 2026 Titipin Retail POS</p>
        </div>
      </div>
    </main>
  );
}
