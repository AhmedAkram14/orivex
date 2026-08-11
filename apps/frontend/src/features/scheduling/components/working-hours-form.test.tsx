import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '@/shared/test/render-with-providers';
import { server } from '@/mocks/server';
import { getDoctorAvailability, resetSchedulingStore } from '@/mocks/scheduling-store';

import { WorkingHoursForm } from './working-hours-form';

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  resetSchedulingStore();
});
afterAll(() => server.close());

/**
 * Consultation Pricing Redesign: the working-hours template's own default
 * pricing (Free/Paid + fee/currency), the source every generated
 * `AvailabilityWindow` inherits from unless individually overridden.
 */
describe('WorkingHoursForm — default pricing', () => {
  it("shows Monday's seeded default as Paid with its fee, and Free has no fee inputs", async () => {
    const schedule = getDoctorAvailability();
    renderWithProviders(<WorkingHoursForm schedule={schedule} onSaved={() => {}} />);

    // The seeded demo doctor's working days default to Paid 500 EGP.
    const feeInputs = screen.getAllByLabelText(/consultation fee/i);
    expect(feeInputs.length).toBeGreaterThan(0);
    expect((feeInputs[0] as HTMLInputElement).value).toBe('500');
  });

  it('switching a day to Free hides its fee/currency inputs, and saving persists the change', async () => {
    const schedule = getDoctorAvailability();
    const onSaved = () => {};
    renderWithProviders(<WorkingHoursForm schedule={schedule} onSaved={onSaved} />);

    const freeTabs = screen.getAllByRole('tab', { name: 'Free' });
    await userEvent.click(freeTabs[0]);

    await userEvent.click(screen.getByRole('button', { name: 'Save' }));

    const updated = await vi.waitFor(() => {
      const day = getDoctorAvailability().find((entry) => entry.isWorkingDay);
      if (!day || day.pricing.pricingType !== 'free') throw new Error('not yet saved');
      return day;
    });
    expect(updated.pricing.feeAmount).toBeNull();
  });

  it('requires a fee amount when a day is set to Paid with no amount entered', async () => {
    const schedule = getDoctorAvailability().map((day) => ({
      ...day,
      pricing: { pricingType: 'paid' as const, feeAmount: null, feeCurrency: 'EGP' },
    }));
    renderWithProviders(<WorkingHoursForm schedule={schedule} onSaved={() => {}} />);

    await userEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findAllByText('Enter a fee amount for a paid consultation.')).not.toHaveLength(0);
  });
});
