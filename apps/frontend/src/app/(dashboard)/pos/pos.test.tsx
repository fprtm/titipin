import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import PosPage from './page';
import { apiClient } from '../../../lib/api-client';
import { Role, Gender } from '@titipin/shared';
import type { UserItem, ProductItem, CustomerItem } from '@titipin/shared';

// Mock useAuth
const mockCashierUser: UserItem = {
  id: 'cashier-uuid-1',
  name: 'Kasir Satu',
  email: 'kasir@titipin.id',
  role: Role.CASHIER,
  createdAt: new Date().toISOString(),
};

const authState = {
  user: mockCashierUser as UserItem | null,
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

describe('PosPage Component', () => {
  const mockProductsList: ProductItem[] = [
    {
      id: 1,
      productCode: 'P0001',
      productName: 'Kopi Susu Gula Aren',
      product_code: 'P0001',
      product_name: 'Kopi Susu Gula Aren',
      price: '18000',
      stock: 25,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deletedAt: null,
      deleted_at: null,
    },
    {
      id: 2,
      productCode: 'P0002',
      productName: 'Roti Bakar Cokelat',
      product_code: 'P0002',
      product_name: 'Roti Bakar Cokelat',
      price: '15000',
      stock: 10,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deletedAt: null,
      deleted_at: null,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(apiClient.get).mockImplementation(((url: string) => {
      if (url === '/products') {
        return Promise.resolve({ data: { success: true, data: mockProductsList } });
      }
      if (url === '/orders/draft') {
        return Promise.resolve({ data: { success: true, data: null } });
      }
      if (url === '/customers') {
        return Promise.resolve({ data: { success: true, data: [] } });
      }
      return Promise.resolve({ data: { data: [] } });
    }) as never);
  });

  it('renders POS interface with product catalog and empty cart panel', async () => {
    render(<PosPage />);

    expect(await screen.findByText('Kopi Susu Gula Aren')).toBeDefined();
    expect(screen.getByText('Roti Bakar Cokelat')).toBeDefined();
    expect(screen.getByText('Keranjang Kasir')).toBeDefined();
    expect(screen.getByText('Keranjang masih kosong')).toBeDefined();
    expect(screen.getByText('Pelanggan Umum')).toBeDefined();
  });

  it('adds product to cart when clicked and updates subtotal and total amount', async () => {
    render(<PosPage />);

    const productCard = await screen.findByText('Kopi Susu Gula Aren');
    fireEvent.click(productCard);

    // Cart item should now be present
    await waitFor(() => {
      expect(screen.getByText('Rp 18.000 / pcs')).toBeDefined();
    });

    // Subtotal and Total amount
    expect(screen.getAllByText('Rp 18.000').length).toBeGreaterThanOrEqual(1);

    // Click again to increment quantity
    fireEvent.click(productCard);
    await waitFor(() => {
      expect(screen.getAllByText('Rp 36.000').length).toBeGreaterThanOrEqual(1);
    });
  });

  it('opens payment modal, calculates change correctly, and processes checkout', async () => {
    vi.mocked(apiClient.post).mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          id: 101,
          invoiceNumber: 'INV-20261028-0001',
          totalAmount: 18000,
          totalPaid: 20000,
          change: 2000,
        },
      },
    } as never);

    render(<PosPage />);

    const productCard = await screen.findByText('Kopi Susu Gula Aren');
    fireEvent.click(productCard);

    const checkoutBtn = await screen.findByText(/Bayar Sekarang/);
    fireEvent.click(checkoutBtn);

    // Payment modal opens
    expect(await screen.findByText('Pembayaran Tunai')).toBeDefined();
    expect(screen.getByText('Total Wajib Bayar')).toBeDefined();

    // Fill cash given Rp 20.000
    const cashInput = screen.getByLabelText(/Nominal Tunai Diterima/);
    fireEvent.change(cashInput, { target: { value: '20000' } });

    // Change should be Rp 2.000
    await waitFor(() => {
      expect(screen.getByText('Rp 2.000')).toBeDefined();
    });

    // Click Selesaikan Pembayaran
    const submitBtn = screen.getByText('Selesaikan Pembayaran');
    fireEvent.click(submitBtn);

    // Receipt modal opens
    await waitFor(() => {
      expect(screen.getByText('Transaksi Berhasil')).toBeDefined();
      expect(screen.getByText('INV-20261028-0001')).toBeDefined();
    });
  });

  it('applies 5% birthday discount (BR-006) when customer birthday is today', async () => {
    const today = new Date();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const todayBirth = `1992-${mm}-${dd}`;

    const birthdayMember: CustomerItem = {
      id: 'member-bday-1',
      customerName: 'Ani Ultah',
      phone: '081234567890',
      gender: Gender.WANITA,
      birthDate: todayBirth,
      customerAddress: 'Bogor',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    (apiClient.get as any).mockImplementation((url: string) => {
      if (url === '/products') {
        return Promise.resolve({ data: { success: true, data: mockProductsList } });
      }
      if (url === '/customers') {
        return Promise.resolve({ data: { success: true, data: [birthdayMember] } });
      }
      return Promise.resolve({ data: { data: null } });
    });

    render(<PosPage />);

    // Add Rp 18.000 product
    const productCard = await screen.findByText('Kopi Susu Gula Aren');
    fireEvent.click(productCard);

    // Select Member tab
    const memberTab = screen.getByText('Member');
    fireEvent.click(memberTab);

    // Type in search member input to trigger search dropdown
    const searchInput = screen.getByPlaceholderText('Cari nama member atau no telepon...');
    fireEvent.change(searchInput, { target: { value: 'Ani' } });

    // Select member from dropdown
    const memberResult = await screen.findByText('Ani Ultah');
    fireEvent.click(memberResult);

    // Subtotal 18000 * 5% = 900
    await waitFor(() => {
      expect(screen.getByText(/Diskon Ulang Tahun \(5%\)/)).toBeDefined();
      expect(screen.getByText('-Rp 900')).toBeDefined();
      expect(screen.getByText('Rp 17.100')).toBeDefined();
    });
  });

  it('holds cart to draft_orders and sends payload to /orders/hold', async () => {
    (apiClient.post as any).mockResolvedValueOnce({
      data: { success: true, message: 'Draft order created' },
    });

    render(<PosPage />);

    const productCard = await screen.findByText('Kopi Susu Gula Aren');
    fireEvent.click(productCard);

    const holdBtn = await screen.findByText('Tahan Transaksi');
    fireEvent.click(holdBtn);

    // Post to /orders/hold called
    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalledWith(
        '/orders/hold',
        expect.objectContaining({
          items: [{ product_id: 1, quantity: 1 }],
        }),
      );
    });
  });
});
