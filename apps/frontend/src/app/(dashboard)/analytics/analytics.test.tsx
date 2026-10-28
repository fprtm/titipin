import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import React from 'react';
import AnalyticsPage from './page';
import { apiClient } from '../../../lib/api-client';
import { Role } from '@titipin/shared';
import type { UserItem, AnalyticsOverviewData } from '@titipin/shared';

// Mock ResizeObserver for Recharts
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

const mockAdminUser: UserItem = {
  id: 'admin-uuid-1',
  name: 'Admin Toko',
  email: 'admin@titipin.id',
  role: Role.ADMIN,
  createdAt: new Date().toISOString(),
};

const mockCashierUser: UserItem = {
  id: 'cashier-uuid-1',
  name: 'Kasir Satu',
  email: 'kasir@titipin.id',
  role: Role.CASHIER,
  createdAt: new Date().toISOString(),
};

let currentAuthUser: UserItem | null = mockAdminUser;

vi.mock('../../../hooks/use-auth', () => ({
  useAuth: () => ({
    user: currentAuthUser,
    isLoading: false,
  }),
}));

vi.mock('../../../lib/api-client', () => ({
  apiClient: {
    get: vi.fn(),
  },
}));

describe('AnalyticsPage Component', () => {
  const mockAnalyticsData: AnalyticsOverviewData = {
    period: 'monthly',
    totalRevenue: 2850000,
    totalTransactions: 35,
    averageOrderValue: 81429,
    peakHour: 'Pukul 14:00',
    topDay: 'Sabtu',
    trend: [
      {
        date: '2026-10-01',
        label: '01 Okt',
        revenue: 120000,
        transactions: 2,
        aov: 60000,
      },
      {
        date: '2026-10-02',
        label: '02 Okt',
        revenue: 250000,
        transactions: 4,
        aov: 62500,
      },
    ],
    hourlyTraffic: [
      { hour: '14:00', transactions: 10, revenue: 800000, percentage: 28 },
      { hour: '15:00', transactions: 8, revenue: 600000, percentage: 22 },
    ],
    dayOfWeekTraffic: [
      { dayIndex: 0, dayName: 'Minggu', transactions: 5, revenue: 400000, avgOrderValue: 80000 },
      { dayIndex: 6, dayName: 'Sabtu', transactions: 12, revenue: 1100000, avgOrderValue: 91667 },
    ],
    bundlingSuggestions: [
      {
        productAId: 1,
        productAName: 'Minyak Goreng Sania 2L',
        productBId: 2,
        productBName: 'Beras Premium 5kg',
        coOccurrenceCount: 8,
        combinedRevenue: 750000,
        suggestedDiscountPercent: 10,
      },
    ],
    customerSegmentation: {
      memberOrders: 20,
      memberRevenue: 2100000,
      memberAov: 105000,
      walkInOrders: 15,
      walkInRevenue: 750000,
      walkInAov: 50000,
      memberRevenueSharePercent: 74,
      birthdayDiscountOrdersCount: 2,
      birthdayDiscountTotalGiven: 10000,
    },
    actionableInsights: [
      {
        id: 'insight-bundling-1',
        category: 'BUNDLING',
        title: 'Paket Hemat: Minyak Goreng + Beras',
        description: 'Produk sering dibeli bersamaan.',
        impact: 'Potensi kenaikan AOV hingga +12%.',
        priority: 'HIGH',
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    currentAuthUser = mockAdminUser;
    vi.mocked(apiClient.get).mockResolvedValue({
      data: {
        success: true,
        data: mockAnalyticsData,
      },
    });
  });

  it('renders Access Denied view when logged in user is a Cashier', async () => {
    currentAuthUser = mockCashierUser;
    render(<AnalyticsPage />);

    expect(screen.getByText('Akses Khusus Admin')).toBeDefined();
    expect(
      screen.getByText(/Halaman Analisis Penjualan & Intelijen Bisnis hanya dapat diakses oleh Administrator/i),
    ).toBeDefined();
    expect(screen.getByRole('link', { name: /Kembali ke Kasir POS/i })).toBeDefined();
  });

  it('renders complete sales analytics dashboard with KPI glass cards for Admin', async () => {
    render(<AnalyticsPage />);

    // Header check
    expect(screen.getByText('Analisis Penjualan')).toBeDefined();
    expect(screen.getByText(/Business Intelligence & Sales Insights/i)).toBeDefined();

    // Wait for data load
    await waitFor(() => {
      expect(screen.getByText('Total Omset')).toBeDefined();
    });

    // Check KPI cards
    expect(screen.getByText(/Volume & AOV/i)).toBeDefined();
    expect(screen.getByText(/Jam Paling Sibuk/i)).toBeDefined();
    expect(screen.getAllByText(/Pukul 14:00/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Pangsa Member/i)).toBeDefined();
    expect(screen.getAllByText(/74%/i).length).toBeGreaterThanOrEqual(1);

    // Check Market Basket Bundling
    expect(screen.getByText(/Rekomendasi Paket Bundling Hemat/i)).toBeDefined();
    expect(screen.getByText('Minyak Goreng Sania 2L')).toBeDefined();
    expect(screen.getByText('Beras Premium 5kg')).toBeDefined();
    expect(screen.getByText(/Diskon 10%/i)).toBeDefined();

    // Check Customer Segmentation
    expect(screen.getByText(/Segmentasi: Pelanggan Terdaftar \(Member\) vs Umum/i)).toBeDefined();
    expect(screen.getByText(/Pelanggan Member/i)).toBeDefined();
    expect(screen.getByText(/Pelanggan Umum \(Walk-in\)/i)).toBeDefined();

    // Check Actionable Insights
    expect(screen.getByText(/Rekomendasi Bisnis & Tindakan Strategis/i)).toBeDefined();
    expect(screen.getByText('Paket Hemat: Minyak Goreng + Beras')).toBeDefined();
    expect(screen.getByText(/Potensi kenaikan AOV hingga \+12%/i)).toBeDefined();
  });

  it('switches period filter when button is clicked and fetches updated analytics', async () => {
    render(<AnalyticsPage />);

    await waitFor(() => {
      expect(screen.getByText('Analisis Penjualan')).toBeDefined();
    });

    // Click 'Tahun Ini' filter
    const yearlyBtn = screen.getByRole('button', { name: 'Tahun Ini' });
    fireEvent.click(yearlyBtn);

    await waitFor(() => {
      expect(apiClient.get).toHaveBeenCalledWith(
        '/analytics/overview',
        expect.objectContaining({
          params: expect.objectContaining({ period: 'yearly' }),
        }),
      );
    });
  });

  it('triggers manual refresh when refresh button is clicked', async () => {
    render(<AnalyticsPage />);

    await waitFor(() => {
      expect(screen.getByText('Analisis Penjualan')).toBeDefined();
    });

    const refreshBtn = screen.getByTitle('Muat ulang data');
    fireEvent.click(refreshBtn);

    await waitFor(() => {
      expect(apiClient.get).toHaveBeenCalledTimes(2);
    });
  });
});
