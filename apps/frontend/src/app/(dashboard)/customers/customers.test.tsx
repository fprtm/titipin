import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import CustomersPage from './page';
import { apiClient } from '../../../lib/api-client';
import { Role, Gender } from '@titipin/shared';
import type { UserItem, CustomerItem } from '@titipin/shared';

// Mock useAuth
const mockAdminUser: UserItem = {
  id: 'admin-uuid-1',
  name: 'Super Admin',
  email: 'admin@titipin.id',
  role: Role.ADMIN,
  createdAt: new Date().toISOString(),
};

const mockCashierUser: UserItem = {
  id: 'cashier-uuid-2',
  name: 'Kasir Satu',
  email: 'kasir@titipin.id',
  role: Role.CASHIER,
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

describe('CustomersPage Component', () => {
  const today = new Date();
  const todayMM = String(today.getMonth() + 1).padStart(2, '0');
  const todayDD = String(today.getDate()).padStart(2, '0');
  const todayBirthday = `1990-${todayMM}-${todayDD}`;

  const mockCustomersList: CustomerItem[] = [
    {
      id: 'cust-uuid-1',
      customerName: 'Budi Santoso',
      customerAddress: 'Jl. Surya Kencana No. 42 Bogor',
      gender: Gender.PRIA,
      birthDate: todayBirthday, // birthday is today
      phone: '081299881122',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      deletedAt: null,
      customer_name: 'Budi Santoso',
      customer_address: 'Jl. Surya Kencana No. 42 Bogor',
      birth_date: todayBirthday,
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
    },
    {
      id: 'cust-uuid-2',
      customerName: 'Siti Rahma',
      customerAddress: 'Jl. Sudirman No. 88 Jakarta',
      gender: Gender.WANITA,
      birthDate: '1995-12-25', // birthday not today
      phone: '081377889900',
      createdAt: '2026-01-02T00:00:00.000Z',
      updatedAt: '2026-01-02T00:00:00.000Z',
      deletedAt: null,
      customer_name: 'Siti Rahma',
      customer_address: 'Jl. Sudirman No. 88 Jakarta',
      birth_date: '1995-12-25',
      created_at: '2026-01-02T00:00:00.000Z',
      updated_at: '2026-01-02T00:00:00.000Z',
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
        data: mockCustomersList,
        meta: {
          page: 1,
          per_page: 10,
          total_items: 2,
          total_pages: 1,
        },
      },
    } as never);
  });

  it('renders customer dashboard with header, KPI cards, and customer table', async () => {
    render(<CustomersPage />);

    expect(screen.getByText('Data Pelanggan & Member')).toBeDefined();
    expect(screen.getByText('Total Member')).toBeDefined();
    expect(screen.getByText('Member Pria')).toBeDefined();
    expect(screen.getByText('Member Wanita')).toBeDefined();
    expect(screen.getByText('Ultah Hari Ini')).toBeDefined();

    await waitFor(() => {
      expect(screen.getByText('Budi Santoso')).toBeDefined();
      expect(screen.getByText('Siti Rahma')).toBeDefined();
      expect(screen.getByText('081299881122')).toBeDefined();
      expect(screen.getByText('081377889900')).toBeDefined();
    });
  });

  it('correctly marks customer with birthday badge when birth date matches today (BR-006)', async () => {
    render(<CustomersPage />);

    await waitFor(() => {
      expect(screen.getByText('Budi Santoso')).toBeDefined();
      expect(screen.getByText('Ultah!')).toBeDefined();
    });
  });

  it('RBAC: Cashier can see + Tambah Pelanggan button but CANNOT see Ubah and Hapus buttons', async () => {
    authState = {
      user: mockCashierUser,
    };

    render(<CustomersPage />);

    await waitFor(() => {
      expect(screen.getByText('Budi Santoso')).toBeDefined();
    });

    // Cashier CAN see + Tambah Pelanggan button
    expect(screen.getByRole('button', { name: /\+ tambah pelanggan/i })).toBeDefined();

    // Cashier CANNOT see Ubah or Hapus buttons
    expect(screen.queryByTitle('Ubah data pelanggan')).toBeNull();
    expect(screen.queryByTitle('Hapus pelanggan')).toBeNull();
  });

  it('RBAC: Admin sees both + Tambah Pelanggan, Ubah, and Hapus buttons', async () => {
    authState = {
      user: mockAdminUser,
    };

    render(<CustomersPage />);

    await waitFor(() => {
      expect(screen.getByText('Budi Santoso')).toBeDefined();
    });

    expect(screen.getByRole('button', { name: /\+ tambah pelanggan/i })).toBeDefined();
    const editButtons = screen.getAllByTitle('Ubah data pelanggan');
    expect(editButtons.length).toBeGreaterThanOrEqual(1);
    const deleteButtons = screen.getAllByTitle('Hapus pelanggan');
    expect(deleteButtons.length).toBeGreaterThanOrEqual(1);
  });

  it('opens registration modal, validates input, and creates customer on submit', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({
      data: {
        success: true,
        data: {
          id: 'new-cust-uuid',
          customerName: 'Dewi Sartika',
          customerAddress: 'Jl. Pahlawan No. 20 Bogor',
          gender: Gender.WANITA,
          birthDate: '1999-05-10',
          phone: '081200001111',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      },
    } as never);

    render(<CustomersPage />);

    const addButton = screen.getByRole('button', { name: /\+ tambah pelanggan/i });
    fireEvent.click(addButton);

    expect(screen.getByText('Daftar Pelanggan Baru')).toBeDefined();

    // Fill form
    fireEvent.change(screen.getByPlaceholderText('Contoh: Budi Santoso'), {
      target: { value: 'Dewi Sartika' },
    });
    fireEvent.click(screen.getByRole('button', { name: /wanita/i }));
    fireEvent.change(screen.getByLabelText(/nomor telepon/i), {
      target: { value: '081200001111' },
    });
    fireEvent.change(screen.getByPlaceholderText('Contoh: Jl. Surya Kencana No. 42 Bogor'), {
      target: { value: 'Jl. Pahlawan No. 20 Bogor' },
    });

    // Date input
    const dateInput = document.querySelector('input[type="date"]');
    if (dateInput) {
      fireEvent.change(dateInput, { target: { value: '1999-05-10' } });
    }

    const submitButton = screen.getByRole('button', { name: /^daftar pelanggan$/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalledWith(
        '/customers',
        expect.objectContaining({
          customer_name: 'Dewi Sartika',
          gender: 'Wanita',
          birth_date: '1999-05-10',
          phone: '081200001111',
          customer_address: 'Jl. Pahlawan No. 20 Bogor',
        }),
      );
    });
  });

  it('opens edit modal and updates customer profile', async () => {
    vi.mocked(apiClient.put).mockResolvedValue({
      data: {
        success: true,
        data: {
          ...mockCustomersList[0],
          customerName: 'Budi Santoso Edit',
        },
      },
    } as never);

    render(<CustomersPage />);

    await waitFor(() => {
      expect(screen.getByText('Budi Santoso')).toBeDefined();
    });

    const editButtons = screen.getAllByTitle('Ubah data pelanggan');
    fireEvent.click(editButtons[0]);

    expect(screen.getByText('Ubah Data Pelanggan')).toBeDefined();

    const nameInput = screen.getByDisplayValue('Budi Santoso');
    fireEvent.change(nameInput, { target: { value: 'Budi Santoso Edit' } });

    const saveButton = screen.getByRole('button', { name: /simpan perubahan/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(apiClient.put).toHaveBeenCalledWith(
        `/customers/${mockCustomersList[0].id}`,
        expect.objectContaining({
          customer_name: 'Budi Santoso Edit',
        }),
      );
    });
  });

  it('opens delete confirmation and executes soft-delete', async () => {
    vi.mocked(apiClient.delete).mockResolvedValue({
      data: {
        success: true,
        message: 'Data pelanggan berhasil dihapus',
      },
    } as never);

    render(<CustomersPage />);

    await waitFor(() => {
      expect(screen.getByText('Budi Santoso')).toBeDefined();
    });

    const deleteButtons = screen.getAllByTitle('Hapus pelanggan');
    fireEvent.click(deleteButtons[0]);

    expect(screen.getByText('Hapus Pelanggan?')).toBeDefined();
    expect(screen.getByText(/pelanggan akan di-soft delete dan tidak muncul lagi di pencarian kasir/i)).toBeDefined();

    // Click confirm delete button
    const confirmDeleteButton = screen.getByRole('button', { name: /^hapus pelanggan$/i });
    fireEvent.click(confirmDeleteButton);

    await waitFor(() => {
      expect(apiClient.delete).toHaveBeenCalledWith(`/customers/${mockCustomersList[0].id}`);
    });
  });
});
