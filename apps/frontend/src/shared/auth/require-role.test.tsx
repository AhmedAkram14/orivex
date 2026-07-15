import { render, screen, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import enMessages from '../../../messages/en.json';
import { AuthContext } from './auth-context';
import { RequireRole } from './require-role';
import type { AuthState } from './types';

const replace = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace, refresh: vi.fn(), back: vi.fn(), forward: vi.fn() }),
  usePathname: () => '/doctor',
  useParams: () => ({ locale: 'en' }),
  useSearchParams: () => new URLSearchParams(),
  redirect: vi.fn(),
  permanentRedirect: vi.fn(),
  RedirectType: { push: 'push', replace: 'replace' },
}));

function renderWithAuth(state: AuthState) {
  return render(
    <NextIntlClientProvider locale="en" messages={enMessages}>
      <AuthContext.Provider value={state}>
        <RequireRole roles={['doctor']} redirectTo="/forbidden">
          <p>Doctor-only content</p>
        </RequireRole>
      </AuthContext.Provider>
    </NextIntlClientProvider>,
  );
}

const doctorState: AuthState = {
  status: 'authenticated',
  user: { id: '1', email: 'doctor@orivex.dev', fullName: 'Dr. Sarah Ahmed', roles: ['doctor'] },
};

const patientState: AuthState = {
  status: 'authenticated',
  user: { id: '2', email: 'patient@orivex.dev', fullName: 'Jane Patient', roles: ['patient'] },
};

describe('RequireRole', () => {
  beforeEach(() => replace.mockClear());

  it('renders children when the user has one of the listed roles', async () => {
    renderWithAuth(doctorState);
    expect(await screen.findByText('Doctor-only content')).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });

  it('redirects and does not render children when the user lacks every listed role', async () => {
    renderWithAuth(patientState);
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/en/forbidden'));
    expect(screen.queryByText('Doctor-only content')).not.toBeInTheDocument();
  });
});
