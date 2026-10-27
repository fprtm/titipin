'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Users2,
  Receipt,
  UserCog,
  ShieldAlert,
  X,
  Store,
} from 'lucide-react';
import { useAuth } from '../../hooks/use-auth';
import { cn } from '../../lib/utils';

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  adminOnly?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Kasir POS', href: '/pos', icon: ShoppingCart },
  { label: 'Katalog Produk', href: '/products', icon: Package },
  { label: 'Data Pelanggan', href: '/customers', icon: Users2 },
  { label: 'Riwayat Transaksi', href: '/orders', icon: Receipt },
  { label: 'Manajemen Pengguna', href: '/users', icon: UserCog, adminOnly: true },
  { label: 'Audit Trail', href: '/audit-logs', icon: ShieldAlert, adminOnly: true },
];

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
  isMobileDrawer?: boolean;
}

export function Sidebar({ isOpen = false, onClose, isMobileDrawer = false }: SidebarProps) {
  const pathname = usePathname();
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  const operationalItems = NAV_ITEMS.filter((item) => !item.adminOnly);
  const adminItems = NAV_ITEMS.filter((item) => item.adminOnly);

  const renderNavList = () => (
    <div className="space-y-6">
      {/* Brand logo in mobile drawer */}
      {isMobileDrawer && (
        <div className="flex items-center justify-between border-b border-slate-200/60 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="shadow-xs flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-700 text-white">
              <Store className="h-5 w-5" />
            </div>
            <span className="text-lg font-bold tracking-tight text-slate-900">Titipin POS</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-slate-100"
            aria-label="Tutup menu navigasi"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      )}

      {/* Operational items */}
      <nav className="space-y-1">
        {operationalItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <a
              key={item.href}
              href={item.href}
              onClick={() => isMobileDrawer && onClose?.()}
              className={cn(
                'flex cursor-pointer items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all duration-200',
                isActive
                  ? 'shadow-xs bg-emerald-700 font-semibold text-white'
                  : 'text-slate-600 hover:bg-white/80 hover:text-slate-900',
              )}
            >
              <Icon className={cn('h-4 w-4', isActive ? 'text-white' : 'text-slate-500')} />
              <span>{item.label}</span>
            </a>
          );
        })}
      </nav>

      {/* Admin specific items */}
      {isAdmin && (
        <div className="space-y-1 border-t border-slate-200/60 pt-2">
          <p className="my-2 px-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
            Administrasi
          </p>
          {adminItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;
            return (
              <a
                key={item.href}
                href={item.href}
                onClick={() => isMobileDrawer && onClose?.()}
                className={cn(
                  'flex cursor-pointer items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all duration-200',
                  isActive
                    ? 'shadow-xs bg-emerald-700 font-semibold text-white'
                    : 'text-slate-600 hover:bg-white/80 hover:text-slate-900',
                )}
              >
                <Icon className={cn('h-4 w-4', isActive ? 'text-white' : 'text-slate-500')} />
                <span>{item.label}</span>
              </a>
            );
          })}
        </div>
      )}
    </div>
  );

  // If mobile drawer mode
  if (isMobileDrawer) {
    if (!isOpen) return null;
    return (
      <div className="fixed inset-0 z-50 flex md:hidden">
        {/* Backdrop */}
        <div
          className="backdrop-blur-xs fixed inset-0 bg-slate-900/40 transition-opacity"
          onClick={onClose}
        />
        {/* Drawer surface */}
        <aside className="glass-panel animate-in slide-in-from-left relative z-10 flex h-full w-72 max-w-[80vw] flex-col justify-between overflow-y-auto rounded-r-3xl border-l-0 p-6 shadow-2xl duration-200">
          {renderNavList()}
          <div className="border-t border-slate-200/60 pt-6 text-center">
            <p className="text-xs text-slate-400">Titipin POS v1.0.0</p>
          </div>
        </aside>
      </div>
    );
  }

  // Desktop sidebar mode
  return (
    <aside className="glass-panel m-4 hidden w-64 shrink-0 flex-col justify-between rounded-3xl p-6 shadow-md sm:m-6 md:flex lg:m-8">
      {renderNavList()}
      <div className="border-t border-slate-200/60 pt-4 text-center">
        <p className="text-xs text-slate-400">Titipin POS v1.0.0</p>
      </div>
    </aside>
  );
}
