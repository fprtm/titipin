import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import React from 'react';
import OrdersHistoryPage from './page';
import { apiClient } from '../../../lib/api-client';

// Mock apiClient
vi.mock('../../../lib/api-client', () => ({
  apiClient: {
    get: vi.fn(),
  },
}));

describe('OrdersHistoryPage Component', () => {
  const mockOrders = [
    {
      id: 1,
      orderNumber: 'INV-20261028-0001',
      orderDate: '2026-10-28T10:00:00.000Z',
      customerId: 'cust-1',
      customerName: 'Budi Santoso',
      cashierName: 'Kasir Satu',
      totalAmount: 45000,
    },
    {
      id: 2,
      orderNumber: 'INV-20261028-0002',
      orderDate: '2026-10-28T11:30:00.000Z',
      customerId: null,
      customerName: 'Pelanggan Umum',
      cashierName: 'Kasir Dua',
      totalAmount: 18000,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(apiClient.get).mockImplementation((url: string) => {
      if (url.includes('/customers')) {
        return Promise.resolve({
          data: {
            data: [
              { id: 'cust-1', customerName: 'Budi Santoso', phone: '08123456789' },
            ],
          },
        });
      }
      if (url.includes('/orders')) {
        return Promise.resolve({
          data: {
            data: {
              items: mockOrders,
              meta: {
                total: 2,
                page: 1,
                perPage: 10,
                totalPages: 1,
              },
            },
          },
        });
      }
      return Promise.resolve({ data: { data: [] } });
    });
  });

  it('renders order history page header and filter toolbar', async () => {
    render(<OrdersHistoryPage />);

    expect(screen.getByText('Riwayat Transaksi Penjualan')).toBeDefined();
    expect(screen.getByPlaceholderText('Cari No. Order...')).toBeDefined();
    expect(screen.getByLabelText('Dari Tanggal')).toBeDefined();
    expect(screen.getByLabelText('Sampai Tanggal')).toBeDefined();
  });

  it('fetches and renders order list in table with formatted currency and status badge', async () => {
    render(<OrdersHistoryPage />);

    await waitFor(() => {
      expect(screen.getByText('INV-20261028-0001')).toBeDefined();
      expect(screen.getByText('INV-20261028-0002')).toBeDefined();
      expect(screen.getByText('Budi Santoso')).toBeDefined();
      expect(screen.getByText('Pelanggan Umum')).toBeDefined();
    });

    const lunasBadges = screen.getAllByText('Lunas');
    expect(lunasBadges.length).toBeGreaterThanOrEqual(2);
  });

  it('triggers refetch when date filter changes', async () => {
    render(<OrdersHistoryPage />);

    await waitFor(() => {
      expect(screen.getByText('INV-20261028-0001')).toBeDefined();
    });

    const fromInput = screen.getByLabelText('Dari Tanggal');
    fireEvent.change(fromInput, { target: { value: '2026-10-01' } });

    await waitFor(() => {
      expect(apiClient.get).toHaveBeenCalledWith(
        '/orders',
        expect.objectContaining({
          params: expect.objectContaining({ from: '2026-10-01' }),
        }),
      );
    });
  });

  it('searches order history with debounced search query and allows clearing search', async () => {
    render(<OrdersHistoryPage />);

    await waitFor(() => {
      expect(screen.getByText('INV-20261028-0001')).toBeDefined();
    });

    const searchInput = screen.getByPlaceholderText('Cari No. Order...');
    fireEvent.change(searchInput, { target: { value: 'Budi' } });

    await waitFor(() => {
      expect(apiClient.get).toHaveBeenCalledWith(
        '/orders',
        expect.objectContaining({
          params: expect.objectContaining({ search: 'Budi' }),
        }),
      );
    });

    const clearBtn = screen.getByLabelText('Hapus pencarian');
    expect(clearBtn).toBeDefined();
    fireEvent.click(clearBtn);

    await waitFor(() => {
      expect(searchInput).toHaveProperty('value', '');
    });
  });

  it('renders empty state when no orders match', async () => {
    vi.mocked(apiClient.get).mockImplementation((url: string) => {
      if (url.includes('/orders')) {
        return Promise.resolve({
          data: {
            data: {
              items: [],
              meta: { total: 0, page: 1, perPage: 10, totalPages: 1 },
            },
          },
        });
      }
      return Promise.resolve({ data: { data: [] } });
    });

    render(<OrdersHistoryPage />);

    await waitFor(() => {
      expect(screen.getByText('Belum ada data transaksi')).toBeDefined();
    });
  });

  it('allows searching and selecting a customer in filter dropdown', async () => {
    render(<OrdersHistoryPage />);

    await waitFor(() => {
      expect(screen.getByText('Semua Pelanggan')).toBeDefined();
    });

    // Open dropdown
    const customerFilterBtn = screen.getByLabelText('Filter Pelanggan');
    fireEvent.click(customerFilterBtn);

    // Search input should appear
    const searchInput = screen.getByPlaceholderText('Cari nama atau no. telp...');
    expect(searchInput).toBeDefined();

    // Type query
    fireEvent.change(searchInput, { target: { value: 'Budi' } });

    // Option should be visible and clickable
    const budiOption = screen.getByRole('button', { name: /Budi Santoso/i });
    fireEvent.click(budiOption);

    await waitFor(() => {
      expect(apiClient.get).toHaveBeenCalledWith(
        '/orders',
        expect.objectContaining({
          params: expect.objectContaining({ customer_id: 'cust-1' }),
        }),
      );
    });
  });

  it('applies quick date presets when filter buttons are clicked', async () => {
    render(<OrdersHistoryPage />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Hari Ini' })).toBeDefined();
    });

    const hariIniBtn = screen.getByRole('button', { name: 'Hari Ini' });
    fireEvent.click(hariIniBtn);

    await waitFor(() => {
      expect(apiClient.get).toHaveBeenCalledWith(
        '/orders',
        expect.objectContaining({
          params: expect.objectContaining({
            from: expect.any(String),
            to: expect.any(String),
          }),
        }),
      );
    });
  });

  it('triggers Excel export when Ekspor Excel button is clicked', async () => {
    window.URL.createObjectURL = vi.fn().mockReturnValue('blob:mock-url');
    window.URL.revokeObjectURL = vi.fn();

    vi.mocked(apiClient.get).mockImplementation((url: string) => {
      if (url.includes('/orders/export')) {
        return Promise.resolve({ data: new ArrayBuffer(8) });
      }
      return Promise.resolve({ data: { data: [] } });
    });

    render(<OrdersHistoryPage />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Ekspor Excel/i })).toBeDefined();
    });

    const exportBtn = screen.getByRole('button', { name: /Ekspor Excel/i });
    fireEvent.click(exportBtn);

    await waitFor(() => {
      expect(apiClient.get).toHaveBeenCalledWith(
        '/orders/export',
        expect.objectContaining({ responseType: 'blob' }),
      );
    });
  });
});
