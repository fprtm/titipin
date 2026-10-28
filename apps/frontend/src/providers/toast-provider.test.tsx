import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import React from 'react';
import { ToastProvider, useToast } from './toast-provider';

function TestConsumer() {
  const { toast } = useToast();

  return (
    <div>
      <button
        type="button"
        onClick={() => toast.success('Operasi Berhasil', { description: 'Data produk telah disimpan.' })}
      >
        Trigger Success
      </button>
      <button
        type="button"
        onClick={() => toast.error('Operasi Gagal', { description: 'Koneksi database bermasalah.' })}
      >
        Trigger Error
      </button>
      <button
        type="button"
        onClick={() => toast.warning('Peringatan Stok', { description: 'Sisa stok kurang dari 5.' })}
      >
        Trigger Warning
      </button>
      <button
        type="button"
        onClick={() => toast.info('Informasi Sistem', { description: 'Pembaruan aplikasi tersedia.' })}
      >
        Trigger Info
      </button>
      <button
        type="button"
        onClick={() => toast.success('Auto Dismiss Toast', { duration: 2000 })}
      >
        Trigger Auto Dismiss
      </button>
    </div>
  );
}

describe('ToastProvider & useToast', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns fallback no-op toast methods when used outside of ToastProvider without throwing', () => {
    expect(() => render(<TestConsumer />)).not.toThrow();
  });

  it('renders and displays success, error, warning, and info toasts', () => {
    render(
      <ToastProvider>
        <TestConsumer />
      </ToastProvider>,
    );

    fireEvent.click(screen.getByText('Trigger Success'));
    expect(screen.getByText('Operasi Berhasil')).toBeDefined();
    expect(screen.getByText('Data produk telah disimpan.')).toBeDefined();

    fireEvent.click(screen.getByText('Trigger Error'));
    expect(screen.getByText('Operasi Gagal')).toBeDefined();
    expect(screen.getByText('Koneksi database bermasalah.')).toBeDefined();

    fireEvent.click(screen.getByText('Trigger Warning'));
    expect(screen.getByText('Peringatan Stok')).toBeDefined();

    fireEvent.click(screen.getByText('Trigger Info'));
    expect(screen.getByText('Informasi Sistem')).toBeDefined();
  });

  it('dismisses toast when close button is clicked', () => {
    render(
      <ToastProvider>
        <TestConsumer />
      </ToastProvider>,
    );

    fireEvent.click(screen.getByText('Trigger Success'));
    expect(screen.getByText('Operasi Berhasil')).toBeDefined();

    const closeBtn = screen.getByLabelText('Tutup notifikasi');
    fireEvent.click(closeBtn);

    expect(screen.queryByText('Operasi Berhasil')).toBeNull();
  });

  it('automatically dismisses toast after designated duration', () => {
    render(
      <ToastProvider>
        <TestConsumer />
      </ToastProvider>,
    );

    fireEvent.click(screen.getByText('Trigger Auto Dismiss'));
    expect(screen.getByText('Auto Dismiss Toast')).toBeDefined();

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(screen.queryByText('Auto Dismiss Toast')).toBeNull();
  });
});
