import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { describe, expect, it, vi } from 'vitest';
import { SidebarNav } from '@/features/shell/components/sidebar-nav';
import { AuthContext } from '@/shared/auth/auth-context';
import type { AuthState } from '@/shared/auth/types';
import enMessages from '../../../../messages/en.json';

let mockPathname = '/dashboard';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn(), back: vi.fn(), forward: vi.fn() }),
  usePathname: () => mockPathname,
  useParams: () => ({ locale: 'en' }),
  useSearchParams: () => new URLSearchParams(),
  redirect: vi.fn(),
  permanentRedirect: vi.fn(),
  RedirectType: { push: 'push', replace: 'replace' },
}));

function renderSidebar(state: AuthState) {
  return render(
    <NextIntlClientProvider locale="en" messages={enMessages}>
      <AuthContext.Provider value={state}>
        <SidebarNav />
      </AuthContext.Provider>
    </NextIntlClientProvider>,
  );
}

const patientState: AuthState = {
  status: 'authenticated',
  user: { id: '1', email: 'patient@orivex.dev', fullName: 'Jane Patient', roles: ['patient'] },
};

const superAdminState: AuthState = {
  status: 'authenticated',
  user: { id: '2', email: 'admin@orivex.dev', fullName: 'Ada Admin', roles: ['super_admin'] },
};

describe('SidebarNav', () => {
  it('always shows Dashboard and Security, the two unrestricted destinations', () => {
    renderSidebar(patientState);
    expect(screen.getByRole('link', { name: 'Dashboard' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Security' })).toBeInTheDocument();
  });

  it('hides the feature-flag-gated Clinical/Administration groups for every role, since their flags default off', () => {
    renderSidebar(superAdminState);
    expect(screen.queryByRole('button', { name: 'Clinical' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Administration' })).not.toBeInTheDocument();
  });

  it('marks the item matching the current route as active', () => {
    mockPathname = '/dashboard';
    renderSidebar(patientState);
    expect(screen.getByRole('link', { name: 'Dashboard' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Security' })).not.toHaveAttribute('aria-current');
  });
});
