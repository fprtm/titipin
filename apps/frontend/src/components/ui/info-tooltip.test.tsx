import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { InfoTooltip } from './info-tooltip';

describe('InfoTooltip Component', () => {
  it('renders trigger button and reveals tooltip content on hover/click', () => {
    render(
      <InfoTooltip
        title="Total Omset Penjualan"
        source="Tabel orders.total_amount"
        formula="SUM(total_amount)"
        description="Akumulasi pendapatan bersih dari transaksi yang berhasil diselesaikan."
      />,
    );

    const trigger = screen.getByRole('button', {
      name: /Informasi dan metodologi kalkulasi untuk Total Omset Penjualan/i,
    });
    expect(trigger).toBeDefined();

    // Before click, tooltip is not in DOM
    expect(screen.queryByRole('tooltip')).toBeNull();

    // Click trigger to open tooltip
    fireEvent.click(trigger);
    expect(screen.getByRole('tooltip')).toBeDefined();
    expect(screen.getByText('Total Omset Penjualan')).toBeDefined();
    expect(screen.getByText('Tabel orders.total_amount')).toBeDefined();
    expect(screen.getByText('SUM(total_amount)')).toBeDefined();
    expect(
      screen.getByText(/Akumulasi pendapatan bersih dari transaksi yang berhasil diselesaikan/i),
    ).toBeDefined();

    // Click trigger again to close
    fireEvent.click(trigger);
    expect(screen.queryByRole('tooltip')).toBeNull();
  });
});
