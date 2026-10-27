import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ProductsPage from './page';
import { apiClient } from '../../../lib/api-client';
import { Role } from '@titipin/shared';
import type { UserItem } from '@titipin/shared';

// Mock useAuth
const mockAdminUser: UserItem = {
  id: 'admin-uuid-1',
  name: 'Super Admin',
  email: 'admin@titipin.id',
  role: Role.ADMIN,
  createdAt: new Date().toISOString(),
};

let authState = {
  user: mockAdminUser as UserItem | null,
};

vi.mock('../../../hooks/use-auth', () => ({
  useAuth: () => authState,
}));

vi.mock('../../../lib/api-client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('ProductsPage Component', () => {
  const mockProductsList = [
    {
      id: 1,
      productCode: 'P0001',
      productName: 'Hydrococo 150ml',
      price: '12000.00',
      stock: 15,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      deletedAt: null,
      product_code: 'P0001',
      product_name: 'Hydrococo 150ml',
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
    },
    {
      id: 2,
      productCode: 'P0002',
      productName: 'Indomie Goreng',
      price: '3500.00',
      stock: 3,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      deletedAt: null,
      product_code: 'P0002',
      product_name: 'Indomie Goreng',
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    authState = {
      user: mockAdminUser,
    };
    vi.mocked(apiClient.get).mockResolvedValue({
      data: {
        success: true,
        data: mockProductsList,
        meta: {
          page: 1,
          per_page: 10,
          total_items: 2,
          total_pages: 1,
        },
      },
    } as never);
  });

  it('renders product catalog table with formatted prices and stock badges', async () => {
    render(<ProductsPage />);

    expect(screen.getByText('Katalog & Inventaris Produk')).toBeDefined();
    expect(screen.getByPlaceholderText('Cari nama atau kode produk...')).toBeDefined();

    await waitFor(() => {
      expect(screen.getByText('Hydrococo 150ml')).toBeDefined();
      expect(screen.getByText('P0001')).toBeDefined();
      expect(screen.getByText('15 Unit')).toBeDefined();
      expect(screen.getByText('Indomie Goreng')).toBeDefined();
      expect(screen.getByText('P0002')).toBeDefined();
      expect(screen.getByText('3! Menipis')).toBeDefined();
    });
  });

  it('renders Admin actions (+ Tambah Produk, Import Excel, Ubah, Hapus) when logged in as ADMIN', async () => {
    render(<ProductsPage />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /\+ tambah produk/i })).toBeDefined();
      expect(screen.getByRole('button', { name: /import excel/i })).toBeDefined();
      expect(screen.getAllByRole('button', { name: /ubah/i }).length).toBe(2);
      expect(screen.getAllByRole('button', { name: /hapus/i }).length).toBe(2);
    });
  });

  it('hides Admin write actions for CASHIER (read-only mode)', async () => {
    authState = {
      user: {
        id: 'cashier-uuid-1',
        name: 'Kasir Satu',
        email: 'kasir@titipin.id',
        role: Role.CASHIER,
        createdAt: new Date().toISOString(),
      },
    };

    render(<ProductsPage />);

    await waitFor(() => {
      expect(screen.getByText('Hydrococo 150ml')).toBeDefined();
    });

    expect(screen.queryByRole('button', { name: /\+ tambah produk/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /import excel/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /ubah/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /hapus/i })).toBeNull();
  });

  it('opens CreateEditProductModal when clicking "+ Tambah Produk"', async () => {
    render(<ProductsPage />);

    const addButton = screen.getByRole('button', { name: /\+ tambah produk/i });
    fireEvent.click(addButton);

    await waitFor(() => {
      expect(screen.getByText('Tambah Produk Baru')).toBeDefined();
      expect(screen.getByPlaceholderText('e.g. P0001')).toBeDefined();
      expect(screen.getByPlaceholderText('e.g. Hydrococo 150ml')).toBeDefined();
    });
  });

  it('opens ImportSpreadsheetModal when clicking "Import Excel"', async () => {
    render(<ProductsPage />);

    const importButton = screen.getByRole('button', { name: /import excel/i });
    fireEvent.click(importButton);

    await waitFor(() => {
      expect(screen.getByText('Import Produk Massal')).toBeDefined();
      expect(screen.getByText(/pilih berkas spreadsheet/i)).toBeDefined();
    });
  });

  it('opens DeleteProductDialog when clicking "Hapus" button', async () => {
    render(<ProductsPage />);

    await waitFor(() => {
      expect(screen.getByText('Hydrococo 150ml')).toBeDefined();
    });

    const deleteButtons = screen.getAllByRole('button', { name: /hapus/i });
    fireEvent.click(deleteButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('Hapus Produk')).toBeDefined();
      expect(screen.getByText(/yakin ingin menghapus produk/i)).toBeDefined();
      expect(screen.getByRole('button', { name: /ya, hapus produk/i })).toBeDefined();
    });
  });
});
