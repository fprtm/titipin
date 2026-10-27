import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import HomePage from './page';

describe('HomePage', () => {
  it('renders Titipin POS brand title and foundation details', () => {
    render(<HomePage />);
    expect(screen.getByText('Titipin POS')).toBeDefined();
    expect(screen.getByText('Slice 0 — Monorepo Baseline & Audit Infrastructure')).toBeDefined();
  });
});
