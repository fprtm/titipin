import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import React from 'react';
import DashboardPage from './page';
import { apiClient } from '../../../lib/api-client';

vi.mock('../../../lib/api-client', () => ({
  apiClient: {
    get: vi.fn(),
  },
}));

describe('DashboardPage Component', () => {
  const mockSummary = {
    period: 'daily',
    total_transactions: 15,
    total_sales_amount: 350000,
    top_products: [
      {
        productId: 1,
        productName: 'Kopi Susu Gula Aren',
        totalSold: 25,
        revenue: 250000,
      },
    ],
    slow_products: [
      {
        productId: 2,
        productName: 'Teh Hijau Celup',
        currentStock: 20,
        totalSold: 0,
      },
    ],
    low_stock_products: [
      {
        id: 3,
        productCode: 'P0003',
        productName: 'Snack Keripik Singkong',
        stock: 2,
        price: '15000',
      },
    ],
  };

  const mockTrend = [
    { date: '2026-10-28', transactions: 15, revenue: 350000 },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    (apiClient.get as any).mockImplementation((url: string) => {
      if (url.includes('/dashboard/summary')) {
        return Promise.resolve({ data: { data: mockSummary } });
      }
      if (url.includes('/dashboard/trend')) {
        return Promise.resolve({ data: { data: mockTrend } });
      }
      return Promise.resolve({ data: { data: null } });
    });
  });

  it('renders 4 KPI stat cards with correct metrics and formatted values', async () => {
    render(<DashboardPage />);

    expect(screen.getByText('Total Omset')).toBeDefined();
    expect(screen.getByText('Total Order')).toBeDefined();
    expect(screen.getByText('Produk Juara')).toBeDefined();
    expect(screen.getByText('Stok Kritis (<5)')).toBeDefined();

    await waitFor(() => {
      expect(screen.getAllByText(/350\.000/).length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('Transaksi')).toBeDefined();
      expect(screen.getAllByText('Kopi Susu Gula Aren').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('25 Unit Terjual')).toBeDefined();
      expect(screen.getByText('Item')).toBeDefined();
    });
  });

  it('allows switching period between Hari Ini, Bulan Ini, and Kuartal Ini', async () => {
    render(<DashboardPage />);

    await waitFor(() => {
      expect(apiClient.get).toHaveBeenCalledWith(
        '/dashboard/summary',
        expect.objectContaining({ params: { period: 'daily' } }),
      );
    });

    const monthButton = screen.getByText('Bulan Ini');
    fireEvent.click(monthButton);

    await waitFor(() => {
      expect(apiClient.get).toHaveBeenCalledWith(
        '/dashboard/summary',
        expect.objectContaining({ params: { period: 'monthly' } }),
      );
    });
  });

  it('renders top 5 best seller and bottom 5 slow mover products', async () => {
    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText('Top 5 Produk Terlaris')).toBeDefined();
      expect(screen.getByText('Bottom 5 Produk Perlu Perhatian')).toBeDefined();
      expect(screen.getAllByText('Kopi Susu Gula Aren').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('Teh Hijau Celup')).toBeDefined();
      expect(screen.getByText('0 Terjual')).toBeDefined();
    });
  });
});
