import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderWithProviders } from '@/shared/test/render-with-providers';

import { PayNowForm } from './pay-now-form';

describe('PayNowForm', () => {
  it('shows an honest "not configured" state instead of a broken card field when no Stripe key is set', () => {
    // vitest.setup.ts never sets NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY, mirroring
    // the backend's own not-configured-adapter idiom on the frontend.
    renderWithProviders(
      <PayNowForm consultationSessionId="11111111-1111-4111-8111-111111111111" amount={{ amount: 500, currency: 'EGP' }} />,
    );

    expect(screen.getByText('Payments are not available yet.')).toBeInTheDocument();
  });
});
