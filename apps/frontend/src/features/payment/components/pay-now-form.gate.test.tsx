import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '@/shared/test/render-with-providers';
import { server } from '@/mocks/server';
import { setPatientVerified } from '@/mocks/patient-store';

// A real Stripe Elements mount (network handshake, real DOM iframe) can't
// run in jsdom -- `pay-now-form.test.tsx` only covers the "not configured"
// state for that reason. This file needs to reach the code *past* that
// state (the identity-verification gate, checked on `initiateCharge.error`),
// so it stubs the Stripe SDK itself, mirroring `call-room.test.tsx`'s own
// precedent of mocking a third-party SDK's React bindings rather than
// running them for real.
vi.mock('@stripe/stripe-js', () => ({ loadStripe: () => Promise.resolve({}) }));
vi.mock('@stripe/react-stripe-js', () => ({
  Elements: ({ children }: { children: React.ReactNode }) => children,
  useStripe: () => ({
    createPaymentMethod: () => Promise.resolve({ paymentMethod: { id: 'pm_mock' }, error: undefined }),
  }),
  useElements: () => ({ getElement: () => ({}) }),
  CardElement: () => <div data-testid="card-element" />,
}));

// `shared/lib/env.ts` caches its parsed env at module scope on first
// property access, and `mocks/handlers.ts` reads `env.apiBaseUrl` eagerly at
// import time (before this file's own code runs, per ES module import
// hoisting) -- so setting `process.env` here would already be too late.
// Mocking the module directly is the only way to force
// `stripePublishableKey` truthy for this file.
vi.mock('@/shared/lib/env', () => ({
  env: {
    apiBaseUrl: 'http://localhost:4000',
    appUrl: 'http://localhost:3000',
    enableApiMocks: false,
    stripePublishableKey: 'pk_test_mock',
  },
}));

const { PayNowForm } = await import('./pay-now-form');

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('PayNowForm (identity-verification gate)', () => {
  // Onboarding Redesign (2026-07-21 proposal, Stage O.4/O.7): the real
  // security boundary (RequiresIdentityVerificationGuard on POST /payments).
  it('shows the identity-verification gate instead of a generic charge failure when payment is blocked', async () => {
    setPatientVerified(false);

    renderWithProviders(
      <PayNowForm consultationSessionId="11111111-1111-4111-8111-111111111111" amount={{ amount: 500, currency: 'EGP' }} />,
    );

    await userEvent.click(await screen.findByRole('button', { name: 'Pay now' }));

    expect(await screen.findByText('Verify your identity to make a payment')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Start verification' })).toBeInTheDocument();
  });

  it('charges normally once the patient is already verified', async () => {
    setPatientVerified(true);

    renderWithProviders(
      <PayNowForm consultationSessionId="22222222-2222-4222-8222-222222222222" amount={{ amount: 500, currency: 'EGP' }} />,
    );

    await userEvent.click(await screen.findByRole('button', { name: 'Pay now' }));

    expect(screen.queryByText('Verify your identity to make a payment')).not.toBeInTheDocument();
  });
});
