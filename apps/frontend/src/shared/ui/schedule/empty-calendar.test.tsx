import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderWithProviders } from '@/shared/test/render-with-providers';
import { EmptyCalendar } from './empty-calendar';

describe('EmptyCalendar', () => {
  it('renders the title and description', () => {
    renderWithProviders(
      <EmptyCalendar title="No availability configured" description="Set your working hours to get started." />,
    );

    expect(screen.getByText('No availability configured')).toBeInTheDocument();
    expect(screen.getByText('Set your working hours to get started.')).toBeInTheDocument();
  });
});
