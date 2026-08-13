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

const doctorState: AuthState = {
  status: 'authenticated',
  user: { id: '3', email: 'doctor@orivex.dev', fullName: 'Dr. Sarah Ahmed', roles: ['doctor'] },
};

describe('SidebarNav', () => {
  it('always shows Dashboard and Security, the two unrestricted destinations', () => {
    renderSidebar(patientState);
    expect(screen.getByRole('link', { name: 'Dashboard' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Security' })).toBeInTheDocument();
  });

  it('hides the still-feature-flag-gated Clinical group for every role, since its flags default off', () => {
    renderSidebar(superAdminState);
    expect(screen.queryByText('Clinical')).not.toBeInTheDocument();
  });

  it('shows the Administration group for a super_admin now that nav.adminUsers (Stage 4) defaults on', () => {
    renderSidebar(superAdminState);
    expect(screen.getByText('Administration')).toBeInTheDocument();
  });

  it('shows the new Admin Workspace group for a super_admin', () => {
    renderSidebar(superAdminState);
    expect(screen.getByText('Admin Workspace')).toBeInTheDocument();
  });

  it('hides the Admin Workspace group for a patient', () => {
    renderSidebar(patientState);
    expect(screen.queryByText('Admin Workspace')).not.toBeInTheDocument();
  });

  it('marks the item matching the current route as active', () => {
    mockPathname = '/dashboard';
    renderSidebar(patientState);
    expect(screen.getByRole('link', { name: 'Dashboard' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Security' })).not.toHaveAttribute('aria-current');
  });

  it('renders Dashboard as a real, clickable link for a doctor too -- /dashboard redirects to their real Overview', () => {
    renderSidebar(doctorState);
    expect(screen.getByRole('link', { name: 'Dashboard' })).toHaveAttribute('href', '/en/dashboard');
    expect(screen.getByText('Dashboard').closest('[aria-disabled="true"]')).not.toBeInTheDocument();
    // Overview (the doctor's own real dashboard) is still a normal, real link.
    expect(screen.getByRole('link', { name: 'Overview' })).toBeInTheDocument();
  });

  it('shows the new Patients/Reports/Settings doctor-workspace links for a doctor', () => {
    renderSidebar(doctorState);
    expect(screen.getByRole('link', { name: 'Patients' })).toHaveAttribute('href', expect.stringContaining('/doctor/patients'));
    expect(screen.getByRole('link', { name: 'Reports' })).toHaveAttribute('href', expect.stringContaining('/doctor/reports'));
    expect(screen.getByRole('link', { name: 'Settings' })).toHaveAttribute('href', expect.stringContaining('/doctor/settings'));
  });
});
