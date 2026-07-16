import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderWithProviders } from '@/shared/test/render-with-providers';
import { CalendarSidebar } from './calendar-sidebar';

describe('CalendarSidebar', () => {
  it('renders the legend and any extra content', () => {
    renderWithProviders(
      <CalendarSidebar legendItems={[{ id: 'available', label: 'Available', colorClassName: 'bg-success' }]}>
        <p>Extra content</p>
      </CalendarSidebar>,
    );

    expect(screen.getByText('Available')).toBeInTheDocument();
    expect(screen.getByText('Extra content')).toBeInTheDocument();
  });
});
