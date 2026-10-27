import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import UsersPage from './page';
import { apiClient } from '../../../lib/api-client';
import type { UserItem } from '@titipin/shared';
import { Role } from '@titipin/shared';

// Mock useAuth
const mockCurrentUser: UserItem = {
  id: 'admin-uuid-1',
  name: 'Super Admin',
  email: 'admin@titipin.id',
  role: Role.ADMIN,
  createdAt: new Date().toISOString(),
};

let authState: { user: UserItem | null; isLoading: boolean } = {
  user: mockCurrentUser,
  isLoading: false,
};

vi.mock('../../../hooks/use-auth', () => ({
  useAuth: () => authState,
}));

vi.mock('../../../lib/api-client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('UsersPage Component', () => {
  const mockUsersList = [
    {
      id: 'admin-uuid-1',
      name: 'Super Admin',
      email: 'admin@titipin.id',
      role: 'ADMIN',
      createdAt: '2026-01-01T00:00:00.000Z',
      deletedAt: null,
    },
    {
      id: 'cashier-uuid-2',
      name: 'Kasir Satu',
      email: 'kasir1@titipin.id',
      role: 'CASHIER',
      createdAt: '2026-01-02T00:00:00.000Z',
      deletedAt: null,
    },
    {
      id: 'cashier-uuid-3',
      name: 'Mantan Kasir',
      email: 'ex@titipin.id',
      role: 'CASHIER',
      createdAt: '2026-01-03T00:00:00.000Z',
      deletedAt: '2026-01-10T00:00:00.000Z',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    authState = {
      user: mockCurrentUser,
      isLoading: false,
    };
    vi.mocked(apiClient.get).mockResolvedValue({
      data: {
        success: true,
        data: mockUsersList,
      },
    } as never);
  });

  it('TEST-09: renders 403 Forbidden screen when accessed by CASHIER', () => {
    authState = {
      user: {
        id: 'cashier-uuid-2',
        name: 'Kasir Satu',
        email: 'kasir1@titipin.id',
        role: Role.CASHIER,
        createdAt: new Date().toISOString(),
      },
      isLoading: false,
    };

    render(<UsersPage />);
    expect(screen.getByText('Akses Ditolak (403)')).toBeDefined();
    expect(
      screen.getByText(/halaman manajemen pengguna hanya dapat diakses oleh administrator/i),
    ).toBeDefined();
  });

  it('renders user table with staff details and role badges for ADMIN', async () => {
    render(<UsersPage />);

    expect(screen.getByText('Manajemen Pengguna')).toBeDefined();
    expect(screen.getByRole('button', { name: /\+ tambah pengguna/i })).toBeDefined();

    await waitFor(() => {
      expect(screen.getByText('Super Admin')).toBeDefined();
      expect(screen.getByText('Kasir Satu')).toBeDefined();
      expect(screen.getByText('Mantan Kasir')).toBeDefined();
      expect(screen.getByText('admin@titipin.id')).toBeDefined();
      expect(screen.getByText('kasir1@titipin.id')).toBeDefined();
      expect(screen.getByText('Nonaktif')).toBeDefined();
    });
  });

  it('Self-Guard: disables Reset and Deactivate buttons on own admin row', async () => {
    render(<UsersPage />);

    await waitFor(() => {
      expect(screen.getByText('Super Admin')).toBeDefined();
    });

    // The admin's own row has "Anda" badge
    expect(screen.getByText('Anda')).toBeDefined();

    // Get all Reset buttons
    const resetButtons = screen.getAllByRole('button', { name: /reset/i });
    // First reset button is for admin-uuid-1 (self) -> should be disabled
    expect(resetButtons[0].hasAttribute('disabled')).toBe(true);

    // Get all Nonaktifkan buttons
    const deactivateButtons = screen.getAllByRole('button', { name: /nonaktifkan/i });
    // First deactivate button is for self -> should be disabled
    expect(deactivateButtons[0].hasAttribute('disabled')).toBe(true);

    // Second button is for active cashier -> should be enabled
    expect(deactivateButtons[1].hasAttribute('disabled')).toBe(false);
  });

  it('opens CreateUserModal when clicking "+ Tambah Pengguna"', async () => {
    render(<UsersPage />);

    const addButton = screen.getByRole('button', { name: /\+ tambah pengguna/i });
    fireEvent.click(addButton);

    await waitFor(() => {
      expect(screen.getByText('Tambah Pengguna Baru')).toBeDefined();
      expect(screen.getByPlaceholderText('e.g. Budi Santoso')).toBeDefined();
      expect(screen.getByPlaceholderText('budi@titipin.id')).toBeDefined();
    });
  });

  it('opens DeactivateUserDialog when clicking "Nonaktifkan" on active cashier', async () => {
    render(<UsersPage />);

    await waitFor(() => {
      expect(screen.getByText('Kasir Satu')).toBeDefined();
    });

    const deactivateButtons = screen.getAllByRole('button', { name: /nonaktifkan/i });
    // Click on the second button (for Kasir Satu)
    fireEvent.click(deactivateButtons[1]);

    await waitFor(() => {
      expect(screen.getByText('Nonaktifkan Akun Staf')).toBeDefined();
      expect(screen.getByText(/yakin ingin menonaktifkan akun staf/i)).toBeDefined();
      expect(screen.getByRole('button', { name: /ya, nonaktifkan akun/i })).toBeDefined();
    });
  });
});
