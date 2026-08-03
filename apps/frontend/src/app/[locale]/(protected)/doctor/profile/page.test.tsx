import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import DoctorProfilePage from './page';
import { server } from '@/mocks/server';
import { AuthContext } from '@/shared/auth/auth-context';
import type { AuthState } from '@/shared/auth/types';
import enMessages from '../../../../../../messages/en.json';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn(), back: vi.fn(), forward: vi.fn() }),
  usePathname: () => '/doctor/profile',
  useParams: () => ({ locale: 'en' }),
  useSearchParams: () => new URLSearchParams(),
  redirect: vi.fn(),
  permanentRedirect: vi.fn(),
  RedirectType: { push: 'push', replace: 'replace' },
}));

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

const doctorState: AuthState = {
  status: 'authenticated',
  user: { id: '1', email: 'doctor@orivex.dev', fullName: 'Dr. Sarah Ahmed', roles: ['doctor'] },
};

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <NextIntlClientProvider locale="en" messages={enMessages} timeZone="Africa/Cairo">
        <AuthContext.Provider value={doctorState}>
          <DoctorProfilePage />
        </AuthContext.Provider>
      </NextIntlClientProvider>
    </QueryClientProvider>,
  );
}

describe('DoctorProfilePage', () => {
  it('shows the profile in view mode with every required section', async () => {
    renderPage();

    // The redesigned hero and the sidebar's Doctor Summary card both render
    // the doctor's real name, so this asserts at least one instance rather
    // than a single unique match.
    expect((await screen.findAllByText('Dr. Sarah Ahmed')).length).toBeGreaterThan(0);
    expect(screen.getByText('Professional information')).toBeInTheDocument();
    expect(screen.getByText('Publications')).toBeInTheDocument();
    expect(screen.getByText('Awards')).toBeInTheDocument();
    expect(screen.getByText('Contact information')).toBeInTheDocument();
  });

  it('toggles to edit mode and back to view mode on cancel', async () => {
    renderPage();
    await screen.findAllByText('Dr. Sarah Ahmed');

    // The redesigned view's Edit affordance now lives in the hero and the
    // sidebar's Quick Actions card rather than the page header -- either one
    // opens the same edit mode, so this clicks the first match.
    await userEvent.click(screen.getAllByRole('button', { name: /Edit profile/ })[0]);
    expect(screen.getByLabelText('Professional information')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(await screen.findByText('Professional information')).toBeInTheDocument();
    expect(screen.queryByLabelText('Professional information')).not.toBeInTheDocument();
  });

  it('edit mode renders a real "Experience" label (not a raw translation key) and the seeded work-experience entries', async () => {
    renderPage();
    await screen.findAllByText('Dr. Sarah Ahmed');

    await userEvent.click(screen.getAllByRole('button', { name: /Edit profile/ })[0]);

    // Regression: the edit form used to call t('experience'), a key that no
    // longer exists under doctor.profile (renamed to yearsOfExperienceLabel
    // by the profile redesign), rendering the literal key string instead of
    // real text.
    expect(screen.getByText('Experience')).toBeInTheDocument();
    expect(screen.queryByText('doctor.profile.experience')).not.toBeInTheDocument();

    // The seeded work-experience entries (doctor-store.ts) are now editable
    // here too, not just at onboarding. "Cairo University Hospitals" matches
    // twice -- it's also the seeded award's issuingBody, now editable below.
    expect(screen.getAllByDisplayValue('Cairo University Hospitals').length).toBeGreaterThan(0);
    expect(screen.getByDisplayValue('Ain Shams University Hospital')).toBeInTheDocument();

    // Publications/Awards are now editable here too -- the read view's "Add
    // Publication"/"Add Award" empty-state actions open this same edit mode.
    expect(screen.getByDisplayValue('Preventive Cardiology in Primary Care')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Excellence in Patient Care')).toBeInTheDocument();
  });

  it('unchecking "I currently work here" stays unchecked and reveals a real end-date input (regression: falsy-string bug)', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findAllByText('Dr. Sarah Ahmed');

    await userEvent.click(screen.getAllByRole('button', { name: /Edit profile/ })[0]);

    // The seeded ongoing entry ("Cairo University Hospitals", no endDate)
    // starts checked; unchecking it must NOT immediately flip back to
    // checked (the bug: setting endDate to '' as a placeholder made
    // `!endDate` falsely true again since '' is falsy in JS).
    const checkboxes = screen.getAllByRole('checkbox', { name: 'I currently work here' });
    const firstCheckbox = checkboxes[0];
    expect(firstCheckbox).toHaveAttribute('data-state', 'checked');

    await user.click(firstCheckbox);

    expect(firstCheckbox).toHaveAttribute('data-state', 'unchecked');
    expect(screen.getAllByLabelText('End date').length).toBeGreaterThan(0);
  });
});
