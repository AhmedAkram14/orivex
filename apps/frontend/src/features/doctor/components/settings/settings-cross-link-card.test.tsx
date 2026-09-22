import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { renderWithProviders } from '@/shared/test/render-with-providers';

import { SettingsCrossLinkCard } from './settings-cross-link-card';

describe('SettingsCrossLinkCard', () => {
  it('renders the title, description, and a link with the correct href/label', () => {
    renderWithProviders(
      <SettingsCrossLinkCard
        title="Availability"
        description="Weekly working hours live on the Schedule page."
        href="/doctor/schedule"
        linkLabel="Go to Schedule"
      />,
    );

    expect(screen.getByText('Availability')).toBeInTheDocument();
    expect(screen.getByText('Weekly working hours live on the Schedule page.')).toBeInTheDocument();
    const link = screen.getByRole('link', { name: /Go to Schedule/ });
    expect(link).toHaveAttribute('href', '/en/doctor/schedule');
  });

  it('is reusable for a second, differently-targeted instance', () => {
    renderWithProviders(
      <SettingsCrossLinkCard
        title="Sessions"
        description="Review active sessions and sign out everywhere."
        href="/security"
        linkLabel="Go to Security"
      />,
    );

    expect(screen.getByText('Sessions')).toBeInTheDocument();
    const link = screen.getByRole('link', { name: /Go to Security/ });
    expect(link).toHaveAttribute('href', '/en/security');
  });
});
