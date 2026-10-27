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
    (apiClient.get as any).mockImplementation((url: string) => {
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

  it('renders empty state when no orders match', async () => {
    (apiClient.get as any).mockImplementation((url: string) => {
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
});
