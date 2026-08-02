import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CircularProgress } from './circular-progress';

describe('CircularProgress', () => {
  it('renders an honest 0% ring instead of NaN when max is 0', () => {
    render(<CircularProgress value={0} max={0} label="0 of 0 done" />);
    expect(screen.getByRole('img', { name: '0 of 0 done' })).toBeInTheDocument();
    expect(screen.getByText('0%')).toBeInTheDocument();
    expect(screen.getByText('0 of 0 done')).toBeInTheDocument();
  });

  it('renders the real percentage for a genuine ratio', () => {
    render(<CircularProgress value={3} max={4} />);
    expect(screen.getByRole('img', { name: '75%' })).toBeInTheDocument();
    expect(screen.getByText('75%')).toBeInTheDocument();
  });

  it('clamps a value above max instead of overflowing past 100%', () => {
    render(<CircularProgress value={9} max={4} />);
    expect(screen.getByRole('img', { name: '100%' })).toBeInTheDocument();
  });
});
