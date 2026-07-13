import { render, screen } from '@testing-library/react';
import { Info } from 'lucide-react';
import { describe, expect, it } from 'vitest';
import { Icon } from './icon';

describe('Icon', () => {
  it('is hidden from assistive tech when no label is given (decorative use)', () => {
    const { container } = render(<Icon icon={Info} />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('aria-hidden', 'true');
  });

  it('exposes an accessible name when a label is given', () => {
    render(<Icon icon={Info} label="Information" />);
    expect(screen.getByRole('img', { name: 'Information' })).toBeInTheDocument();
  });
});
