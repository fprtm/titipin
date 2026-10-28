import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ChangePasswordModal } from './change-password-modal';
import { apiClient } from '../../lib/api-client';

vi.mock('../../lib/api-client', () => ({
  apiClient: {
    post: vi.fn(),
  },
}));

describe('ChangePasswordModal Component', () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not render when isOpen is false', () => {
    render(<ChangePasswordModal isOpen={false} onClose={mockOnClose} />);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('renders modal with form inputs when isOpen is true', () => {
    render(<ChangePasswordModal isOpen={true} onClose={mockOnClose} />);
    expect(screen.getByRole('dialog')).toBeDefined();
    expect(screen.getByText('Ubah Kata Sandi')).toBeDefined();
    expect(screen.getByLabelText(/Kata Sandi Saat Ini/i)).toBeDefined();
    expect(screen.getByLabelText(/^Kata Sandi Baru/i)).toBeDefined();
    expect(screen.getByLabelText(/Konfirmasi Kata Sandi Baru/i)).toBeDefined();
    expect(screen.getByRole('button', { name: /Simpan Kata Sandi/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /Batal/i })).toBeDefined();
  });

  it('shows validation errors when fields are empty or invalid', async () => {
    render(<ChangePasswordModal isOpen={true} onClose={mockOnClose} />);

    fireEvent.click(screen.getByRole('button', { name: /Simpan Kata Sandi/i }));

    await waitFor(() => {
      expect(screen.getByText('Kata sandi saat ini wajib diisi')).toBeDefined();
    });

    expect(apiClient.post).not.toHaveBeenCalled();
  });

  it('shows error when new password is less than 8 characters', async () => {
    render(<ChangePasswordModal isOpen={true} onClose={mockOnClose} />);

    fireEvent.change(screen.getByLabelText(/Kata Sandi Saat Ini/i), {
      target: { value: 'password123' },
    });
    fireEvent.change(screen.getByLabelText(/^Kata Sandi Baru/i), {
      target: { value: 'short' },
    });
    fireEvent.change(screen.getByLabelText(/Konfirmasi Kata Sandi Baru/i), {
      target: { value: 'short' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Simpan Kata Sandi/i }));

    await waitFor(() => {
      expect(screen.getByText('Kata sandi baru minimal 8 karakter')).toBeDefined();
    });

    expect(apiClient.post).not.toHaveBeenCalled();
  });

  it('shows error when password confirmation does not match', async () => {
    render(<ChangePasswordModal isOpen={true} onClose={mockOnClose} />);

    fireEvent.change(screen.getByLabelText(/Kata Sandi Saat Ini/i), {
      target: { value: 'password123' },
    });
    fireEvent.change(screen.getByLabelText(/^Kata Sandi Baru/i), {
      target: { value: 'newpassword123' },
    });
    fireEvent.change(screen.getByLabelText(/Konfirmasi Kata Sandi Baru/i), {
      target: { value: 'mismatchpass' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Simpan Kata Sandi/i }));

    await waitFor(() => {
      expect(screen.getByText('Konfirmasi kata sandi tidak cocok')).toBeDefined();
    });

    expect(apiClient.post).not.toHaveBeenCalled();
  });

  it('submits form successfully and shows success message', async () => {
    vi.mocked(apiClient.post).mockResolvedValueOnce({
      data: { message: 'Kata sandi berhasil diubah' },
    });

    render(<ChangePasswordModal isOpen={true} onClose={mockOnClose} />);

    fireEvent.change(screen.getByLabelText(/Kata Sandi Saat Ini/i), {
      target: { value: 'oldPassword123' },
    });
    fireEvent.change(screen.getByLabelText(/^Kata Sandi Baru/i), {
      target: { value: 'newPassword123' },
    });
    fireEvent.change(screen.getByLabelText(/Konfirmasi Kata Sandi Baru/i), {
      target: { value: 'newPassword123' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Simpan Kata Sandi/i }));

    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalledWith('/auth/change-password', {
        current_password: 'oldPassword123',
        new_password: 'newPassword123',
        new_password_confirmation: 'newPassword123',
      });
      expect(screen.getByText('Kata sandi berhasil diubah')).toBeDefined();
    });
  });

  it('displays backend error message when request fails', async () => {
    vi.mocked(apiClient.post).mockRejectedValueOnce({
      response: {
        data: {
          message: 'Kata sandi saat ini tidak cocok',
        },
      },
    });

    render(<ChangePasswordModal isOpen={true} onClose={mockOnClose} />);

    fireEvent.change(screen.getByLabelText(/Kata Sandi Saat Ini/i), {
      target: { value: 'wrongPassword' },
    });
    fireEvent.change(screen.getByLabelText(/^Kata Sandi Baru/i), {
      target: { value: 'newPassword123' },
    });
    fireEvent.change(screen.getByLabelText(/Konfirmasi Kata Sandi Baru/i), {
      target: { value: 'newPassword123' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Simpan Kata Sandi/i }));

    await waitFor(() => {
      expect(screen.getByText('Kata sandi saat ini tidak cocok')).toBeDefined();
    });
  });

  it('toggles password visibility when eye button is clicked', () => {
    render(<ChangePasswordModal isOpen={true} onClose={mockOnClose} />);

    const currentPasswordInput = screen.getByLabelText(/Kata Sandi Saat Ini/i) as HTMLInputElement;
    expect(currentPasswordInput.type).toBe('password');

    const toggleButton = screen.getByRole('button', { name: 'Tampilkan kata sandi' });
    fireEvent.click(toggleButton);

    expect(currentPasswordInput.type).toBe('text');
  });

  it('calls onClose when Batal or X button is clicked', () => {
    render(<ChangePasswordModal isOpen={true} onClose={mockOnClose} />);

    const cancelButton = screen.getByRole('button', { name: /Batal/i });
    fireEvent.click(cancelButton);

    expect(mockOnClose).toHaveBeenCalled();
  });
});
