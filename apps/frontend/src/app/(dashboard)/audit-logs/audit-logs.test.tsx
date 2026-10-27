import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import React from 'react';
import AuditLogsPage from './page';
import { apiClient } from '../../../lib/api-client';

vi.mock('../../../lib/api-client', () => ({
  apiClient: {
    get: vi.fn(),
  },
}));

describe('AuditLogsPage Component', () => {
  const mockAuditLogs = [
    {
      id: 1,
      userId: 'usr-1',
      userName: 'Admin Titipin',
      action: 'ORDER_CREATED',
      entityType: 'ORDER',
      entityId: 'ord-101',
      payload: { before: null, after: { total: 50000 } },
      ipAddress: '127.0.0.1',
      userAgent: 'Mozilla/5.0',
      createdAt: '2026-10-28T09:00:00.000Z',
    },
    {
      id: 2,
      userId: 'usr-2',
      userName: 'Kasir Satu',
      action: 'PRODUCT_UPDATED',
      entityType: 'PRODUCT',
      entityId: 'prod-202',
      payload: { before: { stock: 10 }, after: { stock: 8 } },
      ipAddress: '192.168.1.1',
      userAgent: 'Chrome/120.0',
      createdAt: '2026-10-28T09:30:00.000Z',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(apiClient.get).mockImplementation((url: string) => {
      if (url.includes('/audit-logs')) {
        return Promise.resolve({
          data: {
            data: {
              items: mockAuditLogs,
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

  it('renders audit trail page header and filter toolbar', async () => {
    render(<AuditLogsPage />);

    expect(screen.getByText('Audit Trail & Log Aktivitas Sistem')).toBeDefined();
    expect(screen.getByLabelText('Filter Aksi')).toBeDefined();
    expect(screen.getByLabelText('Filter Entitas')).toBeDefined();
    expect(screen.getByLabelText('Dari Tanggal')).toBeDefined();
    expect(screen.getByLabelText('Sampai Tanggal')).toBeDefined();
  });

  it('fetches and renders audit log rows with action badges and usernames', async () => {
    render(<AuditLogsPage />);

    await waitFor(() => {
      expect(screen.getByText('Admin Titipin')).toBeDefined();
      expect(screen.getByText('Kasir Satu')).toBeDefined();
      expect(screen.getAllByText('ORDER_CREATED').length).toBeGreaterThanOrEqual(2);
      expect(screen.getAllByText('PRODUCT_UPDATED').length).toBeGreaterThanOrEqual(2);
    });
  });

  it('allows filtering by action', async () => {
    render(<AuditLogsPage />);

    await waitFor(() => {
      expect(screen.getByText('Admin Titipin')).toBeDefined();
    });

    const actionSelect = screen.getByLabelText('Filter Aksi');
    fireEvent.change(actionSelect, { target: { value: 'ORDER_CREATED' } });

    await waitFor(() => {
      expect(apiClient.get).toHaveBeenCalledWith(
        '/audit-logs',
        expect.objectContaining({
          params: expect.objectContaining({ action: 'ORDER_CREATED' }),
        }),
      );
    });
  });

  it('opens and closes diff modal when Lihat Diff button is clicked', async () => {
    render(<AuditLogsPage />);

    await waitFor(() => {
      expect(screen.getByText('Admin Titipin')).toBeDefined();
    });

    const diffButtons = screen.getAllByText('Lihat Diff');
    fireEvent.click(diffButtons[0]);

    await waitFor(() => {
      expect(screen.getByText(/Inspeksi Diff Mutasi Log #1/)).toBeDefined();
    });

    const closeButton = screen.getByLabelText('Tutup Modal');
    fireEvent.click(closeButton);

    await waitFor(() => {
      expect(screen.queryByText(/Inspeksi Diff Mutasi Log #1/)).toBeNull();
    });
  });

  it('renders empty state when no audit records are found', async () => {
    vi.mocked(apiClient.get).mockImplementation((url: string) => {
      if (url.includes('/audit-logs')) {
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

    render(<AuditLogsPage />);

    await waitFor(() => {
      expect(screen.getByText('Tidak ada log aktivitas')).toBeDefined();
    });
  });
});
