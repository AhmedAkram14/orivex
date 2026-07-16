import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { LoadingCalendar } from './loading-calendar';

describe('LoadingCalendar', () => {
  it('marks itself busy for assistive tech', () => {
    const { container } = render(<LoadingCalendar />);
    expect(container.firstChild).toHaveAttribute('aria-busy', 'true');
  });
});
