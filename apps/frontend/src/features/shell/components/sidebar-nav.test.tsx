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
  it('always shows Security, the one unrestricted destination outside a workspace group', () => {
    renderSidebar(patientState);
    expect(screen.getByRole('link', { name: 'Security' })).toBeInTheDocument();
  });

  it('never shows a top-level Dashboard item -- each workspace group\'s own Overview is the one real home link, no duplicate destination', () => {
    renderSidebar(patientState);
    expect(screen.queryByRole('link', { name: 'Dashboard' })).not.toBeInTheDocument();
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
    mockPathname = '/security';
    renderSidebar(patientState);
    expect(screen.getByRole('link', { name: 'Security' })).toHaveAttribute('aria-current', 'page');
  });

  it('marks only the specific matching item active, never the workspace root too, on a nested route', () => {
    mockPathname = '/patient/doctors';
    renderSidebar(patientState);
    expect(screen.getByRole('link', { name: 'Browse Doctors' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Overview' })).not.toHaveAttribute('aria-current');
  });

  it('marks the workspace root Overview active when genuinely on that exact route', () => {
    mockPathname = '/patient';
    renderSidebar(patientState);
    expect(screen.getByRole('link', { name: 'Overview' })).toHaveAttribute('aria-current', 'page');
  });

  it('shows the new Patients/Reports/Settings doctor-workspace links for a doctor', () => {
    renderSidebar(doctorState);
    expect(screen.getByRole('link', { name: 'Patients' })).toHaveAttribute('href', expect.stringContaining('/doctor/patients'));
    expect(screen.getByRole('link', { name: 'Reports' })).toHaveAttribute('href', expect.stringContaining('/doctor/reports'));
    expect(screen.getByRole('link', { name: 'Settings' })).toHaveAttribute('href', expect.stringContaining('/doctor/settings'));
  });
});
