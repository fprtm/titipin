import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import HomePage from './page';

describe('HomePage', () => {
  it('renders Titipin POS brand title and professional system capabilities', () => {
    render(<HomePage />);
    expect(screen.getByText('Titipin')).toBeDefined();
    expect(screen.getByText('Terminal Kasir POS')).toBeDefined();
    expect(screen.getByText('Dashboard Eksekutif')).toBeDefined();
    expect(screen.getByText('Zero-Overselling')).toBeDefined();
    expect(screen.getByText('287 Tests')).toBeDefined();
  });
});
