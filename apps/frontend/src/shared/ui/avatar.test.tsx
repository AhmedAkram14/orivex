import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PersonAvatar, initialsOf } from './avatar';

describe('PersonAvatar', () => {
  it('marks itself with its scale size and stays decorative (the name is always beside it)', () => {
    const { container } = render(<PersonAvatar name="Sarah Ahmed" size="lg" />);
    const root = container.querySelector('[data-slot="avatar"]');
    expect(root).toHaveAttribute('data-size', 'lg');
    expect(root).toHaveAttribute('aria-hidden', 'true');
    expect(root).toHaveClass('size-14');
  });

  it('shows initials on a name-derived tint when there is no photo, sized to 40% of the circle', () => {
    const { container } = render(<PersonAvatar name="Dr. Sarah Ahmed" size="md" />);
    expect(container.textContent).toBe('SA');
    // md is 40px, so its initials are 16px (1rem).
    expect(container.querySelector('[data-slot="avatar"]')).toHaveClass('text-[1rem]');
  });

  it('skips a doctor title when taking initials', () => {
    expect(initialsOf('Dr. Sarah Ahmed')).toBe('SA');
    expect(initialsOf('د. سارة أحمد')).toBe('سأ');
  });
});
