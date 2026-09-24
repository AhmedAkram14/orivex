import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { WidgetContainer } from '@/shared/ui/layout/widget-container';

describe('WidgetContainer scroll region', () => {
  it('makes a scrolling content slot keyboard-focusable and labelled by the widget title', () => {
    render(
      <WidgetContainer title="Recent activity" contentClassName="overflow-y-auto">
        <p>content</p>
      </WidgetContainer>,
    );
    const region = screen.getByRole('region', { name: 'Recent activity' });
    expect(region).toHaveAttribute('tabindex', '0');
  });

  it('adds no tab stop when the content slot does not scroll', () => {
    render(
      <WidgetContainer title="Static">
        <p>content</p>
      </WidgetContainer>,
    );
    expect(screen.queryByRole('region')).not.toBeInTheDocument();
  });
});
