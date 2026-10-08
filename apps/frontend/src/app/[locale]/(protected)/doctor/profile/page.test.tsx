import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
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
    // Regression: the edit form's bio field used to also be labeled
    // "Professional information" -- the same label the read view uses for
    // its specialty/fee/license card, a different thing this field doesn't
    // edit. The bio field is "About" now, matching the view's own "About"
    // section it actually edits.
    expect(screen.getByLabelText('About')).toBeInTheDocument();
    expect(screen.queryByLabelText('Professional information')).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(await screen.findByText('Professional information')).toBeInTheDocument();
    expect(screen.queryByLabelText('About')).not.toBeInTheDocument();
  });

  it('previews the profile as a patient would see it, then returns to the normal workspace view on exit', async () => {
    renderPage();
    await screen.findAllByText('Dr. Sarah Ahmed');

    await userEvent.click(screen.getByRole('button', { name: 'Preview as Patient' }));

    expect(screen.getByText("Previewing as a patient would see your profile.")).toBeInTheDocument();
    // The public variant never shows workspace-only affordances.
    expect(screen.queryByRole('button', { name: /Edit profile/ })).not.toBeInTheDocument();
    expect(screen.queryByText('Quick Actions')).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Exit preview' }));

    expect(screen.queryByText("Previewing as a patient would see your profile.")).not.toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /Edit profile/ }).length).toBeGreaterThan(0);
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

    // The seeded work-experience entries (doctor-store.ts) are listed with Edit / Remove (edited in a dialog, the
    // same editor the doctor application uses).
    expect(screen.getByRole('button', { name: 'Edit Cairo University Hospitals' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Edit Ain Shams University Hospital' })).toBeInTheDocument();

    // Publications/Awards are now editable here too -- the read view's "Add
    // Publication"/"Add Award" empty-state actions open this same edit mode.
    expect(screen.getByDisplayValue('Preventive Cardiology in Primary Care')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Excellence in Patient Care')).toBeInTheDocument();
  });

  it('hydrates the language checkboxes from the real profile (regression: a stale full-word DB value like "Arabic"/"English" instead of "ar"/"en" left every checkbox unchecked, and saving then silently wiped the field)', async () => {
    renderPage();
    await screen.findAllByText('Dr. Sarah Ahmed');

    await userEvent.click(screen.getAllByRole('button', { name: /Edit profile/ })[0]);

    // The seeded mock doctor's languages are the real ['en', 'ar'] codes
    // (doctor-store.ts) -- both checkboxes must reflect that on mount, not
    // render unchecked despite the profile genuinely having both set.
    expect(screen.getByRole('checkbox', { name: 'Arabic' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'English' })).toBeChecked();
  });

  it('unchecking "I currently work here" stays unchecked and reveals a real end-date input (regression: falsy-string bug)', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findAllByText('Dr. Sarah Ahmed');

    await userEvent.click(screen.getAllByRole('button', { name: /Edit profile/ })[0]);

    // The seeded ongoing entry ("Cairo University Hospitals", no endDate) opens with "I currently work here"
    // checked; unchecking it must stay unchecked and reveal the end date.
    await user.click(screen.getByRole('button', { name: 'Edit Cairo University Hospitals' }));
    const dialog = await screen.findByRole('dialog');
    const current = within(dialog).getByRole('checkbox', { name: 'I currently work here' });
    expect(current).toHaveAttribute('data-state', 'checked');
    expect(within(dialog).queryByRole('group', { name: 'End date' })).not.toBeInTheDocument();

    await user.click(current);

    expect(current).toHaveAttribute('data-state', 'unchecked');
    expect(within(dialog).getByRole('group', { name: 'End date' })).toBeInTheDocument();
  });

  it('edit mode now lets a doctor change their consultation fee, hospital, and insurance providers -- previously view-only fields with no way to edit them from this page', async () => {
    renderPage();
    await screen.findAllByText('Dr. Sarah Ahmed');

    await userEvent.click(screen.getAllByRole('button', { name: /Edit profile/ })[0]);

    expect(screen.getByLabelText('Consultation fee')).toBeInTheDocument();
    expect(screen.getByLabelText('Hospital')).toBeInTheDocument();
    expect(screen.getByText('Insurance providers')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('e.g. Misr Insurance')).toBeInTheDocument();
  });

  it('disables Save until a real edit is made', async () => {
    renderPage();
    await screen.findAllByText('Dr. Sarah Ahmed');

    await userEvent.click(screen.getAllByRole('button', { name: /Edit profile/ })[0]);

    const saveButton = screen.getByRole('button', { name: 'Save' });
    expect(saveButton).toBeDisabled();

    await userEvent.type(screen.getByLabelText('About'), ' Updated.');

    expect(saveButton).toBeEnabled();
  });

  it('asks for confirmation (ConfirmDialog) before removing a work-experience entry, and does nothing if the doctor cancels', async () => {
    renderPage();
    await screen.findAllByText('Dr. Sarah Ahmed');
    await userEvent.click(screen.getAllByRole('button', { name: /Edit profile/ })[0]);

    await userEvent.click(screen.getByRole('button', { name: 'Remove Cairo University Hospitals' }));

    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveTextContent('Remove this experience?');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));

    expect(screen.getByRole('button', { name: 'Edit Cairo University Hospitals' })).toBeInTheDocument();
  });
});
