'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Store, Clock, LogOut, KeyRound, Menu, ChevronDown } from 'lucide-react';
import { useAuth } from '../../hooks/use-auth';
import { Badge } from '../ui/badge';

interface TopNavbarProps {
  onToggleSidebar?: () => void;
}

export function TopNavbar({ onToggleSidebar }: TopNavbarProps) {
  const { user, logout } = useAuth();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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

  return (
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

        {/* Terminal Status Pill */}
        <div className="hidden items-center gap-1.5 sm:flex">
          <Badge variant="success" className="gap-1.5 py-1">
            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
            <span>Terminal 01 • Aktif</span>
          </Badge>
        </div>
      </div>

      {/* Center / Right Quick Pill: Held Orders */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          className="shadow-xs flex animate-pulse cursor-pointer items-center gap-1.5 rounded-full border border-amber-300 bg-amber-100/90 px-3 py-1.5 text-xs font-semibold text-amber-900 transition-all hover:bg-amber-200 sm:gap-2 sm:px-4"
        >
          <Clock className="h-3.5 w-3.5 text-amber-800" />
          <span className="hidden sm:inline">1 Transaksi Tertahan</span>
          <span className="sm:hidden">1 Tertahan</span>
        </button>

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
                    // Open password dialog or navigate
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
  );
}
