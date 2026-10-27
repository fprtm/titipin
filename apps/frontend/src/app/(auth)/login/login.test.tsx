import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import LoginPage from './page';

// Mock useAuth hook
const mockLogin = vi.fn();
vi.mock('../../../hooks/use-auth', () => ({
  useAuth: () => ({
    login: mockLogin,
    user: null,
    accessToken: null,
    isLoading: false,
    isAuthenticated: false,
  }),
}));

describe('LoginPage Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders brand header, inputs, and submit button', () => {
    render(<LoginPage />);

    expect(screen.getByText('Titipin POS')).toBeDefined();
    expect(screen.getByText('Sistem Kasir & Order Management')).toBeDefined();
    expect(screen.getByLabelText('Email Staf')).toBeDefined();
    expect(screen.getByLabelText('Kata Sandi')).toBeDefined();
    expect(screen.getByRole('button', { name: /masuk ke sistem/i })).toBeDefined();
  });

  it('shows Zod validation errors on empty submission without calling login', async () => {
    render(<LoginPage />);

    const submitButton = screen.getByRole('button', { name: /masuk ke sistem/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Email wajib diisi')).toBeDefined();
      expect(screen.getByText('Kata sandi wajib diisi')).toBeDefined();
    });

    expect(mockLogin).not.toHaveBeenCalled();
  });

  it('toggles password visibility when toggle button is clicked', () => {
    render(<LoginPage />);

    const passwordInput = screen.getByLabelText('Kata Sandi') as HTMLInputElement;
    expect(passwordInput.type).toBe('password');

    const toggleButton = screen.getByLabelText('Tampilkan kata sandi');
    fireEvent.click(toggleButton);

    expect(passwordInput.type).toBe('text');

    const hideButton = screen.getByLabelText('Sembunyikan kata sandi');
    fireEvent.click(hideButton);

    expect(passwordInput.type).toBe('password');
  });

  it('calls login with email and password when valid credentials are submitted', async () => {
    mockLogin.mockResolvedValueOnce({
      id: 'user-1',
      name: 'Admin',
      email: 'admin@titipin.id',
      role: 'ADMIN',
    });

    render(<LoginPage />);

    fireEvent.change(screen.getByLabelText('Email Staf'), {
      target: { value: 'admin@titipin.id' },
    });
    fireEvent.change(screen.getByLabelText('Kata Sandi'), {
      target: { value: 'Admin123!' },
    });

    const submitButton = screen.getByRole('button', { name: /masuk ke sistem/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith({
        email: 'admin@titipin.id',
        password: 'Admin123!',
      });
    });
  });

  it('displays 401 error banner when login fails with invalid credentials', async () => {
    mockLogin.mockRejectedValueOnce({
      response: {
        status: 401,
        data: { message: 'Invalid credentials' },
      },
    });

    render(<LoginPage />);

    fireEvent.change(screen.getByLabelText('Email Staf'), {
      target: { value: 'admin@titipin.id' },
    });
    fireEvent.change(screen.getByLabelText('Kata Sandi'), {
      target: { value: 'WrongPassword' },
    });

    fireEvent.click(screen.getByRole('button', { name: /masuk ke sistem/i }));

    await waitFor(() => {
      expect(
        screen.getByText('Email atau kata sandi tidak valid. Silakan coba kembali.'),
      ).toBeDefined();
    });
  });
});
