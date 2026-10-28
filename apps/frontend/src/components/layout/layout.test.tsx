import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TopNavbar, type HeldDraftData } from './top-navbar';
import { Sidebar } from './sidebar';
import { Role } from '@titipin/shared';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  usePathname: () => '/dashboard',
  useRouter: () => ({ push: vi.fn() }),
}));

// Mock apiClient
vi.mock('../../lib/api-client', () => ({
  apiClient: {
    get: vi.fn().mockResolvedValue({ data: { data: null } }),
    delete: vi.fn().mockResolvedValue({ data: { success: true } }),
  },
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

const sampleHeldDraft: HeldDraftData = {
  id: 1,
  customerName: 'Pelanggan VIP',
  items: [
    {
      productId: 101,
      productName: 'Kopi Susu Gula Aren',
      quantity: 2,
      price: 18000,
    },
  ],
};

describe('App Shell Layout Components', () => {
  it('TopNavbar renders brand title and user info without held draft', () => {
    render(<TopNavbar initialHeldDraft={null} />);

    expect(screen.getByText('Titipin POS')).toBeDefined();
    expect(screen.queryByText(/Terminal 01 • Aktif/i)).toBeNull();
    expect(screen.queryByText(/1 Transaksi Tertahan/i)).toBeNull();
    expect(screen.getByText('Admin Utama')).toBeDefined();
  });

  it('TopNavbar renders held transaction pill when draft exists and opens modal on click', () => {
    render(<TopNavbar initialHeldDraft={sampleHeldDraft} />);

    const heldPill = screen.getByText(/1 Transaksi Tertahan/i);
    expect(heldPill).toBeDefined();

    // Click pill to open detail modal
    fireEvent.click(heldPill);

    // Modal elements must be present
    expect(screen.getByText('Transaksi Tertahan')).toBeDefined();
    expect(screen.getByText('Pelanggan VIP')).toBeDefined();
    expect(screen.getByText(/Kopi Susu Gula Aren/i)).toBeDefined();
    expect(screen.getByRole('button', { name: /hapus draft/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /lanjutkan ke kasir/i })).toBeDefined();
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

  it('TopNavbar opens change password modal when Ubah Kata Sandi is clicked', () => {
    render(<TopNavbar />);

    const userDropdownTrigger = screen.getByRole('button', { name: /admin utama/i });
    fireEvent.click(userDropdownTrigger);

    const changePasswordMenuItem = screen.getByText('Ubah Kata Sandi');
    fireEvent.click(changePasswordMenuItem);

    expect(screen.getByRole('dialog')).toBeDefined();
    expect(screen.getByLabelText(/Kata Sandi Saat Ini/i)).toBeDefined();
  });

  it('Sidebar renders operational items for all roles', () => {
    mockUser = {
      id: 'cashier-1',
      name: 'Kasir Satu',
      email: 'kasir@titipin.id',
      role: Role.CASHIER,
    };

    render(<Sidebar />);

    expect(screen.getByText(/Kasir POS/i)).toBeDefined();
    expect(screen.getByText(/Katalog Produk/i)).toBeDefined();
    expect(screen.getByText(/Pelanggan/i)).toBeDefined();
    expect(screen.getByText(/Riwayat Transaksi/i)).toBeDefined();

    // Kasir should not see Admin-restricted links
    expect(screen.queryByText(/Manajemen Pengguna/i)).toBeNull();
    expect(screen.queryByText(/Audit Trail/i)).toBeNull();
  });

  it('Sidebar renders admin management section when user is ADMIN', () => {
    mockUser = {
      id: 'admin-1',
      name: 'Admin Utama',
      email: 'admin@titipin.id',
      role: Role.ADMIN,
    };

    render(<Sidebar />);

    expect(screen.getByText(/Manajemen Pengguna/i)).toBeDefined();
    expect(screen.getByText(/Audit Trail/i)).toBeDefined();
  });
});
