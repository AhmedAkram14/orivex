import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import { describe, expect, it, vi } from 'vitest';
import DoctorConsultationPage from './page';
import { AuthContext } from '@/shared/auth/auth-context';
import type { AuthState } from '@/shared/auth/types';
import enMessages from '../../../../../../messages/en.json';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn(), back: vi.fn(), forward: vi.fn() }),
  usePathname: () => '/doctor/consultation',
  useParams: () => ({ locale: 'en' }),
  useSearchParams: () => new URLSearchParams(),
  redirect: vi.fn(),
  permanentRedirect: vi.fn(),
  RedirectType: { push: 'push', replace: 'replace' },
}));

const doctorState: AuthState = {
  status: 'authenticated',
  user: { id: '1', email: 'doctor@orivex.dev', fullName: 'Dr. Sarah Ahmed', roles: ['doctor'] },
};

function renderPage() {
  return render(
    <NextIntlClientProvider locale="en" messages={enMessages} timeZone="Africa/Cairo">
      <AuthContext.Provider value={doctorState}>
        <DoctorConsultationPage />
      </AuthContext.Provider>
    </NextIntlClientProvider>,
  );
}

describe('DoctorConsultationPage', () => {
  // False-readiness fix (ORIVEX Remaining Work Audit, P0 C6): this page
  // used to render a "Module ready" badge that contradicted its own
  // honest placeholder content below it.
  it('never claims to be ready -- the real clinical tooling lives in the queue-launched workspace, not here', async () => {
    renderPage();
    await screen.findAllByText('Overview');

    expect(screen.queryByText('Module ready')).not.toBeInTheDocument();
  });

  it('shows the Overview section as a placeholder by default', async () => {
    renderPage();
    // "Overview" appears twice: once as the active nav button, once as the main-pane placeholder title.
    expect(await screen.findAllByText('Overview')).toHaveLength(2);
  });

  it('switches the main pane placeholder when a different section is selected', async () => {
    renderPage();
    await screen.findAllByText('Overview');

    await userEvent.click(screen.getByRole('button', { name: 'Notes' }));

    // "Notes" now appears twice (nav button + main-pane placeholder title);
    // "Overview" drops back to once, since only its nav button remains.
    expect(screen.getAllByText('Notes')).toHaveLength(2);
    expect(screen.getAllByText('Overview')).toHaveLength(1);
  });
});
