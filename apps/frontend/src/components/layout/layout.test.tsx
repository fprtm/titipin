import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TopNavbar } from './top-navbar';
import { Sidebar } from './sidebar';
import { Role } from '@titipin/shared';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  usePathname: () => '/dashboard',
  useRouter: () => ({ push: vi.fn() }),
}));

// Mock useAuth
const mockLogout = vi.fn();
let mockUser: { id: string; name: string; email: string; role: Role } | null = {
  id: 'user-admin',
  name: 'Admin Utama',
  email: 'admin@titipin.id',
  role: Role.ADMIN,
};

vi.mock('../../hooks/use-auth', () => ({
  useAuth: () => ({
    user: mockUser,
    logout: mockLogout,
    isLoading: false,
    isAuthenticated: true,
  }),
}));

describe('App Shell Layout Components', () => {
  it('TopNavbar renders brand title, terminal status badge, and held transaction pill', () => {
    render(<TopNavbar />);

    expect(screen.getByText('Titipin POS')).toBeDefined();
    expect(screen.getByText(/Terminal 01 • Aktif/i)).toBeDefined();
    expect(screen.getByText(/1 Transaksi Tertahan/i)).toBeDefined();
    expect(screen.getByText('Admin Utama')).toBeDefined();
  });

  it('TopNavbar opens dropdown and can trigger logout', () => {
    render(<TopNavbar />);

    const userDropdownTrigger = screen.getByRole('button', { name: /admin utama/i });
    fireEvent.click(userDropdownTrigger);

    expect(screen.getByText('Ubah Kata Sandi')).toBeDefined();
    const logoutButton = screen.getByRole('button', { name: /keluar \(logout\)/i });
    expect(logoutButton).toBeDefined();

    fireEvent.click(logoutButton);
    expect(mockLogout).toHaveBeenCalled();
  });

  it('Sidebar renders operational items for all roles', () => {
    mockUser = {
      id: 'cashier-1',
      name: 'Kasir Satu',
      email: 'kasir@titipin.id',
      role: Role.CASHIER,
    };

    render(<Sidebar />);

    expect(screen.getByText('Dashboard')).toBeDefined();
    expect(screen.getByText('Kasir POS')).toBeDefined();
    expect(screen.getByText('Katalog Produk')).toBeDefined();
    expect(screen.getByText('Data Pelanggan')).toBeDefined();
    expect(screen.getByText('Riwayat Transaksi')).toBeDefined();

    // Admin-only items should be hidden for CASHIER
    expect(screen.queryByText('Manajemen Pengguna')).toBeNull();
    expect(screen.queryByText('Audit Trail')).toBeNull();
  });

  it('Sidebar renders admin-only items when user role is ADMIN', () => {
    mockUser = {
      id: 'admin-1',
      name: 'Admin Toko',
      email: 'admin@titipin.id',
      role: Role.ADMIN,
    };

    render(<Sidebar />);

    expect(screen.getByText('Manajemen Pengguna')).toBeDefined();
    expect(screen.getByText('Audit Trail')).toBeDefined();
  });
});
